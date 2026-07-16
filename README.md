# Theo dõi trừ nợ vật tư

Web app + Agent nghiệp vụ: **THEO DÕI TRỪ NỢ KHO ↔ XƯỞNG** (logic port từ VBA Excel).

- **Repo:** https://github.com/mrbit4578/THEO-DOI-TRU-NO-VAT-TU  
- **Local:** `Y:\ĐƠN HÀNG 2026\DỰ ÁN NHỎ\THEO-DOI-TRU-NO-VAT-TU`  
- **Agent:** [`agent/SKILL.md`](agent/SKILL.md)

## Tính năng

| Chức năng | Mô tả |
|-----------|--------|
| Auto-fill I | QC theo mã VT (phiếu gốc / quét lùi) |
| Auto-fill K/L | Quét lùi **nhiều số phiếu** lấy AS cùng mã VT |
| Cột M | `J−K` nếu có K · `J+L` nếu có L |
| Cột AT | So \|AS\| với QC |
| Cột AU | Số phiếu nguồn chuyển AS |
| 5 user | Chọn user, ghi `updatedBy` khi lưu |
| GitHub storage | `data/store.json` qua Contents API |

## Chạy local

Mở bằng static server (tránh CORS file://):

```bash
# Node
npx --yes serve -l 5173 .

# hoặc Python
python -m http.server 5173
```

Vào http://localhost:5173

## Deploy online (GitHub Pages)

1. Bật **Settings → Pages → Source: GitHub Actions**
2. Push nhánh `main` (workflow `.github/workflows/pages.yml`)
3. URL dạng:  
   `https://mrbit4578.github.io/THEO-DOI-TRU-NO-VAT-TU/`

## 5 user cập nhật online

1. Tạo **Fine-grained PAT** (hoặc classic) với quyền **Contents: Read and write** trên repo này.
2. Trên web app: bấm **🔑 Token** → dán PAT (lưu localStorage trình duyệt).
3. Mỗi người chọn **User 1…5**, sửa dữ liệu → **☁ Lưu GitHub**.
4. Người khác bấm **⟳ Tải GitHub** để lấy bản mới.

> Nếu hai người lưu cùng lúc có thể **xung đột SHA** — tải lại rồi lưu lại (optimistic locking).

**Bảo mật:** không commit token vào git. Mỗi user giữ PAT riêng hoặc dùng 1 token chung nội bộ (rủi ro chia sẻ).

## Cấu trúc

```
├── index.html
├── css/styles.css
├── js/logic.js          # quy tắc nghiệp vụ
├── js/github-store.js   # GitHub API
├── js/app.js            # UI
├── data/store.json      # bộ nhớ chung
├── agent/SKILL.md       # agent kiến thức
└── .github/workflows/pages.yml
```

## Quy tắc M (quan trọng)

```
có K (AS→K)  →  M = J - K
có L (AS→L)  →  M = J + L
không K/L    →  M = J
```

## License

Internal / private use — mrbit4578
