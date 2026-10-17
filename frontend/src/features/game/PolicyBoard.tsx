import type { PlayerView } from "@/lib/game/types";
import { gameAssets } from "@/lib/game/presentation";

const LIBERAL_POLICY_LIMIT = 5;
const FASCIST_POLICY_LIMIT = 6;
const ELECTION_REJECTION_LIMIT = 3;

function executivePowerLabels(playerCount: number): string[] {
  if (playerCount >= 9) {
    return [
      "Điều tra",
      "Điều tra",
      "Bầu cử đặc biệt",
      "Xử bắn",
      "Xử bắn",
      "Thắng",
    ];
  }
  if (playerCount >= 7) {
    return ["—", "Điều tra", "Bầu cử đặc biệt", "Xử bắn", "Xử bắn", "Thắng"];
  }
  return ["—", "—", "Xem trước", "Xử bắn", "Xử bắn", "Thắng"];
}

export function PolicyBoard({ snapshot }: { snapshot: PlayerView }) {
  const playerCount = snapshot.players.length;
  const powerLabels = executivePowerLabels(playerCount);

  return (
    <section className="policy-board panel" aria-label="Bàn chính sách">
      <div className="board-heading">
        <p className="eyebrow">BÀN CHÍNH SÁCH</p>
        <span>{playerCount} thành viên</span>
      </div>
      <div className="policy-track liberal-track">
        <div className="track-heading">
          <h2>
            <img src={gameAssets.liberal} alt="" width="32" height="32" />
            Tự do
          </h2>
          <strong data-testid="liberal-count">
            {snapshot.enactedLiberalPolicies}/{LIBERAL_POLICY_LIMIT}
          </strong>
        </div>
        <div className="track-slots">
          {Array.from({ length: LIBERAL_POLICY_LIMIT }, (_, index) => {
            const isEnacted = index < snapshot.enactedLiberalPolicies;
            const statusLabel = isEnacted ? "đã ban hành" : "chưa ban hành";
            const isWinningSlot = index === LIBERAL_POLICY_LIMIT - 1;

            return (
              <div
                key={index}
                className={isEnacted ? "slot enacted" : "slot"}
                aria-label={`Chính sách Tự do ${index + 1}: ${statusLabel}`}
              >
                <span>{index + 1}</span>
                <small>{isWinningSlot ? "Thắng" : "Tự do"}</small>
              </div>
            );
          })}
        </div>
      </div>
      <div className="policy-track fascist-track">
        <div className="track-heading">
          <h2>
            <img src={gameAssets.fascist} alt="" width="32" height="32" />
            Phát xít
          </h2>
          <strong data-testid="fascist-count">
            {snapshot.enactedFascistPolicies}/{FASCIST_POLICY_LIMIT}
          </strong>
        </div>
        <div className="track-slots">
          {Array.from({ length: FASCIST_POLICY_LIMIT }, (_, index) => {
            const isEnacted = index < snapshot.enactedFascistPolicies;
            const statusLabel = isEnacted ? "đã ban hành" : "chưa ban hành";

            return (
              <div
                key={index}
                className={isEnacted ? "slot enacted" : "slot"}
                aria-label={`Chính sách Phát xít ${index + 1}: ${statusLabel}`}
              >
                <span>{index + 1}</span>
                <small>{powerLabels[index]}</small>
              </div>
            );
          })}
        </div>
        <p className="track-note">
          Từ 3 chính sách: Hitler được bầu làm Thủ tướng thì phe Phát xít thắng.
          Từ 5: mở quyền veto.
        </p>
      </div>
      <div className="election-track">
        <span>Chính phủ bị từ chối</span>
        <div
          aria-label={`Bộ đếm bầu cử ${snapshot.electionTracker}/${ELECTION_REJECTION_LIMIT}`}
        >
          {[1, 2, 3].map((rejectionCount) => (
            <span
              key={rejectionCount}
              className={
                rejectionCount <= snapshot.electionTracker
                  ? "tracker-dot filled"
                  : "tracker-dot"
              }
            >
              {rejectionCount}
            </span>
          ))}
        </div>
        <strong data-testid="election-count">
          {snapshot.electionTracker}/{ELECTION_REJECTION_LIMIT}
        </strong>
      </div>
      <div className="deck-counts">
        <span className="deck-count-label">
          <img
            className="deck-stack-art"
            src={gameAssets.cardStack}
            alt=""
            width="32"
            height="38"
            loading="lazy"
            draggable={false}
          />
          Bộ rút: <strong>{snapshot.drawDeckSize}</strong> lá
        </span>
        <span>
          Bộ bỏ: <strong>{snapshot.discardDeckSize}</strong> lá
        </span>
      </div>
    </section>
  );
}
