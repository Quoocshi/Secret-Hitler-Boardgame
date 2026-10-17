# Rà soát khả năng đọc code FE — 2026-10-17

Phạm vi gồm toàn bộ 41 file trong `src/`, 34 file trong `tests/`, cấu hình FE và launcher kiểm thử. Không giới hạn ở các file đã có trong Git diff. Dependency, lockfile, bundle và output sinh tự động không phải source cần refactor.

## Những phần đã chỉnh

| File hoặc nhóm                                                                                                     | Thay đổi                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `PolicyBoard.tsx`                                                                                                  | Tách bảng quyền lực theo số người ra hàm riêng, đặt tên các giới hạn và trạng thái ô chính sách; bỏ ternary lồng nhau. |
| `PlayerList.tsx`, `VotingActions.tsx`                                                                              | Thay `s`, `p`, `me`, `i` bằng tên mô tả; đặt tên số phiếu và vòng bỏ phiếu; trải JSX thành từng khối.                  |
| `PhaseSummary.tsx`                                                                                                 | Tách hàm tìm tên và thông báo chờ; dùng nhánh điều kiện rõ ràng.                                                       |
| `PolicyHand.tsx`                                                                                                   | Tách nhánh lá chỉ xem và lá có thể chọn, đặt tên class/trạng thái chọn, khai báo kiểu props riêng.                     |
| `GameLog.tsx`, `Field.tsx`, `StatusNotice.tsx`                                                                     | Bỏ component dồn một dòng; đặt tên props và mã thông báo lỗi.                                                          |
| `ConnectionBanner.tsx`, `labels.ts`                                                                                | Mỗi trạng thái một dòng; tách bảng thông báo khỏi render và đặt tên điều kiện kết nối lại.                             |
| `storage.ts`                                                                                                       | Tách xác thực danh tính thành type guard nhận `unknown`; tách đọc/parse/kiểm tra/chọn field và xử lý lỗi.              |
| `tab-lock.ts`                                                                                                      | Viết rõ nhánh không lấy được khóa; giải thích promise giữ khóa cho tới khi gọi hàm release.                            |
| `RoomSessionProvider.tsx`, `RoomEntryForm.tsx`                                                                     | Tách khai báo state; thay tên biến chung chung bằng danh tính đã lưu/danh tính mới và dữ liệu nhập đã chuẩn hóa.       |
| `ConfirmDialog.tsx`, `NominationActions.tsx`, `LeaveButton.tsx`, `Lobby.tsx`, `PhaseActions.tsx`, `permissions.ts` | Làm rõ tên event, trạng thái xác nhận, focus, số người và vai trò người thao tác.                                      |
| Source, test và config còn lại                                                                                     | Áp dụng cùng định dạng, thêm ngoặc khối điều kiện và tách khai báo dồn khi cần. Các file đã rõ ràng được giữ nguyên.   |
| `config.test.ts`, `dialog.test.tsx`, `vitest.config.ts`                                                            | Chỉnh các test và cấu hình cũ còn viết dồn dòng.                                                                       |

Không đổi màu, font, CSS, luật chơi, endpoint hay cơ chế gửi lại lệnh. Các kiểm tra generation/epoch và quyền xem dữ liệu riêng được giữ lại.

Launcher `scripts/run-legacy-backend.ps1` cũng được trải các nhánh kiểm tra/cleanup thành khối và tách tham số khởi chạy process thành bảng có tên.

## Công cụ duy trì

- `npm.cmd run format`: định dạng FE bằng Prettier.
- `npm.cmd run format:check`: phát hiện định dạng bị lệch.
- `npm.cmd run lint`: có thêm quy tắc bắt buộc ngoặc cho khối điều kiện, một khai báo mỗi câu lệnh và cấm ternary lồng nhau.
- `.prettierignore`: bỏ qua dependency, bundle, output kiểm thử và file sinh tự động.

Prettier hỗ trợ bố cục; việc chọn tên biến và tách logic ở bảng trên là phần refactor riêng.

## File log và báo cáo

Đã chuyển 20 file log rải rác ở root và FE vào `artifacts/logs/`, tách thư mục con theo vị trí cũ để tránh trùng tên. Các báo cáo Playwright chuyển vào `artifacts/reports/`. Cấu hình Playwright và launcher FE đã dùng đường dẫn mới cho lần chạy tiếp theo.

`artifacts/moved-files.json` ghi vị trí cũ/mới. Root `.gitignore` bỏ qua `artifacts/`. Log trong `Backend/` và tài liệu spec được giữ tại chỗ.

Kết quả kiểm tra và danh sách file của lần rà soát được lưu trong `artifacts/reports/`; log thực thi nằm trong `artifacts/logs/frontend/readability-*.log`.

## Kết quả kiểm tra

- ESLint, Prettier, TypeScript và production build: đạt.
- Unit/integration: 76/76 đạt, 12 file test.
- Compatibility E2E: 30/30 đạt trên Chromium và Edge.
- E2E với BE thật: 52/52 đạt trên Chromium và Edge; không skip hoặc flaky.
- UX lint: 97/100, không có high/critical.
- Quét cấu trúc 75 file source/test: không còn khai báo dồn, ternary lồng nhau hoặc tên biến một ký tự mơ hồ đã nêu trong lần rà soát.
- `git diff --check`: đạt; không có log rải rác tại root hoặc thư mục FE.

Không tạo commit, không stage, không push và không chỉnh sửa BE.
