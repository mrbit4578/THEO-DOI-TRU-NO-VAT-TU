# Export file mẫu & Import dữ liệu

## Export

Trên toolbar chọn **Export…**:

| Mục | Mô tả |
|-----|--------|
| **File mẫu CSV** | Header đúng cột Excel + 2 dòng ví dụ + dòng hướng dẫn |
| **Xuất dữ liệu CSV** | Toàn bộ sheet PHC / NM LAF / NM LVF |
| **Sao lưu JSON** | Backup store (đủ meta, users, sheets) |

File CSV có **UTF-8 BOM** → mở tốt bằng Excel.

## Import

Nút **Import** nhận:

- `.csv` (file mẫu đã điền)
- `.json` (sao lưu store hoặc mảng rows)

Hỏi:

- **OK** = thay thế toàn bộ dữ liệu  
- **Cancel** = gộp thêm vào dữ liệu hiện tại  

Sau import hệ thống **tự tính** K / L / M / AS / AT / AU / SL thực cấp / Ngày thực cấp.

## Cột bắt buộc khi import CSV

- `Sheet` (PHC | NM LAF | NM LVF) — nếu trống coi là PHC  
- `Số phiếu Lefaso`  
- `MÃ VẬT TƯ`  

Khuyến nghị thêm: `Ngày Phiếu`, `Nhà máy`, `QC đóng gói`, `SL hệ thống`, cột `1`…`31` (KÍ theo ngày, **bội số QC**).

## Lưu ý

- Dòng `Sheet=HUONG_DAN` hoặc `Ngày Phiếu=XOA_DONG_NAY` trong file mẫu sẽ **bỏ qua**.  
- Cột 1–31: nhập **số KÍ** (vd QC=35 → 70 hợp lệ, 80 sẽ bị cảnh báo khi sửa trên web).  
- Sau import nhớ **☁ Lưu GitHub** nếu làm việc multi-user.  
