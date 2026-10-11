# Secret Hitler — web client

Giao diện tiếng Việt dành cho máy tính, dùng Next.js/React và BE Spring Boot của dự án. Hỗ trợ phòng 5–10 người, đề cử/bỏ phiếu, lập pháp, veto, quyền lực Tổng thống, kết quả và khôi phục phiên.

## Chạy local

Cần Node 24, npm và JDK 21. Từ thư mục `frontend`:

```powershell
npm.cmd ci
if (!(Test-Path -LiteralPath '.env.local')) { Copy-Item -LiteralPath '.env.example' -Destination '.env.local' }
npm.cmd run dev
```

Mở http://localhost:3000. BE chạy cổng 8080 trong terminal riêng:

```powershell
Set-Location '../Backend'
$env:JAVA_HOME=(Resolve-Path '../.tools/jdk-21.0.12.1+1').Path # hoặc JDK 21 của bạn
$env:DEBUG='false'
.\mvnw.cmd spring-boot:run
```

`.env.local` dùng `NEXT_PUBLIC_API_URL=http://localhost:8080` và `NEXT_PUBLIC_WS_URL=http://localhost:8080/ws`. Chúng là địa chỉ HTTP của REST/SockJS, không chứa token. FE đóng gói Noto Sans/Noto Serif (có bộ ký tự tiếng Việt) từ Fontsource, không tải font từ dịch vụ ngoài khi chơi.

Mỗi người dùng profile trình duyệt riêng. Trong cùng profile chỉ một tab giữ phiên phòng; tab thứ hai bị chặn bằng Web Locks. Identity được giữ ở localStorage; vai trò, lá bài và kết quả điều tra chỉ ở bộ nhớ. Reload dùng identity cũ để lấy snapshot, không tự join thêm. Rời phòng cần xác nhận, dọn dữ liệu riêng và giữ nickname; không có rematch trong phòng cũ. BE giữ phòng trong RAM, phòng idle bị dọn sau một giờ.

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

E2E cần Microsoft Edge đã cài cho project `edge`. Playwright tự khởi động fixture BE loopback **8081** và Next **3000**, cấu hình FE trỏ tới fixture BE. Hãy dừng Next đang chạy với env 8080 trước khi chạy E2E: reuse một server khác env sẽ làm test dùng nhầm BE. Cần JDK 21 hoặc portable JDK ở `.tools/`. Fixture và timing endpoint chỉ thuộc test classpath, không được đóng gói production. Traces tắt để tránh ghi private frames; timing report chỉ chứa actionId/version/recipient test/timing.

Chạy một nhóm: `npx.cmd playwright test reconnect.spec.ts --project=chromium`. Báo cáo local ở `playwright-report/`; artifact/cache được ignore. Không commit/push/deploy tự động.

## Khi có lỗi

- `Đang đồng bộ`/mất mạng: thao tác bị khóa tới khi subscription và GET snapshot hoàn tất. Lệnh quá 8 giây chưa ACK báo chưa rõ kết quả, không tự gửi lại.
- `Phiên trùng`: đóng tab/profile đang giữ cùng identity rồi thử lại; BE không thay socket chủ động.
- Identity sai hoặc phòng hết hạn: về trang đầu và tạo/vào phòng mới. Không tự tạo identity mới để rejoin trong recovery.
- Không hỗ trợ Web Locks hoặc storage bị chặn: ứng dụng hiển thị lỗi, cần Chrome/Edge và cho phép storage.
- Lỗi Maven: kiểm tra `JAVA_HOME` là JDK 21; lần cài đầu cần Internet. Lỗi Git ownership có thể dùng `git -c safe.directory=D:/Code/HBoardGame/Secret-Hitler-Boardgame ...` cho từng lệnh.

Thiết kế và bằng chứng kiểm chứng ở `D:/Code/HBoardGame/specs/001-game-frontend/`. Phiên nghiệm thu 5 người thật vẫn cần thực hiện theo `quickstart.md`; kết quả tự động không thay cho nghiệm thu này.

Nếu bấm Back về trang đầu khi phiên còn hoạt động, chọn **Quay lại phòng** hoặc **Rời phòng**; form tạo/vào bàn mới xuất hiện sau khi phiên cũ đã dọn.
