/**
 * Export file mẫu + Import/Export dữ liệu (CSV UTF-8 BOM mở được Excel)
 */
(function (global) {
  /** Thứ tự cột file mẫu / import — tiêu đề giữ đúng nghiệp vụ Excel */
  const BASE_HEADERS = [
    "Sheet",
    "Ngày Phiếu",
    "Chỉ thị",
    "Code Màu đơn hàng",
    "Nhà máy",
    "Số phiếu Lefaso",
    "MÃ VẬT TƯ",
    "TÊN VẬT TƯ",
    "ĐVT",
    "QC đóng gói",
    "SL hệ thống",
  ];
  const DAY_HEADERS = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const TAIL_HEADERS = [
    "SL xưởng nợ kho",
    "SL kho nợ xưởng",
    "SL cần lấy",
    "SL Thừa/Thiếu",
    "SL thực cấp",
    "Ngày thực cấp",
    "SL còn lại so với QC đóng gói",
    "So phieu nguon chuyen qua",
  ];
  const ALL_HEADERS = [...BASE_HEADERS, ...DAY_HEADERS, ...TAIL_HEADERS];

  // alias map for flexible import
  const ALIAS = {
    sheet: "Sheet",
    "ngày phiếu": "Ngày Phiếu",
    ngayphieu: "Ngày Phiếu",
    "chỉ thị": "Chỉ thị",
    "code màu đơn hàng": "Code Màu đơn hàng",
    "nhà máy": "Nhà máy",
    "số phiếu lefaso": "Số phiếu Lefaso",
    sophieu: "Số phiếu Lefaso",
    "mã vật tư": "MÃ VẬT TƯ",
    mavattu: "MÃ VẬT TƯ",
    "tên vật tư": "TÊN VẬT TƯ",
    tenvattu: "TÊN VẬT TƯ",
    đvt: "ĐVT",
    dvt: "ĐVT",
    "qc đóng gói": "QC đóng gói",
    "sl hệ thống": "SL hệ thống",
    "sl xưởng nợ kho": "SL xưởng nợ kho",
    "sl kho nợ xưởng": "SL kho nợ xưởng",
    "sl cần lấy": "SL cần lấy",
    "sl thừa/thiếu": "SL Thừa/Thiếu",
    "sl thực cấp": "SL thực cấp",
    "ngày thực cấp": "Ngày thực cấp",
    "sl còn lại so với qc đóng gói": "SL còn lại so với QC đóng gói",
    "so phieu nguon chuyen qua": "So phieu nguon chuyen qua",
  };

  function normHeader(h) {
    const s = String(h || "")
      .replace(/^\uFEFF/, "")
      .trim();
    if (!s) return "";
    // day columns 1-31
    if (/^\d{1,2}$/.test(s)) {
      const n = Number(s);
      if (n >= 1 && n <= 31) return String(n);
    }
    const key = s.toLowerCase().normalize("NFC");
    if (ALIAS[key]) return ALIAS[key];
    // exact match ignore case against ALL_HEADERS
    const found = ALL_HEADERS.find((x) => x.toLowerCase() === key);
    return found || s;
  }

  function csvEscape(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function toCsv(rows) {
    const lines = [ALL_HEADERS.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push(ALL_HEADERS.map((h) => csvEscape(r[h])).join(","));
    }
    // UTF-8 BOM for Excel
    return "\uFEFF" + lines.join("\r\n");
  }

  function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function downloadText(filename, text, mime) {
    downloadBlob(filename, new Blob([text], { type: mime || "text/csv;charset=utf-8" }));
  }

  function rowToExport(sheetName, r) {
    const o = {
      Sheet: sheetName,
      "Ngày Phiếu": r.A || "",
      "Chỉ thị": r.B || "",
      "Code Màu đơn hàng": r.C || "",
      "Nhà máy": r.D || "",
      "Số phiếu Lefaso": r.E || "",
      "MÃ VẬT TƯ": r.F || "",
      "TÊN VẬT TƯ": r.G || "",
      ĐVT: r.H || "",
      "QC đóng gói": r.I ?? "",
      "SL hệ thống": r.J ?? "",
      "SL xưởng nợ kho": r.K ?? "",
      "SL kho nợ xưởng": r.L ?? "",
      "SL cần lấy": r.M ?? "",
      "SL Thừa/Thiếu": r.AS ?? "",
      "SL thực cấp": r.SL_thuc_cap ?? "",
      "Ngày thực cấp": r.Ngay_thuc_cap || "",
      "SL còn lại so với QC đóng gói": r.AT || "",
      "So phieu nguon chuyen qua": r.AU || "",
    };
    const days = Array.isArray(r.days) ? r.days : [];
    for (let i = 0; i < 31; i++) {
      o[String(i + 1)] = days[i] ?? "";
    }
    return o;
  }

  /** File mẫu: header + 2 dòng hướng dẫn / ví dụ trống */
  function buildTemplateRows() {
    const blank = () => {
      const o = {};
      ALL_HEADERS.forEach((h) => (o[h] = ""));
      return o;
    };
    const ex1 = blank();
    ex1.Sheet = "PHC";
    ex1["Ngày Phiếu"] = "2026-07-01";
    ex1["Nhà máy"] = "PHC";
    ex1["Số phiếu Lefaso"] = "OI2601482";
    ex1["MÃ VẬT TƯ"] = "009200";
    ex1["TÊN VẬT TƯ"] = "CHẤT TRỢ PHÂN TÁN FS-302 ADIDAS";
    ex1.ĐVT = "KÍ";
    ex1["QC đóng gói"] = 25;
    ex1["SL hệ thống"] = 6.6;
    ex1["1"] = 25; // bội QC

    const ex2 = blank();
    ex2.Sheet = "PHC";
    ex2["Ngày Phiếu"] = "2026-07-18";
    ex2["Nhà máy"] = "PHC";
    ex2["Số phiếu Lefaso"] = "OI2602483";
    ex2["MÃ VẬT TƯ"] = "009200";
    ex2["TÊN VẬT TƯ"] = "CHẤT TRỢ PHÂN TÁN FS-302 ADIDAS";
    ex2.ĐVT = "KÍ";
    ex2["QC đóng gói"] = 25;
    ex2["SL hệ thống"] = 10;
    // K/L/M/AT/AU hệ thống tự tính sau import

    const note = blank();
    note.Sheet = "HUONG_DAN";
    note["Ngày Phiếu"] = "XOA_DONG_NAY";
    note["Chỉ thị"] = "Nhập Sheet=PHC|NM LAF|NM LVF. Cột 1-31 = KÍ cấp theo ngày (bội QC).";
    note["MÃ VẬT TƯ"] = "Bat_buoc";
    note["Số phiếu Lefaso"] = "Bat_buoc";

    return [ex1, ex2, note];
  }

  function exportTemplate() {
    const csv = toCsv(buildTemplateRows());
    const name = `MAU_NHAP_TRU_NO_VAT_TU_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(name, csv);
    return name;
  }

  function exportDataCsv(store) {
    const rows = [];
    const sheets = store.sheets || {};
    for (const [sheetName, arr] of Object.entries(sheets)) {
      if (!Array.isArray(arr)) continue;
      for (const r of arr) rows.push(rowToExport(sheetName, r));
    }
    const csv = toCsv(rows);
    const name = `DU_LIEU_TRU_NO_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(name, csv);
    return { name, count: rows.length };
  }

  function exportDataJson(store) {
    const name = `DU_LIEU_TRU_NO_${new Date().toISOString().slice(0, 10)}.json`;
    downloadText(name, JSON.stringify(store, null, 2), "application/json;charset=utf-8");
    return name;
  }

  /** CSV parser đơn giản (hỗ trợ quote) */
  function parseCsv(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let i = 0;
    let field = "";
    let row = [];
    let inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQ = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      field += c;
      i++;
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
  }

  function csvToObjects(text) {
    const matrix = parseCsv(text);
    if (!matrix.length) return [];
    const headers = matrix[0].map(normHeader);
    const out = [];
    for (let r = 1; r < matrix.length; r++) {
      const line = matrix[r];
      const obj = {};
      headers.forEach((h, c) => {
        if (!h) return;
        obj[h] = line[c] !== undefined ? line[c] : "";
      });
      out.push(obj);
    }
    return out;
  }

  function numOrNull(v) {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function parseDateCell(v) {
    if (v == null || String(v).trim() === "") return "";
    const s = String(v).trim();
    // Excel serial?
    if (/^\d+(\.\d+)?$/.test(s)) {
      const serial = Number(s);
      if (serial > 20000 && serial < 80000) {
        const utc = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        return utc.toISOString().slice(0, 10);
      }
    }
    // DD/MM/YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  }

  function objectToRow(obj, newRowFn) {
    const sheet = String(obj.Sheet || obj.sheet || "PHC").trim() || "PHC";
    if (sheet === "HUONG_DAN" || String(obj["Ngày Phiếu"] || "").includes("XOA_DONG")) {
      return null;
    }
    const days = Array(31).fill(null);
    for (let d = 1; d <= 31; d++) {
      const v = numOrNull(obj[String(d)]);
      days[d - 1] = v;
    }
    const row = newRowFn({
      A: parseDateCell(obj["Ngày Phiếu"]),
      B: obj["Chỉ thị"] || "",
      C: obj["Code Màu đơn hàng"] || "",
      D: obj["Nhà máy"] || (sheet === "PHC" ? "PHC" : sheet.replace("NM ", "")),
      E: String(obj["Số phiếu Lefaso"] || "").trim(),
      F: String(obj["MÃ VẬT TƯ"] || "").trim(),
      G: obj["TÊN VẬT TƯ"] || "",
      H: obj["ĐVT"] || "KÍ",
      I: numOrNull(obj["QC đóng gói"]),
      J: numOrNull(obj["SL hệ thống"]) ?? 0,
      days,
    });
    if (!row.E || !row.F) return null;
    return { sheet, row };
  }

  /**
   * Import text file → { sheets, count, skipped, mode }
   * mode: replace | merge
   */
  function importText(text, filename, newRowFn, mode) {
    const name = String(filename || "").toLowerCase();
    let objects = [];

    if (name.endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      const data = JSON.parse(text);
      if (data && data.sheets) {
        return { type: "store", store: data, count: null };
      }
      if (Array.isArray(data)) {
        objects = data.map((r) => {
          // support raw row objects or export-shaped
          if (r.F || r.E) {
            return {
              Sheet: r.D === "LAF" ? "NM LAF" : r.D === "LVF" ? "NM LVF" : "PHC",
              "Ngày Phiếu": r.A,
              "Chỉ thị": r.B,
              "Code Màu đơn hàng": r.C,
              "Nhà máy": r.D,
              "Số phiếu Lefaso": r.E,
              "MÃ VẬT TƯ": r.F,
              "TÊN VẬT TƯ": r.G,
              ĐVT: r.H,
              "QC đóng gói": r.I,
              "SL hệ thống": r.J,
              ...Object.fromEntries((r.days || []).map((v, i) => [String(i + 1), v])),
            };
          }
          return r;
        });
      } else if (data && Array.isArray(data.rows)) {
        objects = data.rows.map((r) => ({
          Sheet: "PHC",
          "Ngày Phiếu": r.A,
          "Số phiếu Lefaso": r.E,
          "MÃ VẬT TƯ": r.F,
          "TÊN VẬT TƯ": r.G,
          "QC đóng gói": r.I,
          "SL hệ thống": r.J,
          ...Object.fromEntries((r.days || []).map((v, i) => [String(i + 1), v])),
        }));
      } else {
        throw new Error("JSON không đúng định dạng store/rows");
      }
    } else {
      objects = csvToObjects(text);
    }

    const sheets = { PHC: [], "NM LAF": [], "NM LVF": [] };
    let count = 0;
    let skipped = 0;
    for (const obj of objects) {
      const parsed = objectToRow(obj, newRowFn);
      if (!parsed) {
        skipped++;
        continue;
      }
      let sn = parsed.sheet;
      if (sn === "LAF") sn = "NM LAF";
      if (sn === "LVF") sn = "NM LVF";
      if (!sheets[sn]) sn = "PHC";
      sheets[sn].push(parsed.row);
      count++;
    }
    return { type: "sheets", sheets, count, skipped, mode: mode || "replace" };
  }

  /** ===== Danh mục vật tư (Mã / Tên / QC / ĐVT) ===== */
  const MAT_HEADERS = ["MÃ VẬT TƯ", "TÊN VẬT TƯ", "QC đóng gói", "ĐVT"];

  function exportMaterialTemplate() {
    const rows = [
      {
        "MÃ VẬT TƯ": "009200",
        "TÊN VẬT TƯ": "CHẤT TRỢ PHÂN TÁN FS-302 ADIDAS",
        "QC đóng gói": 25,
        ĐVT: "KÍ",
      },
      {
        "MÃ VẬT TƯ": "009185",
        "TÊN VẬT TƯ": "Cao su [SBR-1502] ADIDAS",
        "QC đóng gói": 35,
        ĐVT: "KÍ",
      },
      {
        "MÃ VẬT TƯ": "",
        "TÊN VẬT TƯ": "(Xóa dòng mẫu — chỉ giữ header + data thật)",
        "QC đóng gói": "",
        ĐVT: "",
      },
    ];
    const lines = [MAT_HEADERS.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push(MAT_HEADERS.map((h) => csvEscape(r[h])).join(","));
    }
    const name = `MAU_DANH_MUC_VAT_TU_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(name, "\uFEFF" + lines.join("\r\n"));
    return name;
  }

  function exportMaterialsCsv(materials) {
    const list = Array.isArray(materials) ? materials : [];
    const lines = [MAT_HEADERS.map(csvEscape).join(",")];
    for (const m of list) {
      const o = {
        "MÃ VẬT TƯ": m.ma || m.F || "",
        "TÊN VẬT TƯ": m.ten || m.G || "",
        "QC đóng gói": m.qc != null ? m.qc : m.I != null ? m.I : "",
        ĐVT: m.dvt || m.H || "KÍ",
      };
      lines.push(MAT_HEADERS.map((h) => csvEscape(o[h])).join(","));
    }
    const name = `DANH_MUC_VAT_TU_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadText(name, "\uFEFF" + lines.join("\r\n"));
    return { name, count: list.length };
  }

  function importMaterialsText(text, filename) {
    const name = String(filename || "").toLowerCase();
    let objects = [];

    if (name.endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
      const data = JSON.parse(text);
      if (Array.isArray(data)) objects = data;
      else if (Array.isArray(data.materials)) objects = data.materials;
      else throw new Error("JSON danh mục không hợp lệ (cần mảng hoặc { materials: [] })");
    } else {
      objects = csvToObjects(text);
    }

    const map = new Map();
    let skipped = 0;
    for (const obj of objects) {
      // support both header keys and raw {ma,ten,qc}
      const ma = String(
        obj["MÃ VẬT TƯ"] || obj.ma || obj.F || obj.Ma || obj["Ma vat tu"] || ""
      ).trim();
      if (!ma || ma.includes("Xóa") || ma.includes("xoa")) {
        skipped++;
        continue;
      }
      const ten = String(obj["TÊN VẬT TƯ"] || obj.ten || obj.G || obj.Ten || "").trim();
      const qc = numOrNull(obj["QC đóng gói"] ?? obj.qc ?? obj.I ?? obj.QC);
      const dvt = String(obj["ĐVT"] || obj.dvt || obj.H || "KÍ").trim() || "KÍ";
      map.set(ma, { ma, ten, qc, dvt });
    }
    return { materials: Array.from(map.values()), count: map.size, skipped };
  }

  global.TruNoIO = {
    ALL_HEADERS,
    MAT_HEADERS,
    exportTemplate,
    exportDataCsv,
    exportDataJson,
    importText,
    rowToExport,
    exportMaterialTemplate,
    exportMaterialsCsv,
    importMaterialsText,
  };
})(typeof window !== "undefined" ? window : globalThis);
