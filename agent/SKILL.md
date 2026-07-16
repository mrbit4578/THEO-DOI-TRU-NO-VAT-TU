---
name: theo-doi-tru-no-vat-tu
description: >
  Agent kiến thức nghiệp vụ THEO DÕI TRỪ NỢ VẬT TƯ (kho ↔ xưởng).
  Dùng khi hỏi về trừ nợ kho, QC đóng gói, cột I/K/L/M/AT/AU,
  số phiếu Lefaso, quét AS lùi nhiều phiếu, web app THEO-DOI-TRU-NO-VAT-TU.
---

# Agent: Theo dõi trừ nợ vật tư

## Bối cảnh

File Excel: theo dõi trừ nợ nhà máy & kho (sheet PHC, NM LAF, NM LVF).
Web app: cùng logic VBA, GitHub Pages, 5 user cập nhật online.

## Cấu trúc cột

| Cột | Ý nghĩa |
|-----|---------|
| E | Số phiếu Lefaso |
| F | Mã vật tư |
| G | Tên vật tư |
| I | QC đóng gói |
| J | SL hệ thống |
| K | SL xưởng nợ kho (AS nguồn ≥ 0) |
| L | SL kho nợ xưởng (AS nguồn < 0 → \|AS\|) |
| M | SL cần lấy |
| AS | Còn tại xưởng = SUM(ngày) − J |
| AT | Nhận xét so QC |
| AU | Số phiếu nguồn chuyển AS |

## Quy tắc

### I — QC
Tra Mã VT trong phiếu/bảng gốc; không có thì quét lùi.

### K/L — quét lùi nhiều phiếu
- Không lấy AS dòng hiện tại.
- Thử phiếu cũ hơn (gần → xa), cùng Mã VT → lấy AS.
- AS>0→K; AS<0→L=\|AS\|; AS=0→OK đóng.

### M
```
có K → M = J − K
có L → M = J + L
không → M = J
```

### AT
- AS=0 → OK đóng
- \|AS\|<I → SL nhỏ hơn QC cấp nguyên
- \|AS\|>I → SL lớn hơn QC tùy ý cấp
- \|AS\|=I → SL bằng QC

### AU
Số phiếu nguồn đã load AS (đúng mã VT + SL đã chuyển).

### Phiếu gốc
Phiếu đầu: không auto K/L/M/AT/AU từ phiếu trước.

## Web

- Local: `Y:\ĐƠN HÀNG 2026\DỰ ÁN NHỎ\THEO-DOI-TRU-NO-VAT-TU`
- Repo: https://github.com/mrbit4578/THEO-DOI-TRU-NO-VAT-TU
- Data: `data/store.json` (GitHub Contents API)
- Logic: `js/logic.js`
