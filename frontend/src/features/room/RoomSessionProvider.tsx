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
import { RoomClient } from "@/lib/realtime/room-client";
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
    (id: SessionIdentity) => {
      const generation = runtime.current.generation;
      setIdentity(id);
      const client = new RoomClient(
        id,
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
    const life = {
      generation: ++runtime.current.generation,
      release: undefined as undefined | (() => void),
      client: undefined as RoomClient | undefined,
    };
    runtime.current = life;
    dispatch({ type: "reset", generation: life.generation });
    void (async () => {
      await Promise.resolve();
      try {
        const name = savedNickname();
        if (cancelled) {
          return;
        }
        setNickname(name);
        const match = window.location.pathname.match(/^\/room\/([A-Z0-9]{6})$/);
        const code =
          match?.[1] ??
          new URL(window.location.href).searchParams.get("room") ??
          "";
        setEntryCode(code);
        if (match) {
          const id = readIdentity();
          if (!id || id.roomCode !== code) {
            void navigate("/?room=" + encodeURIComponent(code), {
              replace: true,
            });
            return;
          }
          life.release = await acquireRoomLock();
          if (cancelled) {
            life.release();
            return;
          }
          boot(id);
          life.client = runtime.current.client;
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({
            type: "connection",
            connection: "error",
            notice: errorMessage(error),
            generation: life.generation,
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
    const life = runtime.current;
    dispatch({
      type: "connection",
      connection: "restoring",
      generation: life.generation,
    });
    try {
      life.release = await acquireRoomLock();
      life.abort = new AbortController();
      const token = crypto.randomUUID();
      const response = code
        ? await joinRoom(code, name, token, life.abort.signal)
        : await createRoom(name, token, life.abort.signal);
      const id: SessionIdentity = {
        schemaVersion: 1,
        sessionToken: token,
        roomCode: response.roomCode,
        nickname: name,
      };
      saveIdentity(id);
      setNickname(name);
      boot(id);
      void navigate("/room/" + id.roomCode);
    } catch (error) {
      life.release?.();
      life.release = undefined;
      dispatch({
        type: "connection",
        connection: "error",
        notice: errorMessage(error),
        generation: life.generation,
      });
    }
  }
  async function leave() {
    const life = runtime.current;
    dispatch({
      type: "connection",
      connection: "leaving",
      generation: life.generation,
    });
    life.abort?.abort();
    await life.client?.stop();
    life.release?.();
    runtime.current = { generation: life.generation + 1 };
    dispatch({ type: "reset", generation: life.generation + 1 });
    setIdentity(null);
    setEntryCode("");
    try {
      clearIdentity();
    } catch (error) {
      dispatch({
        type: "connection",
        connection: "error",
        notice: errorMessage(error),
        generation: life.generation + 1,
      });
    }
    void navigate("/", { replace: true });
  }
  async function retry() {
    if (!identity) {
      return;
    }
    await runtime.current.client?.stop();
    const life = runtime.current;
    life.generation++;
    dispatch({ type: "reset", generation: life.generation });
    boot(identity);
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
