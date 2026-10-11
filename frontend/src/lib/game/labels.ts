import type { Phase,Policy,ExecutiveAction } from "./types";
export const policyLabels:Record<Policy,string>={LIBERAL:"Tự do",FASCIST:"Phát xít"};
export const phaseLabels:Record<Phase,string>={LOBBY:"Phòng chờ",NOMINATION:"Đề cử chính phủ",VOTING:"Bỏ phiếu chính phủ",LEGISLATIVE_PRESIDENT:"Tổng thống bỏ một lá",LEGISLATIVE_CHANCELLOR:"Thủ tướng ban hành chính sách",VETO_CONFIRMATION:"Xác nhận veto",EXECUTIVE_ACTION:"Quyền lực Tổng thống",GAME_OVER:"Kết quả ván"};
export const executiveLabels:Record<ExecutiveAction,string>={NONE:"Không có quyền lực",INVESTIGATE_LOYALTY:"Điều tra đảng phái",SPECIAL_ELECTION:"Bầu cử đặc biệt",POLICY_PEEK:"Xem trước chính sách",EXECUTION:"Xử bắn"};
