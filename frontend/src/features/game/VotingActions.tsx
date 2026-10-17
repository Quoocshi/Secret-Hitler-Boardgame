import { useState } from "react";
import type { PlayerView, Vote } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
import { gameAssets } from "@/lib/game/presentation";

interface VotingActionsProps {
  snapshot: PlayerView;
  enabled: boolean;
  onVote: (vote: Vote) => void;
}

export function VotingActions({
  snapshot,
  enabled,
  onVote,
}: VotingActionsProps) {
  // This is the local choice, not confirmation that the server received it.
  // Do not persist a private vote or infer it from last round's revealed vote.
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  )!;
  const livingPlayers = snapshot.players.filter((player) => player.isAlive);
  const voteCount = livingPlayers.filter((player) => player.hasVoted).length;

  function selectVote(vote: Vote) {
    setSelectedVote(vote);
    onVote(vote);
  }

  return (
    <>
      <p>
        {voteCount}/{livingPlayers.length} người đã bỏ phiếu.
      </p>
      <div className="vote-buttons">
        <Button
          className="vote-ja"
          aria-pressed={selectedVote === "JA"}
          disabled={!enabled}
          onClick={() => selectVote("JA")}
        >
          <img src={gameAssets.voteJa} alt="" width="24" height="24" />
          JA — Đồng ý
          {selectedVote === "JA" && (
            <span className="vote-selection-label">Đang chọn</span>
          )}
        </Button>
        <Button
          className="vote-nein"
          aria-pressed={selectedVote === "NEIN"}
          disabled={!enabled}
          onClick={() => selectVote("NEIN")}
        >
          <img src={gameAssets.voteNein} alt="" width="24" height="24" />
          NEIN — Phản đối
          {selectedVote === "NEIN" && (
            <span className="vote-selection-label">Đang chọn</span>
          )}
        </Button>
      </div>
      <p>
        {currentPlayer.hasVoted
          ? "Bạn đã bỏ phiếu. Có thể đổi trước khi vòng chốt."
          : "Phiếu được giữ kín đến khi mọi người còn sống đã bỏ phiếu."}
      </p>
    </>
  );
}
