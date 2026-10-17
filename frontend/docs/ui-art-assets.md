# Danh sách hình ảnh cho UI

Mục tiêu: tăng cảm giác board game trên nền giấy ấm, giữ chữ tiếng Việt dễ đọc.
Giữ palette và font trong `../../DESIGN.md`. Bộ asset đã được upload vào
`frontend/public/images/`; bảng bên dưới giữ lại brief và kích thước mục tiêu
cho các lần bổ sung tiếp theo. Chữ, tên vai trò và nút vẫn được dựng bằng HTML/CSS.

## Asset đã tích hợp

| Asset hiện có                                                            | Vị trí sử dụng                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `paper-tile.webp`                                                        | Nền giấy của ứng dụng, có màu nền dự phòng khi ảnh không tải được                          |
| `office-president.svg`, `office-chancellor.svg`                          | Tóm tắt chức vụ và nhãn bên cạnh tên người chơi                                            |
| `faction-liberal.svg`, `faction-fascist.svg.svg`                         | Tiêu đề hai phe trên bàn và biểu tượng lá chính sách; giữ đúng tên file được upload        |
| `vote-ja.svg`, `vote-nein.svg`                                           | Hai nút bỏ phiếu, đi kèm nhãn chữ                                                          |
| `role-back.webp`                                                         | Mặt úp ở khu vực thông tin riêng                                                           |
| `role-liberal-1/2/3.webp`, `role-fascist-1/2/3.webp`, `role-hitler.webp` | Ảnh vai trò riêng khi chủ nhân bấm xem; chân dung tổng kết chỉ khi BE đã công khai vai trò |
| `item-cluster-1.webp`                                                    | Minh họa giấy và phong bì trong phòng chờ                                                  |

Bổ sung trang trí: `item-cluster-2.webp` và `item-red-seal.webp` ở trang vào
phòng; `item-cluster-3.webp` bên cạnh tiêu đề tổng kết; `item-stack-card.webp`
cạnh bộ đếm bộ rút. Các ảnh dùng alt rỗng, không bắt sự kiện chuột và luôn
chiếm không gian riêng để không che nội dung hoặc nút.

Đường dẫn được tập trung trong `src/lib/game/presentation.ts`. Các biến thể ảnh
của cùng một vai trò được chọn ổn định theo ID người chơi, chỉ mang ý nghĩa
minh họa. Không dùng chân dung phe trong danh sách công khai lúc ván đang diễn ra.
Các item còn lại được giữ nguyên làm nguồn cho các lần cải thiện UI tiếp theo.

## Asset cần chuẩn bị

Kích thước dưới đây là kích thước xuất file ở mức 2× so với kích thước hiển thị
dự kiến. Ngân sách dung lượng là mục tiêu cho từng file, không phải yêu cầu tải
tất cả ảnh ngay khi mở ứng dụng.

| Ưu tiên | Tên file dự kiến                                | Dùng ở đâu                                                      | Brief hình ảnh                                                                                        | Kích thước xuất / định dạng         | Ngân sách          |
| ------- | ----------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------ |
| P1      | `paper-tile.webp`                               | Nền trang và nền bàn                                            | Giấy ngà `#f4f0e6`, hạt rất nhẹ, ghép lặp không lộ mép; không chữ, không vết bẩn đậm dưới nội dung    | 512×512, WebP lặp; nền đục          | ≤50 KB             |
| P1      | `role-liberal.webp`                             | Mặt thẻ vai trò riêng; ảnh nhỏ trong tổng kết sau khi công khai | Chân dung nhân vật hư cấu, nét in khắc, điểm nhấn xanh `#246975`; cùng bố cục với hai role còn lại    | 600×840, WebP, tỷ lệ 5:7            | ≤120 KB            |
| P1      | `role-fascist.webp`                             | Mặt thẻ vai trò Phát xít                                        | Nhân vật hư cấu khác biệt rõ, cùng nét vẽ và khung hình; điểm nhấn đất nung `#a44832`                 | 600×840, WebP, tỷ lệ 5:7            | ≤120 KB            |
| P1      | `role-hitler.webp`                              | Mặt thẻ vai trò Hitler                                          | Nhân vật nhận diện riêng, cùng phong cách; phân biệt bằng hình dáng và nhãn HTML, không chỉ bằng màu  | 600×840, WebP, tỷ lệ 5:7            | ≤120 KB            |
| P1      | `role-back.webp`                                | Mặt úp trước khi người chơi mở vai trò riêng                    | Hoa văn cân xứng trung tính; một mặt sau dùng chung, không để lộ phe qua màu hay chi tiết             | 600×840, WebP, tỷ lệ 5:7            | ≤90 KB             |
| P2      | `faction-liberal.svg`, `faction-fascist.svg`    | Dấu phe cạnh tiêu đề kết quả, nhãn role, chính sách             | Hai biểu tượng khác hình; nét in đơn giản; đọc rõ khi thu nhỏ; không chứa chữ                         | SVG viewBox 0 0 64 64, trong suốt   | ≤8 KB / biểu tượng |
| P2      | `policy-liberal.webp`, `policy-fascist.webp`    | Lá chính sách trong tay và ô đã ban hành                        | Minh họa văn bản/tài liệu hư cấu, hai hệ biểu tượng; giữ vùng trống cho tên và trạng thái HTML        | 480×672, WebP, tỷ lệ 5:7            | ≤80 KB / lá        |
| P2      | `vote-ja.svg`, `vote-nein.svg`                  | Minh họa trên lựa chọn bỏ phiếu                                 | Dấu đồng ý/phản đối khác hình; không vẽ chữ JA/NEIN vào ảnh; chữ vẫn đặt bằng HTML                    | SVG viewBox 0 0 64 64, trong suốt   | ≤8 KB / biểu tượng |
| P2      | `office-president.svg`, `office-chancellor.svg` | Nhận diện chức vụ trên bàn chơi                                 | Biểu tượng con dấu/bảng tên, hai hình khác nhau, cùng độ dày nét                                      | SVG viewBox 0 0 64 64, trong suốt   | ≤8 KB / biểu tượng |
| P3      | `room-illustration.webp`                        | Trang tạo/vào phòng, vùng minh họa bên cạnh nội dung            | Bàn giấy và phiếu bầu, góc nhìn từ trên; không chữ, ít chi tiết, chừa khoảng thở                      | 1440×1080, WebP                     | ≤180 KB            |
| P3      | `result-ornament.svg`                           | Trang tổng kết, trang trí nhỏ quanh tiêu đề nếu cần             | Nét khắc hình vòng nguyệt quế/con dấu; dùng chung cho kết quả, không gắn thông tin thắng thua vào ảnh | SVG viewBox 0 0 160 160, trong suốt | ≤12 KB             |

