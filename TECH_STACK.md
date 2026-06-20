# Tech Stack & Kiến trúc — Tham khảo cho project khác

Tài liệu mô tả lại cách project `cham-cong-app` được dựng, để dùng làm khung mẫu (template) khi làm app tương tự: web app nhỏ, ít người dùng, cần đơn giản — rẻ, dễ deploy, dễ bảo trì.

## 1. Kiến trúc tổng thể

**Monolith 2 phần trong 1 repo, build ra phục vụ chung 1 cổng:**

```
project/
├── server/      ← Node.js + Express + TypeScript (API + phục vụ luôn frontend đã build)
└── web/         ← React + TypeScript + Vite (giao diện)
```

- Dev: chạy 2 process riêng (`server` cổng 4000, `web` cổng 5173 với Vite proxy `/api` → 4000).
- Production: `web` build ra `web/dist` (HTML/CSS/JS tĩnh), `server` build ra `server/dist`, rồi server Express **tự phục vụ luôn** các file tĩnh đó (`express.static` + catch-all route trả `index.html`) — chỉ cần chạy **1 process Node duy nhất** trên 1 cổng. Không cần Nginx để serve frontend (Nginx chỉ dùng làm reverse proxy + SSL khi có domain).

Lý do chọn monolith thay vì tách 2 service riêng: app nhỏ, ít traffic, mục tiêu là rẻ + đơn giản vận hành (1 PM2 process, 1 port, dễ deploy lên VPS giá rẻ).

## 2. Backend

| Thành phần | Lựa chọn | Vì sao |
|---|---|---|
| Runtime | Node.js ≥ 22.5 | Cần cho `node:sqlite` (built-in, native, không cần build native module) |
| Framework | Express | Tối giản, không cần thêm gì cho app nhỏ |
| Ngôn ngữ | TypeScript (compile bằng `tsc`, không dùng bundler) | An toàn type, build đơn giản (`tsc -p .` → `dist/`) |
| Database | **SQLite qua `node:sqlite` (built-in)** | Không cần cài driver/ORM ngoài, 1 file `database.sqlite` duy nhất, dễ backup (chỉ cần copy file) |
| ORM | Không dùng — viết SQL thuần qua `db.prepare(...).get()/.all()/.run()` | Schema đơn giản, không cần lớp trừu tượng thêm |

**Cấu trúc `server/src/`:**
```
db.ts              ← Mở kết nối SQLite + CREATE TABLE IF NOT EXISTS + migration tự động (ALTER TABLE nếu thiếu cột) + seed dữ liệu mặc định
index.ts           ← Khởi tạo Express app, mount các router, serve static web/dist, listen port
routes/
  attendance.ts     ← 1 file = 1 nhóm resource, export 1 Router
  auth.ts
  config.ts
  expenses.ts
  payroll.ts
  settlements.ts
```

**Quy ước route:** mỗi file route tự `export const xRouter = Router()`, định nghĩa `xRouter.get/post/put/delete(...)`, rồi `index.ts` mount bằng `app.use('/api/x', xRouter)`. Không có controller/service layer riêng — logic viết thẳng trong route handler vì app nhỏ.

**Migration DB không dùng tool ngoài** (không Prisma/Knex/Drizzle): mỗi lần server khởi động, `db.ts` chạy `CREATE TABLE IF NOT EXISTS` cho bảng mới, và kiểm tra `PRAGMA table_info(table)` để `ALTER TABLE ADD COLUMN` nếu thiếu cột (tương thích ngược với DB cũ đã có dữ liệu). Đơn giản, không cần file migration riêng, phù hợp app nhỏ ít thay đổi schema.

## 3. Frontend

| Thành phần | Lựa chọn | Vì sao |
|---|---|---|
| Framework | React 19 + TypeScript | Phổ biến, dễ AI-assist code |
| Build tool | Vite | Nhanh, cấu hình tối giản |
| State management | Không dùng lib ngoài — `useState`/`useEffect` thuần trong từng component | App nhỏ, không cần Redux/Zustand |
| Routing | Không dùng router lib — chuyển "tab" bằng 1 state `useState<Tab>` ở component gốc | Không cần URL-based routing vì chỉ là tab nội bộ 1 trang |
| Styling | 1 file CSS thuần (`App.css`) dùng class đặt tay, biến CSS (`:root { --accent: ... }`) | Không cần Tailwind/CSS-in-JS cho app nhỏ |
| Gọi API | 1 file `api.ts` duy nhất, export object `api = { method: () => fetch(...) }` | Tập trung toàn bộ lời gọi API 1 nơi, dễ đổi base URL |

