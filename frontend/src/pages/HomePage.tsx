import { Link } from "react-router";
import { RoomEntryForm } from "@/features/room/RoomEntryForm";
import { useRoomSession } from "@/features/room/RoomSessionProvider";
import { LeaveButton } from "@/features/room/LeaveButton";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { gameAssets } from "@/lib/game/presentation";
import { SoundControls } from "@/components/ui/SoundControls";

export function HomePage() {
  const session = useRoomSession();
  let entryContent: React.ReactNode;
  if (!session.ready) {
    entryContent = <p role="status">Đang chuẩn bị bàn chơi…</p>;
  } else if (session.identity) {
    entryContent = (
      <section className="entry-card">
        <h2>Bạn đang giữ một phiên chơi</h2>
        <p>
          Phòng{" "}
          <strong className="selectable-room-code">
            {session.identity.roomCode}
          </strong>
          . Quay lại bàn chơi hoặc xác nhận rời phòng để tạo/vào bàn khác.
        </p>
        <StatusNotice
          message={session.state.notice}
          error={session.state.connection === "error"}
        />
        <div className="entry-session-actions">
          <Link
            className="button primary"
            to={"/room/" + session.identity.roomCode}
          >
            Quay lại phòng
          </Link>
          <LeaveButton
            onLeave={session.leave}
            disabled={session.state.connection === "leaving"}
            localOnly={session.state.connection === "expired"}
          />
        </div>
      </section>
    );
  } else {
    entryContent = (
      <RoomEntryForm
        key={session.entryCode + session.nickname}
        nickname={session.nickname}
        roomCode={session.entryCode}
        busy={["restoring", "connecting", "syncing"].includes(
          session.state.connection,
        )}
        error={session.state.notice}
        onEnter={(name, code) => {
          void session.enter(name, code);
        }}
      />
    );
  }
  return (
    <main className="entry-layout">
      <section className="entry-intro">
        <span className="brand">BÀN CHƠI / SECRET HITLER</span>
        <SoundControls />
        <p className="eyebrow">TIN AI. NGHI AI. BẦU CHỌN.</p>
        <h1>
          Một bàn chơi.
          <br />
          Nhiều bí mật.
        </h1>
        <p className="intro-copy">
          Cùng nhóm bạn tìm ra phe ẩn sau những lá phiếu. Mỗi lựa chọn đều có
          thể đổi hướng ván chơi.
        </p>
        <div className="entry-tracks">
          <span className="liberal">TỰ DO</span>
          <span className="fascist">PHÁT XÍT</span>
        </div>
        <p className="entry-footnote">
          5–10 người · Trình duyệt máy tính · Không cần tài khoản
        </p>
        <a
          className="entry-rules-link"
          href="https://thegioiboardgame.vn/blogs/luat-boardgame/huong-dan-choi-secret-hitler-truy-tim-phat-xit-luat"
          target="_blank"
          rel="noopener noreferrer"
        >
          Hướng dẫn luật chơi <span>(mở tab mới)</span>
        </a>
      </section>
      {entryContent}
      <div className="entry-tabletop" aria-hidden="true">
        <img
          className="entry-tabletop-cards"
          src={gameAssets.tabletop}
          alt=""
          width="440"
          height="440"
          draggable={false}
        />
        <img
          className="entry-tabletop-seal"
          src={gameAssets.seal}
          alt=""
          width="80"
          height="80"
          draggable={false}
        />
      </div>
    </main>
  );
}
