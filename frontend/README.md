# Secret Hitler — React + TypeScript

FE là ứng dụng React chạy trong trình duyệt, dùng Vite để chạy dev và build static; React Router quản lý `/` và `/room/:roomCode`. Không còn Next.js hoặc server render FE. WebSocket/SockJS vẫn cập nhật ván chơi trực tiếp.

BE được cập nhật từ `origin/develop` tại commit `3e50528`. Branch làm việc: `align-frontend-backend`. Không chỉnh sửa logic/config/tests BE ngoài các commit đã pull.

## Chạy local

Cần Node24/npm và JDK21 cho BE. Terminal FE, từ `frontend`:

```powershell
npm.cmd ci
if (!(Test-Path -LiteralPath '.env.local')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
npm.cmd run dev
```

Mở http://localhost:3000. Nếu đã có `.env.local`, giữ file đó và đặt hai biến công khai sau; không ghi đè file chứa thông tin riêng:

```dotenv
VITE_API_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080/ws
```

Các tên `NEXT_PUBLIC_*` cũ không còn được sử dụng. URL SockJS phải là HTTP(S), không phải `wss://`. Restart dev/build lại sau khi đổi env. Các biến VITE được đưa vào bundle, không đặt secret ở đó.

Terminal BE riêng, từ `Backend`:

```powershell
$env:JAVA_HOME=(Resolve-Path '../.tools/jdk-21.0.12.1+1').Path # hoặc JDK21 của bạn
$env:DEBUG='false'
.\mvnw.cmd spring-boot:run
```

Mỗi người dùng profile trình duyệt riêng. Web Locks chặn tab trùng trong cùng profile; cần localhost/HTTPS. Danh tính được giữ qua reload; role/cards/kết quả điều tra chỉ ở RAM.

## Build và Vercel

```powershell
npm.cmd run build
npm.cmd run preview
```

Build tạo **`frontend/dist`**, có thể phục vụ bằng static hosting. `preview` dùng port3000 để kiểm tra build trên máy. Không cần chạy một Next.js service.

Trong Vercel, giữ project/domain đang có và đặt:

- Root Directory: `frontend`.
- Framework Preset: **Vite**.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Environment Variables: `VITE_API_URL` và `VITE_WS_URL` trỏ BE HTTPS công khai.

`frontend/vercel.json` đã khai báo Vite và SPA rewrite tới index.html, để mở trực tiếp/tải lại `/room/ABC234` không bị404. Không có thao tác deploy tự động trong lần chỉnh sửa này.

## Tương thích BE hiện tại