P1: chuẩn bị trước. P2: bổ sung khi làm thẻ và bàn chơi. P3: trang trí tùy chọn,
có thể bỏ để giữ giao diện gọn. Các vai trò dùng chung tỷ lệ và vùng crop.

## Nút bấm và nền thành phần

- **Không cần ảnh cho nền nút.** Giữ Button bằng CSS để hỗ trợ chữ tiếng Việt,
  trạng thái hover/focus/disabled và thay đổi độ dài nhãn. Không dùng một ảnh
  chứa cả chữ và nền làm nút.
- Có thể bổ sung icon SVG `restart`, `leave`, `copy`, `kick`, `chevron` 24×24,
  dùng `currentColor` và cùng độ dày nét. Đây là icon vector, nên vẽ bằng công
  cụ vector hoặc code; không cần tạo ảnh raster. Giữ nhãn chữ bên cạnh icon.
- Nền panel, khung role, viền chính sách, avatar chữ cái và đổ bóng nhẹ làm
  bằng CSS. Nếu có texture giấy, chỉ phủ rất nhẹ và không giảm tương phản chữ.
- Không cần ảnh riêng cho từng tổ hợp thắng/thua/dừng ván. Kết quả và lý do
  vẫn là dữ liệu chữ từ máy chủ, phối biểu tượng phe và màu hiện có.

## Quy ước bàn giao và tích hợp

1. Đặt file được duyệt vào `frontend/public/images/`, chia thư mục `backgrounds/`,
   `roles/`, `policies/`, `icons/`, `illustrations/`. Chưa tạo đường dẫn ảnh trong
   code trước khi có file thật.
2. Bàn giao file nguồn chỉnh sửa được, file xuất, thông tin tác giả/giấy phép và
   crop an toàn. Giữ nhân vật ở giữa 80% khung; không nhúng tên role vào ảnh.
3. Ảnh trang trí dùng `alt=""`; vai trò và trạng thái luôn có nhãn HTML rõ ràng.
   Chỉ thêm mô tả alt khi ảnh mang thông tin chưa có trong phần chữ.
4. Không dùng artwork chưa rõ quyền sử dụng. Không cần logo/chân dung thật
   hoặc hình chính trị để phân biệt phe; dùng hệ nhân vật và biểu tượng hư cấu.
5. Tải ảnh role khi cần mở thẻ; chỉ công bố role của người khác ở GAME_OVER
   theo dữ liệu BE. Tên asset không được dùng để suy ra vai trò chưa công khai.
6. Khi tích hợp, kiểm tra ở 1280×720 và 1440×900, với 10 tên dài, zoom 200%,
   bàn phím và ảnh tải thất bại. Nút và thông tin ván vẫn phải dùng được.

## Thứ tự làm đề xuất

Chốt một bộ mẫu gồm texture giấy, một role và một icon phe trước. Khi đồng nhất
nét vẽ và độ tương phản, mở rộng sang các role còn lại, mặt úp và chính sách.
Minh họa trang vào phòng và ornament tổng kết làm sau cùng.
