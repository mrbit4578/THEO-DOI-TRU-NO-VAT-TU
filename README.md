# THEO DÕI TRỪ NỢ NHÀ MÀY & KHO

Web app layout **giống file Excel**, tiêu đề cột **giữ nguyên**, tương tác tối ưu hơn.

- **Repo:** https://github.com/mrbit4578/THEO-DOI-TRU-NO-VAT-TU  
- **Local:** `E:\01-Grok-2026\projects\THEO-DOI-TRU-NO-VAT-TU`  
- **Agent:** [`agent/SKILL.md`](agent/SKILL.md)  
- **Token 5 user:** [`docs/HUONG-DAN-TOKEN-GITHUB.md`](docs/HUONG-DAN-TOKEN-GITHUB.md)

## Tiêu đề cột (đúng Excel)

| Cột | Tiêu đề |
|-----|---------|
| A | Ngày Phiếu |
| B | Chỉ thị |
| C | Code Màu đơn hàng |
| D | Nhà máy |
| E | Số phiếu Lefaso |
| F | MÃ VẬT TƯ |
| G | TÊN VẬT TƯ |
| H | ĐVT |
| I | QC đóng gói |
| J | SL hệ thống |
| K | SL xưởng nợ kho |
| L | SL kho nợ xưởng |
| M | SL cần lấy |
| 1…31 | Chi tiết từng ngày cấp phát… |
| AS | SL Thừa/Thiếu |
| AT | SL còn lại so với QC đóng gói |
| AU | So phieu nguon chuyen qua |

## UX

- Ribbon xanh kiểu Excel + sheet tabs **PHC / NM LAF / NM LVF**
- Sửa **trực tiếp trên lưới** (Enter để lưu ô)
- Form **Thêm dòng** (drawer)
- Lọc theo phiếu / mã / tên
- Chọn **Tháng / Năm**
- Auto: I, K/L (quét lùi nhiều phiếu), M (J−K / J+L), AT, AU
- 5 user + **Lưu/Tải GitHub** (`data/store.json`)

## Chạy local

```bash
cd E:\01-Grok-2026\projects\THEO-DOI-TRU-NO-VAT-TU
npx --yes serve -l 5173 .
```

## GitHub Pages

Settings → Pages → **GitHub Actions**  
URL: `https://mrbit4578.github.io/THEO-DOI-TRU-NO-VAT-TU/`

## Token cho user

1. Tạo Fine-grained PAT: Contents **Read and write** trên repo này  
2. User: web → **🔑 Token** → dán → Lưu  
3. Chi tiết từng bước: [docs/HUONG-DAN-TOKEN-GITHUB.md](docs/HUONG-DAN-TOKEN-GITHUB.md)  
   (trong app: nút **❓ Hướng dẫn Token**)
