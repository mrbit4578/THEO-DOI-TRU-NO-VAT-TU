# Hướng dẫn lấy GitHub Token cho 5 user

## Mục đích

Token cho phép web app **đọc/ghi** file `data/store.json` trên repo  
https://github.com/mrbit4578/THEO-DOI-TRU-NO-VAT-TU

---

## Cách 1 — Fine-grained token (khuyến nghị)

1. Đăng nhập [GitHub](https://github.com) → avatar → **Settings**
2. Cuối sidebar: **Developer settings**
3. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
4. **Token name:** `truno-user1` (… user2 → user5)
5. **Expiration:** 30–90 ngày
6. **Repository access:** Only select repositories → chọn `THEO-DOI-TRU-NO-VAT-TU`
7. **Permissions → Contents:** **Read and write**
8. **Generate token** → **copy ngay** (chỉ hiện 1 lần)

Link nhanh: https://github.com/settings/personal-access-tokens/new

---

## Cách 2 — Classic token

1. **Developer settings** → **Tokens (classic)** → **Generate new token (classic)**
2. Tick **`repo`**
3. Generate → copy

Link: https://github.com/settings/tokens

---

## Đưa cho user & dùng trên web

1. Gửi token **riêng** từng người (email/Teams nội bộ — không post group public)
2. User mở web → **🔑 Token** (hoặc **❓ Hướng dẫn Token**)
3. Dán token → **Lưu token**
4. Chọn **User 1…5** → **Tải GitHub** → sửa → **Lưu GitHub**

Token lưu trong **localStorage trình duyệt** máy user.

---

## Bảo mật

| Nên | Không nên |
|-----|-----------|
| 1 token / 1 user | 1 token chia 5 người (khó thu hồi) |
| Revoke khi nghỉ việc | Commit token vào git |
| Fine-grained chỉ 1 repo | Chụp màn hình token lên chat |

---

## Lỗi thường gặp

- **401/403:** Token sai hoặc thiếu quyền Contents Write  
- **409 conflict:** Hai người lưu cùng lúc → **Tải GitHub** rồi lưu lại  
- **Chưa có token:** App vẫn xem/sửa local, không đẩy được lên repo  
