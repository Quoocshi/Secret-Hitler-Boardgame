# Backend: Docker và Render

Dockerfile build và chạy test bằng Maven Wrapper với JDK 21, sau đó chỉ
chép production JAR vào image JRE 21. Runtime dùng user không phải root.
Ứng dụng nghe trên `0.0.0.0`, dùng biến `PORT` của hosting hoặc cổng 8080
khi chạy local. Render cấp HTTPS bên ngoài; BE bên trong vẫn chạy HTTP.

## Chạy Docker local

Từ thư mục gốc repository, cần Docker Desktop đang chạy Linux containers:

```powershell
docker build -t shboardgame-backend ./Backend
docker run --rm --name shboardgame-backend -p 8080:8080 -e APP_ALLOWED_ORIGINS=http://localhost:3000 shboardgame-backend
```

FE local dùng `NEXT_PUBLIC_API_URL=http://localhost:8080` và
`NEXT_PUBLIC_WS_URL=http://localhost:8080/ws`.

## Deploy BE lên Render

Sau khi các file này đã được commit và push lên GitHub:

1. Trên Render chọn **New → Web Service**, kết nối repository
   `Quoocshi/Secret-Hitler-Boardgame`.
2. Chọn branch `develop`, **Language: Docker**.
3. Đặt **Root Directory: Backend**, **Dockerfile Path: ./Dockerfile**,
   **Docker Build Context: .** (đường dẫn tính từ Root Directory).
4. Để trống Docker Command để dùng ENTRYPOINT của image.
5. Thêm biến môi trường `APP_ALLOWED_ORIGINS` là origin FE chính xác,
   không có dấu `/` cuối. Ví dụ deployment FE hiện tại:

   ```dotenv
   APP_ALLOWED_ORIGINS=https://shboardgame-9tk3c3u48-arashi5.vercel.app
   ```

   Nên thay bằng domain Production cố định lấy từ Vercel → Settings →
   Domains. Nếu cần nhiều origin, phân cách bằng dấu phẩy.
6. Chạy một instance. Giữ `PORT` do Render cấp; không cần tự đặt.
   Có thể để mặc định kiểm tra sức khỏe TCP, vì `/` chưa có HTTP endpoint.
7. Chọn **Create Web Service**. Sau khi trạng thái Live, sao chép URL HTTPS
   thực tế được Render cấp, dạng `https://ten-service.onrender.com`.

Tài liệu chính thức:
[Docker](https://render.com/docs/docker),
[Web Services](https://render.com/docs/web-services),
[WebSocket](https://render.com/docs/websocket).

## Nối FE trên Vercel

Vercel → Settings → Environment Variables, thay URL ví dụ bằng URL BE
thực tế, chọn môi trường Production:

```dotenv
NEXT_PUBLIC_API_URL=https://ten-service.onrender.com
NEXT_PUBLIC_WS_URL=https://ten-service.onrender.com/ws
```

`WS_URL` dùng `https://` vì client kết nối SockJS, không dùng `wss://`.
Redeploy FE để nhận biến mới. Nếu đổi domain FE, cập nhật
`APP_ALLOWED_ORIGINS` và restart/redeploy BE.

Kiểm tra bằng cách mở FE, tạo phòng, rồi cho người khác vào cùng mã phòng;
WebSocket kết nối xong thì phòng mới hiển thị người chơi online.
BE không có trang chủ ở `/`, nên truy cập URL gốc có thể trả 404.

Phòng đang lưu trong RAM của một process: restart, deploy mới hoặc hosting
dừng instance sẽ làm mất phòng. Không bật nhiều instance khi chưa có cơ
chế chia sẻ trạng thái phòng.
