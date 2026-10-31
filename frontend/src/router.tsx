import { createBrowserRouter, Link, Outlet, useParams } from "react-router";
import { HomePage } from "./pages/HomePage";
import { RoomScreen } from "./features/room/RoomScreen";
import { RoomSessionProvider } from "./features/room/RoomSessionProvider";
import { roomCodePattern } from "./lib/game/types";
import { SoundRuntime } from "./lib/audio/SoundRuntime";

function NotFoundPage() {
  return (
    <main className="entry-layout">
      <section className="panel">
        <h1>Không tìm thấy trang</h1>
        <Link to="/">Về trang đầu</Link>
      </section>
    </main>
  );
}

function RoomPage() {
  const roomCode = useParams().roomCode?.toUpperCase() ?? "";
  if (!roomCodePattern.test(roomCode)) {
    return <NotFoundPage />;
  }
  return <RoomScreen roomCode={roomCode} />;
}

// The root provider stays mounted during navigation, keeping one session/socket per tab.
export const router = createBrowserRouter([
  {
    element: (
      <RoomSessionProvider>
        <SoundRuntime />
        <Outlet />
      </RoomSessionProvider>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "room/:roomCode", element: <RoomPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
