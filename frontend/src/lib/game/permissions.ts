import type { Action, PlayerView } from "./types";
export interface Permission {
  allowed: boolean;
  reason: string;
}
const yes: Permission = { allowed: true, reason: "" };
const no = (reason: string): Permission => ({ allowed: false, reason });
export function chancellorEligibility(s: PlayerView, id: string): Permission {
  const player = s.players.find((p) => p.id === id);
  if (!player || !player.isAlive) {
    return no("Người chơi đã bị loại.");
  }
  if (id === s.currentPresidentId) {
    return no("Tổng thống không thể tự đề cử.");
  }
  if (id === s.lastElectedChancellorId) {
    return no("Thủ tướng chính phủ vừa được bầu không đủ điều kiện.");
  }
  if (
    s.players.filter((p) => p.isAlive).length > 5 &&
    id === s.lastElectedPresidentId
  ) {
    return no(
      "Tổng thống chính phủ vừa được bầu không đủ điều kiện khi còn hơn 5 người.",
    );
  }
  return yes;
}
export function actionPermission(
  s: PlayerView,
  action: Action,
  online: boolean,
  pending: boolean,
): Permission {
  if (!online) {
    return no("Đang chờ kết nối và đồng bộ.");
  }
  if (pending) {
    return no("Đang chờ máy chủ xác nhận thao tác trước.");
  }
  const me = s.players.find((p) => p.id === s.myPlayerId);
  if (!me || !me.isAlive) {
    return no("Bạn đã bị loại và chỉ có thể theo dõi.");
  }
  if (s.currentPhase === "GAME_OVER") {
    return no("Ván đã kết thúc.");
  }
  if (action === "start") {
    return s.currentPhase === "LOBBY" &&
      me.isHost &&
      s.players.length >= 5 &&
      s.players.length <= 10
      ? yes
      : no("Chỉ chủ phòng có thể bắt đầu với 5–10 người.");
  }
  if (action === "vote") {
    return s.currentPhase === "VOTING" ? yes : no("Chưa tới vòng bỏ phiếu.");
  }
  if (action === "nominate") {
    return s.currentPhase === "NOMINATION" &&
      s.myPlayerId === s.currentPresidentId
      ? yes
      : no("Đang chờ Tổng thống đề cử.");
  }
  const president = s.myPlayerId === s.currentPresidentId;
  const chancellor = s.myPlayerId === s.currentChancellorId;
  if (action === "discard") {
    return s.currentPhase === "LEGISLATIVE_PRESIDENT" &&
      president &&
      s.handCards.length === 3
      ? yes
      : no("Chỉ Tổng thống đang lập pháp có thể bỏ lá.");
  }
  if (action === "enact") {
    return s.currentPhase === "LEGISLATIVE_CHANCELLOR" &&
      chancellor &&
      s.handCards.length === 2
      ? yes
      : no("Chỉ Thủ tướng đang lập pháp có thể ban hành.");
  }
  if (action === "veto/request") {
    return s.currentPhase === "LEGISLATIVE_CHANCELLOR" &&
      chancellor &&
      s.enactedFascistPolicies >= 5 &&
      !s.vetoRequestedThisRound
      ? yes
      : no(
          s.vetoRequestedThisRound
            ? "Veto đã được yêu cầu trong lượt này."
            : "Veto mở từ 5 chính sách Phát xít.",
        );
  }
  if (action === "veto/response") {
    return s.currentPhase === "VETO_CONFIRMATION" && president
      ? yes
      : no("Đang chờ Tổng thống phản hồi veto.");
  }
  const powers: Partial<Record<Action, PlayerView["pendingExecutiveAction"]>> =
    {
      execute: "EXECUTION",
      investigate: "INVESTIGATE_LOYALTY",
      "special-election": "SPECIAL_ELECTION",
      "end-action": "POLICY_PEEK",
    };
  if (powers[action]) {
    return s.currentPhase === "EXECUTIVE_ACTION" &&
      president &&
      s.pendingExecutiveAction === powers[action]
      ? yes
      : no("Quyền lực này chưa được giao cho bạn.");
  }
  return no("Chưa tới giai đoạn thực hiện hành động này.");
}
export function executiveTargetEligibility(
  s: PlayerView,
  id: string,
): Permission {
  const p = s.players.find((player) => player.id === id);
  if (!p || !p.isAlive) {
    return no("Người chơi đã bị loại.");
  }
  if (id === s.currentPresidentId) {
    return no("Không thể chọn chính mình.");
  }
  if (s.pendingExecutiveAction === "INVESTIGATE_LOYALTY" && p.isInvestigated) {
    return no("Người chơi đã được điều tra.");
  }
  return yes;
}
