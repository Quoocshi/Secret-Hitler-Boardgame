import type { Action, PlayerView, VetoKnowledge } from "./types";

export interface Permission {
  allowed: boolean;
  reason: string;
}
const allowed: Permission = { allowed: true, reason: "" };
const denied = (reason: string): Permission => ({ allowed: false, reason });

export function chancellorEligibility(
  snapshot: PlayerView,
  playerId: string,
): Permission {
  const player = snapshot.players.find(
    (candidate) => candidate.id === playerId,
  );
  if (!player?.isAlive) {
    return denied("Người chơi đã bị loại.");
  }
  if (
    snapshot.eligibleChancellorIds &&
    !snapshot.eligibleChancellorIds.includes(playerId)
  ) {
    return denied("Người chơi không nằm trong danh sách ứng viên của máy chủ.");
  }
  if (playerId === snapshot.currentPresidentId) {
    return denied("Tổng thống không thể tự đề cử.");
  }
  if (playerId === snapshot.lastElectedChancellorId) {
    return denied("Thủ tướng vừa được bầu không đủ điều kiện.");
  }
  const aliveCount = snapshot.players.filter(
    (candidate) => candidate.isAlive,
  ).length;
  if (aliveCount > 5 && playerId === snapshot.lastElectedPresidentId) {
    return denied(
      "Tổng thống vừa được bầu không đủ điều kiện khi còn hơn 5 người.",
    );
  }
  return allowed;
}

export function actionPermission(
  snapshot: PlayerView,
  action: Action,
  online: boolean,
  pending: boolean,
  vetoKnowledge: VetoKnowledge = "unknown",
): Permission {
  if (!online) {
    return denied("Đang chờ kết nối và đồng bộ.");
  }
  if (pending) {
    return denied("Hãy đồng bộ hoặc chờ cập nhật thao tác trước.");
  }
  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  );
  // Resetting a finished room is available even when its host died in the game.
  if (action === "restart") {
    return snapshot.currentPhase === "GAME_OVER" &&
      currentPlayer?.isHost &&
      currentPlayer.isConnected
      ? allowed
      : denied(
          "Chỉ chủ phòng đang kết nối mới có thể đưa ván đã kết thúc về phòng chờ.",
        );
  }
  // Room management remains available to a host who has been eliminated or whose game ended.
  if (action === "kick") {
    return currentPlayer?.isHost && currentPlayer.isConnected
      ? allowed
      : denied(
          "Chỉ chủ phòng đang kết nối mới có thể mời người khác rời phòng.",
        );
  }
  if (!currentPlayer?.isAlive) {
    return denied("Bạn đã bị loại và chỉ có thể theo dõi.");
  }
  if (!currentPlayer.isConnected) {
    return denied("Đang khôi phục trạng thái tham gia.");
  }
  if (snapshot.currentPhase === "GAME_OVER") {
    return denied("Ván đã kết thúc.");
  }

  const isPresident = snapshot.myPlayerId === snapshot.currentPresidentId;
  const isChancellor = snapshot.myPlayerId === snapshot.currentChancellorId;
  let canAct = false;
  switch (action) {
    case "start":
      canAct =
        snapshot.currentPhase === "LOBBY" &&
        currentPlayer.isHost &&
        snapshot.players.length >= 5 &&
        snapshot.players.length <= 10;
      break;
    case "nominate":
      canAct = snapshot.currentPhase === "NOMINATION" && isPresident;
      break;
    case "vote":
      canAct = snapshot.currentPhase === "VOTING";
      break;
    case "discard":
      canAct =
        snapshot.currentPhase === "LEGISLATIVE_PRESIDENT" &&
        isPresident &&
        snapshot.handCards.length === 3;
      break;
    case "enact":
      canAct =
        snapshot.currentPhase === "LEGISLATIVE_CHANCELLOR" &&
        isChancellor &&
        snapshot.handCards.length === 2;
      break;
    case "veto/request":
      canAct =
        snapshot.currentPhase === "LEGISLATIVE_CHANCELLOR" &&
        isChancellor &&
        snapshot.enactedFascistPolicies >= 5 &&
        vetoKnowledge !== "observed-requested";
      break;
    case "veto/response":
      canAct = snapshot.currentPhase === "VETO_CONFIRMATION" && isPresident;
      break;
    case "end-action":
      canAct =
        snapshot.currentPhase === "EXECUTIVE_ACTION" &&
        isPresident &&
        ((snapshot.pendingExecutiveAction === "POLICY_PEEK" &&
          snapshot.handCards.length === 3) ||
          (snapshot.pendingExecutiveAction === "INVESTIGATE_LOYALTY" &&
            !!snapshot.investigatedPlayerId &&
            !!snapshot.investigatedPartyMembership));
      break;
    default: {
      const requiredPower = {
        execute: "EXECUTION",
        investigate: "INVESTIGATE_LOYALTY",
        "special-election": "SPECIAL_ELECTION",
      }[action];
      canAct =
        snapshot.currentPhase === "EXECUTIVE_ACTION" &&
        isPresident &&
        snapshot.pendingExecutiveAction === requiredPower &&
        (action !== "investigate" || !snapshot.investigatedPlayerId);
    }
  }
  return canAct
    ? allowed
    : denied("Hành động chưa khả dụng ở lượt hiện tại hoặc chưa đủ dữ liệu.");
}

export function executiveTargetEligibility(
  snapshot: PlayerView,
  playerId: string,
): Permission {
  const target = snapshot.players.find((player) => player.id === playerId);
  if (!target?.isAlive) {
    return denied("Người chơi đã bị loại.");
  }
  if (playerId === snapshot.currentPresidentId) {
    return denied("Không thể chọn chính mình.");
  }
  if (
    snapshot.pendingExecutiveAction === "INVESTIGATE_LOYALTY" &&
    target.isInvestigated
  ) {
    return denied("Người chơi đã được điều tra.");
  }
  return allowed;
}

export function kickTargetEligibility(
  snapshot: PlayerView,
  playerId: string,
): Permission {
  if (playerId === snapshot.myPlayerId) {
    return denied("Không thể tự mời mình rời phòng.");
  }
  return snapshot.players.some((player) => player.id === playerId)
    ? allowed
    : denied("Người chơi không còn trong phòng.");
}