- Nhận DTO mới gồm `eligibleChancellorIds`, `revealedRole`, `investigatedPlayerId`; vẫn đọc được DTO cũ khi thiếu các field bổ sung.
- Vai trò công khai chỉ hiển thị ở GAME_OVER khi BE thực sự cung cấp. Từ chối role trong public player của ván đang chạy.
- Điều tra hiển thị kết quả gắn với đúng mục tiêu, chỉ cho Tổng thống trong lượt điều tra; bấm **Đã xem kết quả** gửi end-action để tiếp tục. Không dựng lịch sử riêng hoặc suy đoán party từ log.
- Queue state riêng và session header trên mỗi SEND; không tự replay, không coi snapshot đổi là ACK cho từng lệnh. Thông báo chưa rõ kết quả xuất hiện trong tối đa8giây.
- Giữ polling2giây như phương án đồng bộ dự phòng dù BE mới đã broadcast join. Reconnect xác minh membership trước same-token join, không tạo member thay thế.
- Chủ phòng có nút **Mời rời phòng** cạnh thành viên khác trong phòng chờ, bàn chơi và danh sách vai trò cuối ván. Popup xác nhận nêu rõ người bị mời ra và cảnh báo dừng ván nếu còn dưới 5 thành viên. FE gửi `/kick` với `targetPlayerId`; chỉ cập nhật kết quả theo trạng thái BE.
- **Rời phòng** gửi `/leave` một lần rồi kiểm tra membership trước khi xóa danh tính và về trang đầu. Nếu chưa xác nhận được, FE giữ danh tính để người dùng kết nối lại kiểm tra, đóng thông tin riêng và không tự gửi lại yêu cầu. Mất mạng/đóng tab/F5 chỉ là ngắt kết nối, khác với rời phòng chủ động.
- Người bị kick được phát hiện qua lượt đồng bộ membership tiếp theo, đóng dữ liệu riêng, xóa danh tính cũ và không tự join lại. Khi ván kết thúc, chủ phòng chọn **Trở lại phòng chờ** để giữ mã phòng và các thành viên còn lại. Sau khi phòng trở về LOBBY, người đã rời hoặc bị kick có thể chủ động tham gia lại bằng mã cũ; cần đủ 5–10 người để bắt đầu ván mới.
- BE tự chuyển chủ khi chủ phòng rời và dừng ván đang chơi khi số thành viên còn dưới 5. FE hiển thị `GAME_OVER`, `winner=NONE` và lý do từ BE; chấp nhận các tham chiếu chức vụ cũ tới thành viên đã rời. FE không tự đổi luật hoặc tự gán người thắng. Chưa thêm nút restart hay coi error queue là ACK cho từng lệnh.
- Phòng lưu RAM; restart BE làm mất phòng. Veto không có authoritative flag trong DTO; BE quyết định khả dụng. Không sửa luật/bug engine bằng FE.
- BE hiện có thể làm phòng mất chủ: khi chủ phòng ngắt kết nối mà không còn người nào online, cờ `isHost` bị xóa; kết nối lại không gán quyền lại. FE hiển thị tên chủ khi có, hoặc thông báo phòng không có chủ và hướng dẫn tạo phòng mới. FE không tự cấp quyền bắt đầu ván. Để thử chơi, tạo phòng mới rồi mời mọi người vào; tránh tải lại/đóng tab chủ phòng khi chưa có người khác online.

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright test --config=playwright.compatibility.config.ts
npx.cmd playwright test
```

Unit/integration dùng Vitest. Compatibility suite dùng FE3101 và mock API18082. Real suite dùng FE3100/BE18081; launcher FE-owned build sạch production JAR, kiểm tra BE không khác commit3e50528, không chèn fixture/endpoint vào BE. Mỗi suite chạy Chromium và Microsoft Edge đã cài; `npx.cmd playwright install chromium` nếu thiếu Chromium.

Các port test phải trống; không reuse/dừng nhầm server người dùng. Video/trace/screenshots/private DOM capture bị tắt; attachments chỉ giữ số đếm/timing/action labels an toàn. Dữ liệu mock không được coi là bằng chứng BE thật.

Xem `../../specs/003-align-frontend-backend/react-migration.md` cho kết quả migration hiện tại. Báo cáo validation cũ là lịch sử của BEffad4c2/Next.js, không phải kết quả cho React/BE mới. T074 thử5người thật của feature trước vẫn chờ người dùng. Không tự commit/push/deploy.

## Log và cách giữ code dễ đọc

Log và báo cáo local được gom tại `../artifacts/` ở root repository, được Git bỏ qua:

- `logs/root/`: log cũ ở root.
- `logs/frontend/`: log FE và log BE do launcher kiểm thử FE tạo.
- `reports/test-results/`: kết quả JSON và attachment Playwright.
- `reports/playwright-report/`: báo cáo HTML Playwright.
- `moved-files.json`: danh sách vị trí cũ và mới của các file đã gom.

Log đang có trong `Backend/` được giữ nguyên theo giới hạn không sửa BE. Tài liệu spec được giữ tại thư mục `specs/` để các liên kết lịch sử vẫn hoạt động.

Chạy `npm.cmd run format` để định dạng source, test và config; dùng `npm.cmd run format:check` để kiểm tra. Formatter bỏ qua dependency, bundle, output cũ và lockfile. ESLint yêu cầu dấu ngoặc cho khối điều kiện, một khai báo mỗi câu lệnh và không dùng ternary lồng nhau. Ưu tiên tên biến có nghĩa, JSX nhiều dòng và hàm riêng cho điều kiện dài; xem `docs/readability-review.md` cho phạm vi rà soát.
