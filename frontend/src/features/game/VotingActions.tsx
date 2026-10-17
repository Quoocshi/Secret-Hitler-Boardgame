import type { PlayerView, Vote } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";

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
  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  )!;
  const livingPlayers = snapshot.players.filter((player) => player.isAlive);
  const voteCount = livingPlayers.filter((player) => player.hasVoted).length;

  return (
    <>
      <p>
        {voteCount}/{livingPlayers.length} người đã bỏ phiếu.
      </p>
      <div className="vote-buttons">
        <Button
          className="vote-ja"
          disabled={!enabled}
          onClick={() => onVote("JA")}
        >
          JA — Đồng ý
        </Button>
        <Button
          className="vote-nein"
          disabled={!enabled}
          onClick={() => onVote("NEIN")}
        >
          NEIN — Phản đối
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
