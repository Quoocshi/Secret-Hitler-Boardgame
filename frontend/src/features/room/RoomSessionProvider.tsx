import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { createRoom, joinRoom } from "@/lib/api/rooms";
import { errorMessage } from "@/lib/api/errors";
import type { Action, SessionIdentity } from "@/lib/game/types";
import { RoomClient, REQUEST_TIMEOUT_MS } from "@/lib/realtime/room-client";
import {
  initialRoomState,
  roomReducer,
  type ClientRoomState,
  type RoomEvent,
} from "@/lib/realtime/room-reducer";
import { acquireRoomLock } from "@/lib/session/tab-lock";
import {
  clearIdentity,
  readIdentity,
  saveIdentity,
  savedNickname,
} from "@/lib/session/storage";
interface SessionContext {
  state: ClientRoomState;
  identity: SessionIdentity | null;
  nickname: string;
  entryCode: string;
  ready: boolean;
  enter: (nickname: string, code?: string) => Promise<void>;
  leave: () => Promise<void>;
  send: (action: Action, payload?: Record<string, unknown>) => void;
  retry: () => Promise<void>;
}
const Context = createContext<SessionContext | null>(null);
export function useRoomSession() {
  const value = useContext(Context);
  if (!value) {
    throw new Error("Thiếu phiên phòng.");
  }
  return value;
}
export function RoomSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [state, reactDispatch] = useReducer(roomReducer, initialRoomState);
  const stateRef = useRef(state);
  const retryInProgress = useRef(false);
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  const [nickname, setNickname] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [ready, setReady] = useState(false);
  const runtime = useRef<{
    client?: RoomClient;
    release?: () => void;
    abort?: AbortController;
    generation: number;
  }>({ generation: 0 });
  const dispatch = useCallback((event: RoomEvent) => {
    stateRef.current = roomReducer(stateRef.current, event);
    reactDispatch(event);
  }, []);
  const boot = useCallback(
    (sessionIdentity: SessionIdentity) => {
      const generation = runtime.current.generation;
      setIdentity(sessionIdentity);
      const client = new RoomClient(
        sessionIdentity,
        generation,
        dispatch,
        () => stateRef.current,
      );
      runtime.current.client = client;
      void client.start();
    },
    [dispatch],
  );
  useEffect(() => {
    let cancelled = false;
    const sessionRuntime = {
      generation: ++runtime.current.generation,
      release: undefined as undefined | (() => void),
      client: undefined as RoomClient | undefined,
    };
    runtime.current = sessionRuntime;
    dispatch({ type: "reset", generation: sessionRuntime.generation });
    void (async () => {
      await Promise.resolve();
      try {
        const name = savedNickname();
        if (cancelled) {
          return;
        }
        setNickname(name);
        const match = window.location.pathname.match(
          /^\/room\/([A-Z0-9]{6})$/i,
        );
        const code =
          match?.[1].toUpperCase() ??
          new URL(window.location.href).searchParams.get("room") ??
          "";
        setEntryCode(code);
        if (match) {
          const savedIdentity = readIdentity();
          if (!savedIdentity || savedIdentity.roomCode !== code) {
            void navigate("/?room=" + encodeURIComponent(code), {
              replace: true,
            });
            return;
          }
          sessionRuntime.release = await acquireRoomLock();
          if (cancelled) {
            sessionRuntime.release();
            return;
          }
          boot(savedIdentity);
          sessionRuntime.client = runtime.current.client;
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: "connection",
            connection: "error",
            notice: errorMessage(error),
            generation: sessionRuntime.generation,
          });
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
      const current = runtime.current;
      // Invalidate async entry/retry work before releasing this provider's resources.
      current.generation++;
      current.abort?.abort();
      void current.client?.stop().finally(() => current.release?.());
      if (!current.client) {
        current.release?.();
      }
    };
  }, [boot, dispatch, navigate]);
  async function enter(name: string, code?: string) {
    if (
      runtime.current.release ||
      stateRef.current.connection === "connecting" ||
      stateRef.current.connection === "restoring"
    ) {
      return;
    }
    const sessionRuntime = runtime.current;
    dispatch({
      type: "connection",
      connection: "restoring",
      generation: sessionRuntime.generation,
    });
    try {
      sessionRuntime.release = await acquireRoomLock();
      sessionRuntime.abort = new AbortController();
      const token = crypto.randomUUID();
      const entryGeneration = sessionRuntime.generation;
      const entrySignal = AbortSignal.any([
        sessionRuntime.abort.signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]);
      const response = code
        ? await joinRoom(code, name, token, entrySignal)
        : await createRoom(name, token, entrySignal);
      if (
        runtime.current !== sessionRuntime ||
        sessionRuntime.generation !== entryGeneration ||
        sessionRuntime.abort.signal.aborted
      ) {
        return;
      }
      const newIdentity: SessionIdentity = {
        schemaVersion: 1,
        sessionToken: token,
        roomCode: response.roomCode,
        nickname: name,
      };
      saveIdentity(newIdentity);
      setNickname(name);
      boot(newIdentity);
      void navigate("/room/" + newIdentity.roomCode);
    } catch (error) {
      sessionRuntime.release?.();
      sessionRuntime.release = undefined;
      dispatch({
        type: "connection",
        connection: "error",
        notice: errorMessage(error),
        generation: sessionRuntime.generation,
      });
    }
  }
  async function leave() {
    if (!runtime.current.release && !identity) {
      void navigate("/", { replace: true });
      return;
    }
    const sessionRuntime = runtime.current;
    dispatch({
      type: "connection",
      connection: "leaving",
      generation: sessionRuntime.generation,
    });
    sessionRuntime.abort?.abort();
    await sessionRuntime.client?.stop();
    sessionRuntime.release?.();
    runtime.current = { generation: sessionRuntime.generation + 1 };
    dispatch({ type: "reset", generation: sessionRuntime.generation + 1 });
    setIdentity(null);
    setEntryCode("");
    try {
      clearIdentity();
    } catch (error) {
      dispatch({
        type: "connection",
        connection: "error",
        notice: errorMessage(error),
        generation: sessionRuntime.generation + 1,
      });
    }
    void navigate("/", { replace: true });
  }

  async function retry() {
    if (!identity || retryInProgress.current || !runtime.current.release) {
      return;
    }
    const sessionRuntime = runtime.current;
    const generation = sessionRuntime.generation;
    retryInProgress.current = true;
    try {
      await sessionRuntime.client?.stop();
      // A leave/unmount can finish while transport shutdown is still awaiting completion.
      if (
        runtime.current !== sessionRuntime ||
        sessionRuntime.generation !== generation ||
        stateRef.current.connection === "leaving"
      ) {
        return;
      }
      sessionRuntime.generation++;
      dispatch({ type: "reset", generation: sessionRuntime.generation });
      boot(identity);
    } finally {
      retryInProgress.current = false;
    }
  }
  function send(action: Action, payload: Record<string, unknown> = {}) {
    try {
      runtime.current.client?.send(action, payload);
    } catch (error) {
      dispatch({
        type: "notice",
        notice: errorMessage(error),
        generation: runtime.current.generation,
      });
    }
  }
  return (
    <Context.Provider
      value={{
        state,
        identity,
        nickname,
        entryCode,
        ready,
        enter,
        leave,
        send,
        retry,
      }}
    >
      {children}
    </Context.Provider>
  );
}