**Cấu trúc `web/src/`:**
```
api.ts              ← Tất cả lời gọi fetch tới backend, 1 hàm request<T>() chung xử lý lỗi/parse JSON
types.ts             ← Interface TypeScript khớp với response backend (dùng chung cho cả app)
utils.ts             ← Hàm thuần (format ngày/tiền, tính toán thống kê) — test được độc lập, không phụ thuộc React
App.tsx              ← Component gốc: quản lý state đăng nhập (User/Admin), state tab, render component theo tab
components/          ← Mỗi tab/màn hình = 1 component riêng (AttendanceTab, ExpenseTab, SalaryTab, AdminConfigTab...)
hooks/               ← Custom hook tái dùng (ví dụ useConfirm — thay window.confirm() bằng modal đẹp)
```

**Mẫu thiết kế đáng chú ý:**
- **Phân quyền User/Admin chỉ là 1 boolean ở client (`isAdmin` state)**, ẩn/hiện UI theo điều kiện `{isAdmin && (...)}`. Không có JWT/session phức tạp — phù hợp app nội bộ ít người dùng, không cần bảo mật cấp doanh nghiệp.
- **Cổng mật khẩu PIN** (`AccessGate`, `PasswordModal`) dùng component `PinInput` tái sử dụng (ô vuông nhập từng số, tự nhảy ô tiếp), verify qua API backend (so khớp với giá trị lưu trong DB) — không lưu mật khẩu hardcode trong code.
- **Modal xác nhận tuỳ chỉnh** (`ConfirmModal` + `useConfirm` hook) thay cho `window.confirm()` mặc định của browser — để đồng bộ giao diện, hiện giữa màn hình đẹp hơn popup native.

## 4. Lưu trữ dữ liệu

- **1 file SQLite duy nhất** (`server/database.sqlite`, chế độ WAL) — không cần server database riêng (Postgres/MySQL), không tốn chi phí DB hosting.
- Toàn bộ bảng được định nghĩa trong `db.ts`, tự tạo khi server khởi động lần đầu (không cần bước "tạo database" thủ công khi deploy).
- Backup = copy file `.sqlite` (dừng server hoặc chạy `PRAGMA wal_checkpoint` trước để đảm bảo dữ liệu trong WAL được gộp vào file chính).
- `database.sqlite`, `*.sqlite-shm`, `*.sqlite-wal` đều nằm trong `.gitignore` — không bao giờ commit dữ liệu thật lên Git.

## 5. Build & Deploy

- **Không dùng Docker** — chạy trực tiếp Node.js trên VPS, quản lý qua **PM2** (`pm2 start dist/index.js --name app`, `pm2 startup` để tự chạy lại khi VPS reboot).
- Quy trình build: `cd web && npm install && npm run build` (ra `web/dist`) → `cd server && npm install && npm run build` (`tsc` ra `server/dist`) → `pm2 start server/dist/index.js`.
- Domain + HTTPS: dùng **Nginx làm reverse proxy** (`proxy_pass http://localhost:<port>`) trỏ vào app, **Certbot/Let's Encrypt** cấp SSL miễn phí — Nginx không serve file tĩnh của app (đã có Express lo), chỉ làm cổng vào + SSL termination.
- Không cần biến môi trường phức tạp — cấu hình (mật khẩu, lương...) lưu trong DB, sửa qua giao diện Admin thay vì sửa file `.env` rồi redeploy.

## 6. Khi áp dụng cho project khác

Khung này hợp với app: **ít người dùng (gia đình/team nhỏ), dữ liệu ít, ngân sách hosting thấp, không cần scale ngang.** Nếu project mới có nhiều người dùng đồng thời, cần real-time, hoặc cần scale nhiều server → nên đổi sang Postgres (server DB riêng) thay vì SQLite single-file, và xem xét thêm session/JWT auth thật thay vì PIN đơn giản.
