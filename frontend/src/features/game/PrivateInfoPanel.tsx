import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
import { Button } from "@/components/ui/Button";
import { gameAssets, roleArtwork } from "@/lib/game/presentation";

export function PrivateInfoPanel({ snapshot }: { snapshot: PlayerView }) {
  const [open, setOpen] = useState(false);
  function toggleRole() {
    setOpen((currentlyOpen) => !currentlyOpen);
  }
  const canSeeAllies =
    snapshot.myRole !== "HITLER" || snapshot.players.length <= 6;
  const allies = snapshot.knownAllyIds
    .filter((playerId) => canSeeAllies && playerId !== snapshot.myPlayerId)
    .map(
      (playerId) =>
        snapshot.players.find((player) => player.id === playerId)?.nickname,
    )
    .filter(Boolean);
  const roleLabel =
    snapshot.myRole === "HITLER"
      ? "Hitler"
      : snapshot.myRole && policyLabels[snapshot.myRole];

  return (
    <section className="panel private-panel" data-testid="private-info">
      <p className="eyebrow">CHỈ BẠN ĐƯỢC XEM</p>
      <h2>Thông tin riêng</h2>
      <div className="private-role-viewer">
        <Button
          className="private-role-frame"
          aria-label={open ? "Úp thẻ vai trò" : "Lật thẻ vai trò"}
          aria-expanded={open}
          aria-controls="private-role"
          onClick={toggleRole}
        >
          <span
            className="private-role-flipper"
            data-revealed={open}
            aria-hidden="true"
          >
            <span className="private-role-face private-role-back">
              <img
                className="role-card-back"
                src={gameAssets.roleBack}
                alt=""
                width="140"
                height="196"
              />
            </span>
            <span className="private-role-face private-role-front">
              {open && snapshot.myRole && (
                <img
                  className="private-role-art"
                  src={roleArtwork(snapshot.myRole, snapshot.myPlayerId)}
                  alt=""
                  width="140"
                  height="196"
                />
              )}
              {open && !snapshot.myRole && <span>Chưa chia vai</span>}
            </span>
          </span>
        </Button>
        <div className="private-role-controls">
          <Button
            aria-expanded={open}
            aria-controls="private-role"
            onClick={toggleRole}
          >
            {open ? "Ẩn vai trò riêng" : "Xem vai trò riêng"}
          </Button>
          <p className="privacy-note">
            Giữ kín màn hình khi xem thông tin này.
          </p>
        </div>
      </div>
      {open && (
        <div id="private-role">
          <p>
            Vai trò của bạn: <strong>{roleLabel || "Chưa chia vai"}</strong>
          </p>
          {canSeeAllies && (
            <p>
              Đồng minh được biết:{" "}
              {allies.length ? allies.join(", ") : "Không có thông tin."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
