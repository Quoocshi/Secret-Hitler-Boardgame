# Kick và rời phòng chủ động

FE sử dụng các endpoint đã có trong BE tại commit `3e50528`. Không thay đổi BE, không tạo commit hoặc push.

## Hành vi

- Chủ phòng thấy nút **Mời rời phòng** cạnh thành viên khác trong phòng chờ, bàn chơi và danh sách vai trò cuối ván. Không có nút tự kick. Quyền quản lý phòng không phụ thuộc việc chủ phòng còn sống trong ván hay không.
- Popup xác nhận nêu tên người bị mời ra. Trong ván đang chơi, popup cảnh báo việc còn dưới 5 thành viên sẽ làm ván dừng. Popup dùng `ConfirmDialog` nằm giữa màn hình.
- Kick gửi một lần tới `/app/room/{roomCode}/kick`, payload `{ targetPlayerId }`, kèm header phiên. Thao tác đang chờ chỉ được giải phóng khi đúng người được chọn biến mất khỏi danh sách; thay đổi của người khác không xác nhận lệnh này.
- **Rời phòng** gửi một lần tới `/app/room/{roomCode}/leave`, rồi dùng GET kiểm tra tư cách thành viên. Chỉ sau khi BE xác nhận phiên không còn thuộc phòng, FE mới xóa danh tính và trở về trang đầu.
- Trong lúc rời phòng, FE dừng polling cũ, vô hiệu hóa push cũ và không sửa presence bằng `/join`. Khi mất kết nối hoặc chưa xác nhận được kết quả, FE đóng thông tin riêng, giữ danh tính và yêu cầu người dùng kết nối lại kiểm tra; không tự gửi lại leave.
- Người bị kick không nhận snapshot mới từ BE. Lượt đồng bộ membership tiếp theo phát hiện việc bị xóa, đóng dữ liệu riêng, xóa danh tính cũ và trả khóa tab. Không tự tạo thành viên thay thế. Người dùng có thể về trang đầu và tạo phòng mới ngay.
- Đóng tab, F5 hoặc mất mạng vẫn giữ tư cách thành viên để kết nối lại, khác với **Rời phòng** hoặc kick vốn xóa thành viên khỏi BE. Người bị kick chỉ có thể chủ động tham gia lại như thành viên mới khi phòng ở `LOBBY`.
- Khi ván kết thúc, chủ phòng dùng **Trở lại phòng chờ** gửi một lần tới `/app/room/{roomCode}/restart`. FE chỉ chuyển về phòng chờ sau khi nhận snapshot `LOBBY` từ BE, không tự reset ván hoặc tự gửi lại lệnh. Mã phòng và các thành viên còn lại được giữ nguyên. Nút vẫn dành cho chủ phòng đã bị loại trong ván, nhưng khóa khi mất kết nối hoặc đang chờ xác nhận thao tác khác. Thành viên khác chờ chủ phòng mở lại phòng chờ.
- Sau khi phòng trở về `LOBBY`, người đã rời hoặc bị kick có thể dùng mã cũ để tham gia lại. Có thể mở lại phòng khi còn dưới 5 người; chỉ bắt đầu ván mới khi đủ 5–10 người.

## Dừng ván

BE quyết định chuyển chủ và dừng ván khi số thành viên của ván đang chơi còn dưới 5. FE hiển thị `GAME_OVER`, `winner=NONE` và `winReason` từ BE. Nếu còn đủ 5 người, FE không tự dừng ván.

BE có thể giữ ID chức vụ của người đã rời. Decoder chấp nhận tham chiếu dạng chuỗi này, vẫn yêu cầu người nhận thuộc danh sách thành viên và không đưa bài hoặc kết quả điều tra không còn hợp lệ vào UI. Tên chức vụ không còn thành viên tương ứng được hiển thị là **Đã rời phòng**.

## File chính

| Nhóm                    | File                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI kick                 | `src/features/room/KickPlayerButton.tsx`, `Lobby.tsx`, `src/features/game/PlayerList.tsx`, `GameOverPanel.tsx`                                                |
| UI rời phòng/trạng thái | `LeaveButton.tsx`, `RoomScreen.tsx`, `ConnectionBanner.tsx`, `src/pages/HomePage.tsx`                                                                         |
| Phiên và transport      | `RoomSessionProvider.tsx`, `src/lib/realtime/room-client.ts`, `room-departure.ts`                                                                             |
| Quyền và dữ liệu        | `src/lib/game/types.ts`, `permissions.ts`, `src/lib/api/decoders.ts`, `src/lib/realtime/commands.ts`, `room-reducer.ts`, `src/features/game/PhaseSummary.tsx` |
| Trình bày               | `src/app/globals.css`                                                                                                                                         |

## Kiểm tra

- `tests/integration/room-management.test.ts`: quyền, payload, chống gửi trùng, xác nhận đúng mục tiêu, leave chưa xác nhận và dữ liệu abort.
- `tests/e2e/legacy/room-management.spec.ts`: luồng UI với BE thật trên Chromium/Edge, bao gồm chuyển chủ, xóa danh tính sau kick, tạo phòng mới không reload, 5→4 dừng ván và 6→5 tiếp tục ván.
- `tests/e2e/compatibility/room-departure.spec.ts`: BE chưa xác nhận leave thì FE giữ danh tính, đóng dữ liệu riêng và không replay.
- `tests/integration/reconnect.test.ts`, `tests/unit/legacy-contract.test.ts`: cập nhật kỳ vọng cho thành viên đã bị xóa và tham chiếu chức vụ cũ.

Log nằm tại `artifacts/logs/frontend/room-management-*.log`; báo cáo trình duyệt và tổng hợp nằm trong `artifacts/reports/` ở root repository.
