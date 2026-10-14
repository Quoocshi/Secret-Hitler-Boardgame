package com.example.backend.constants;

public final class GameConstants {

    private GameConstants() {
    }

    public static final class Room {
        public static final String ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        public static final int ROOM_CODE_LENGTH = 6;
        public static final int MIN_PLAYERS = 5;
        public static final int MAX_PLAYERS = 10;
    }

    public static final class Deck {
        public static final int INITIAL_LIBERAL_POLICIES = 6;
        public static final int INITIAL_FASCIST_POLICIES = 11;
        public static final int PRESIDENT_DRAW_COUNT = 3;
        public static final int CHANCELLOR_RECEIVE_COUNT = 2;
        public static final int CHAOS_DRAW_COUNT = 1;
    }

    public static final class Rule {
        public static final int MAX_ELECTION_TRACKER = 3;
        public static final int LIBERAL_POLICIES_TO_WIN = 5;
        public static final int FASCIST_POLICIES_TO_WIN = 6;
        public static final int FASCIST_POLICIES_FOR_HITLER_ZONE = 3;
        public static final int FASCIST_POLICIES_FOR_VETO = 5;
    }

    public static final class ErrorMessage {
        public static final String ROOM_INVALID_CODE = "Room code không hợp lệ!";
        public static final String ROOM_NOT_FOUND = "Không tìm thấy phòng với mã: %s";
        public static final String ROOM_ALREADY_STARTED = "Trận đấu đã bắt đầu hoặc đã kết thúc, không thể tham gia thêm!";
        public static final String ROOM_FULL = "Phòng đã đầy (tối đa %d người)!";

        public static final String NICKNAME_EMPTY = "Nickname không được để trống!";
        public static final String NICKNAME_DUPLICATED = "Tên '%s' đã có người sử dụng trong phòng này!";
        public static final String SESSION_TOKEN_INVALID = "Session token không hợp lệ!";
        public static final String SESSION_TOKEN_NOT_FOUND = "Phiên người chơi (sessionToken) không hợp lệ trong phòng này!";

        public static final String ACTION_NOT_HOST = "Chỉ chủ phòng (Host) mới có quyền bắt đầu ván đấu!";
        public static final String INVALID_PLAYER_COUNT = "Cần từ %d đến %d người chơi để bắt đầu (hiện có: %d)!";
        public static final String PHASE_NOT_NOMINATION = "Hiện không phải giai đoạn đề cử Thủ tướng!";
        public static final String ACTION_NOT_PRESIDENT = "Chỉ Tổng thống đương nhiệm mới được quyền thực hiện hành động này!";
        public static final String INVALID_NOMINEE = "Người chơi '%s' không hợp lệ để ứng cử (vi phạm giới hạn nhiệm kỳ hoặc đã bị loại)!";

        public static final String INVALID_VOTE_VALUE = "Phiếu bầu không hợp lệ!";
        public static final String PHASE_NOT_VOTING = "Hiện không phải giai đoạn bỏ phiếu!";
        public static final String VOTER_DEAD = "Người chơi đã bị loại không thể tham gia hành động này!";

        // Legislative & Executive Phase Errors
        public static final String PHASE_NOT_LEGISLATIVE_PRESIDENT = "Hiện không phải giai đoạn Tổng thống lập pháp!";
        public static final String PHASE_NOT_LEGISLATIVE_CHANCELLOR = "Hiện không phải giai đoạn Thủ tướng lập pháp!";
        public static final String ACTION_NOT_CHANCELLOR = "Chỉ Thủ tướng đương nhiệm mới có quyền thực hiện hành động này!";
        public static final String CARD_INDEX_OUT_OF_BOUNDS = "Vị trí thẻ bài không hợp lệ!";

        public static final String VETO_NOT_UNLOCKED = "Quyền Veto chưa được mở khóa (cần 5 chính sách Fascist)!";
        public static final String VETO_ALREADY_REQUESTED = "Đã yêu cầu Veto trong lượt này rồi!";
        public static final String PHASE_NOT_VETO_CONFIRMATION = "Hiện không phải giai đoạn xác nhận Veto!";

