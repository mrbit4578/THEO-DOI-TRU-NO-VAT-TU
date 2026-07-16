# Hướng dẫn triển khai online

## 1. Bật GitHub Pages

1. Vào https://github.com/mrbit4578/THEO-DOI-TRU-NO-VAT-TU/settings/pages  
2. **Build and deployment** → Source: **GitHub Actions**  
3. Sau khi push `main`, workflow `Deploy GitHub Pages` chạy.  
4. URL: `https://mrbit4578.github.io/THEO-DOI-TRU-NO-VAT-TU/`

## 2. Token cho 5 user (lưu dữ liệu)

1. GitHub → Settings → Developer settings → Personal access tokens  
2. Classic: scope `repo`  
   hoặc Fine-grained: **Contents: Read and write** trên repo này  
3. Mỗi user mở web → **🔑 Token** → dán PAT  
4. **☁ Lưu GitHub** ghi vào `data/store.json`

## 3. Quy trình làm việc

1. Chọn User 1…5  
2. **⟳ Tải GitHub** (lấy bản mới)  
3. Thêm/sửa dòng → **Σ Tính lại**  
4. **☁ Lưu GitHub**  
5. Nếu lỗi conflict: Tải lại → sửa → Lưu lại  

## 4. Agent

File `agent/SKILL.md` — toàn bộ quy tắc I/K/L/M/AT/AU.