        public static final String PHASE_NOT_EXECUTIVE_ACTION = "Hiện không phải giai đoạn thực thi Quyền lực Tổng thống!";
        public static final String INVALID_EXECUTIVE_ACTION = "Quyền lực Tổng thống không hợp lệ hoặc không có sẵn!";
        public static final String TARGET_DEAD_OR_INVALID = "Mục tiêu không hợp lệ hoặc đã bị loại!";
        public static final String TARGET_ALREADY_INVESTIGATED = "Người chơi này đã bị điều tra trước đó!";
        public static final String CANNOT_TARGET_SELF = "Không thể chọn chính mình!";

        public static final String CANNOT_KICK_SELF = "Không thể tự kick chính mình!";
        public static final String PLAYER_NOT_FOUND = "Không tìm thấy người chơi!";
    }

    public static final class LogMessage {
        public static final String ROOM_CREATED = "%s đã tạo phòng.";
        public static final String PLAYER_JOINED = "%s đã tham gia phòng.";
        public static final String NEW_HOST = "%s đã trở thành chủ phòng mới.";

        public static final String GAME_STARTED = "Trận đấu bắt đầu với %d người chơi! %s là Tổng thống đầu tiên.";
        public static final String CHANCELLOR_NOMINATED = "Tổng thống %s đã đề cử %s làm Thủ tướng. Mời toàn bàn bỏ phiếu!";
        public static final String NEXT_PRESIDENT = "Lượt mới: %s trở thành Tổng thống tiếp theo.";
        public static final String DECK_RESHUFFLED = "Cọc bài rút còn ít hơn %d lá. Đã gộp cọc bài bỏ và xáo lại (%d lá).";

        public static final String ELECTION_SUCCESS = "Bầu cử THÀNH CÔNG (%d JA - %d NEIN)! %s chính thức nhậm chức Thủ tướng.";
        public static final String ELECTION_FAIL = "Bầu cử THẤT BẠI (%d JA - %d NEIN) cho ứng viên %s. Bộ đếm bầu cử tăng lên: %d/%d.";

        public static final String CHAOS_TRIGGERED = "HỖN LOẠN (%d lần bầu cử thất bại)! Chính sách trên cùng được ban hành tự động: %s (%d/%d).";

        public static final String WIN_REASON_HITLER = "Hitler (%s) đã đắc cử Thủ tướng sau khi có từ %d chính sách Fascist trở lên!";
        public static final String WIN_REASON_HITLER_DEAD = "Hitler (%s) đã bị xử bắn!";
        public static final String WIN_REASON_LIBERAL = "Đất nước đã ban hành đủ %d chính sách Liberal!";
        public static final String WIN_REASON_FASCIST = "Đất nước đã ban hành đủ %d chính sách Fascist!";
        public static final String GAME_OVER = "KẾT THÚC: Phe %s chiến thắng! %s";

        public static final String LEGISLATIVE_PHASE = "Tổng thống %s đang xem xét %d lá chính sách.";
        public static final String PRESIDENT_DISCARDED = "Tổng thống %s đã bỏ 1 chính sách và chuyển 2 chính sách cho Thủ tướng.";
        public static final String POLICY_ENACTED = "Chính sách %s đã được ban hành! (Liberal: %d/%d, Fascist: %d/%d)";

        public static final String VETO_REQUESTED = "Thủ tướng %s đã yêu cầu sử dụng quyền Veto!";
        public static final String VETO_APPROVED = "Tổng thống %s đã ĐỒNG Ý yêu cầu Veto. Cả 2 lá chính sách bị hủy.";
        public static final String VETO_REJECTED = "Tổng thống %s đã TỪ CHỐI Veto. Thủ tướng buộc phải ban hành 1 chính sách.";

        public static final String PLAYER_EXECUTED = "Tổng thống %s đã xử bắn %s!";
        public static final String PLAYER_INVESTIGATED = "Tổng thống %s đã điều tra danh tính của %s.";
        public static final String SPECIAL_ELECTION_CALLED = "Tổng thống %s đã chỉ định %s làm Tổng thống tiếp theo (Bầu cử đặc biệt).";
        public static final String POLICY_PEEK_USED = "Tổng thống %s đã xem trước 3 lá chính sách tiếp theo.";

        public static final String PLAYER_KICKED = "Chủ phòng %s đã kick %s ra khỏi phòng.";
        public static final String PLAYER_LEFT = "%s đã rời khỏi phòng.";
        public static final String GAME_ABORTED = "KẾT THÚC SỚM: Số lượng người chơi hiện tại (%d) ít hơn mức tối thiểu (%d).";
    }


}