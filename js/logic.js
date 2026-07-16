/**
 * Business logic — port from VBA modAutoFillTruNo
 */
(function (global) {
  const MSG = {
    LT: "SL nhỏ hơn QC cấp nguyên",
    GT: "SL lớn hơn QC tùy ý cấp",
    EQ: "SL bằng QC",
    OK: "OK đóng",
  };

  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function sumDays(row) {
    const days = Array.isArray(row.days) ? row.days : [];
    return days.reduce((s, d) => s + (num(d) || 0), 0);
  }

  function calcAS(row) {
    const j = num(row.J) || 0;
    return sumDays(row) - j;
  }

  /** SL thực cấp = tổng cấp phát các ngày */
  function calcSLThucCap(row) {
    return sumDays(row);
  }

  /**
   * Ngày thực cấp: ngày cuối cùng trong tháng có cấp phát > 0
   * format YYYY-MM-DD theo month/year (meta)
   */
  function calcNgayThucCap(row, month, year) {
    const days = Array.isArray(row.days) ? row.days : [];
    let last = 0;
    for (let i = 0; i < days.length; i++) {
      if ((num(days[i]) || 0) > 0) last = i + 1;
    }
    if (!last) return "";
    const m = Number(month) || 1;
    const y = Number(year) || new Date().getFullYear();
    const mm = String(m).padStart(2, "0");
    const dd = String(last).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  /** Danh sách ngày có cấp (1..31) */
  function daysIssuedList(row) {
    const days = Array.isArray(row.days) ? row.days : [];
    const out = [];
    for (let i = 0; i < days.length; i++) {
      if ((num(days[i]) || 0) > 0) out.push(i + 1);
    }
    return out;
  }

  /** Catalog vật tư từ nhiều sheet: { ma, ten, qc, dvt } */
  function buildMaterialCatalog(sheetsOrRows) {
    const map = new Map();
    const pushRow = (r) => {
      const ma = String(r.F || "").trim();
      if (!ma) return;
      const ten = String(r.G || "").trim();
      const qc = num(r.I);
      const dvt = String(r.H || "").trim();
      const prev = map.get(ma) || { ma, ten: "", qc: null, dvt: "KÍ" };
      if (ten) prev.ten = ten;
      if (qc !== null) prev.qc = qc;
      if (dvt) prev.dvt = dvt;
      map.set(ma, prev);
    };
    if (Array.isArray(sheetsOrRows)) {
      sheetsOrRows.forEach(pushRow);
    } else if (sheetsOrRows && typeof sheetsOrRows === "object") {
      Object.values(sheetsOrRows).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach(pushRow);
      });
    }
    return Array.from(map.values()).sort((a, b) => a.ma.localeCompare(b.ma));
  }

  function searchMaterials(catalog, query, limit = 20) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return catalog.slice(0, limit);
    return catalog
      .filter(
        (m) =>
          m.ma.toLowerCase().includes(q) ||
          String(m.ten || "").toLowerCase().includes(q)
      )
      .slice(0, limit);
  }

  /** Làm tròn số kiện nguyên; SL = kiện * QC */
  function packagesToQty(packages, qc) {
    const p = Math.max(0, Math.round(num(packages) || 0));
    const q = num(qc);
    if (!q || q <= 0) return p; // không có QC thì coi input là SL thô
    return p * q;
  }

  function qtyToPackages(qty, qc) {
    const q = num(qc);
    const v = num(qty) || 0;
    if (!q || q <= 0) return v;
    return Math.round(v / q);
  }

  function voucherOrder(rows) {
    const seen = [];
    const set = new Set();
    for (const r of rows) {
      const e = String(r.E || "").trim();
      if (!e || set.has(e)) continue;
      set.add(e);
      seen.push(e);
    }
    return seen;
  }

  function firstVoucher(rows) {
    return voucherOrder(rows)[0] || "";
  }

  function lookupQC(rows, ma, beforeIndex) {
    const maS = String(ma || "").trim();
    const first = firstVoucher(rows);
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i].E || "").trim() !== first) continue;
      if (String(rows[i].F || "").trim() === maS) {
        const q = num(rows[i].I_manual ?? rows[i].I);
        if (q !== null) return q;
      }
    }
    for (let i = Math.min(beforeIndex - 1, rows.length - 1); i >= 0; i--) {
      if (String(rows[i].F || "").trim() !== maS) continue;
      const q = num(rows[i].I_manual ?? rows[i].I);
      if (q !== null) return q;
    }
    return null;
  }

  function findASScanBack(rows, ma, curPhieu, curIndex) {
    const maS = String(ma || "").trim();
    const cur = String(curPhieu || "").trim();
    const order = [];
    const seen = new Set();
    for (let i = curIndex - 1; i >= 0; i--) {
      const p = String(rows[i].E || "").trim();
      if (!p || p === cur) continue;
      if (!seen.has(p)) {
        seen.add(p);
        order.push(p);
      }
    }
    for (const p of order) {
      for (let i = curIndex - 1; i >= 0; i--) {
        if (String(rows[i].E || "").trim() !== p) continue;
        if (String(rows[i].F || "").trim() !== maS) continue;
        const as = calcAS(rows[i]);
        return { as, srcPhieu: p, srcIndex: i, srcRow: rows[i] };
      }
    }
    return { as: null, srcPhieu: "", srcIndex: -1, srcRow: null };
  }

  function atMessage(asPrev, qc) {
    if (asPrev === null || asPrev === undefined) return "";
    if (Math.abs(asPrev) < 1e-12) return MSG.OK;
    if (qc === null || qc === undefined) return "";
    const a = Math.abs(asPrev);
    const i = Number(qc);
    if (a < i) return MSG.LT;
    if (a > i) return MSG.GT;
    return MSG.EQ;
  }

  function autoFill(rowsIn, opts) {
    const month = opts && opts.month;
    const year = opts && opts.year;
    const rows = rowsIn.map((r) => ({ ...r, days: [...(r.days || [])] }));
    for (const r of rows) {
      r.AS = calcAS(r);
      r.SL_thuc_cap = calcSLThucCap(r);
      r.Ngay_thuc_cap = calcNgayThucCap(r, month, year);
    }

    const first = firstVoucher(rows);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const ma = String(r.F || "").trim();
      const ph = String(r.E || "").trim();
      if (!ma || !ph) continue;

      r.AS = calcAS(r);
      r.SL_thuc_cap = calcSLThucCap(r);
      r.Ngay_thuc_cap = calcNgayThucCap(r, month, year);

      if (ph === first) {
        r.K = null;
        r.L = null;
        r.M = num(r.J) || 0;
        r.AT = "";
        r.AU = "";
        r._auto = false;
        continue;
      }

      const qc = lookupQC(rows, ma, i);
      if (qc !== null) r.I = qc;

      const found = findASScanBack(rows, ma, ph, i);
      r.K = null;
      r.L = null;
      r.AT = "";
      r.AU = "";

      if (found.as !== null && found.as !== undefined) {
        const asPrev = found.as;
        if (Math.abs(asPrev) < 1e-12) {
          r.AT = MSG.OK;
          r.AU = found.srcPhieu || "";
        } else if (asPrev > 0) {
          r.K = asPrev;
          r.AU = found.srcPhieu || "";
          r.AT = atMessage(asPrev, r.I);
        } else {
          r.L = Math.abs(asPrev);
          r.AU = found.srcPhieu || "";
          r.AT = atMessage(asPrev, r.I);
        }
        r._srcIndex = found.srcIndex;
      }

      const j = num(r.J) || 0;
      if (r.K !== null && r.K !== undefined && r.K !== "") {
        r.M = j - Number(r.K);
      } else if (r.L !== null && r.L !== undefined && r.L !== "") {
        r.M = j + Number(r.L);
      } else {
        r.M = j;
      }
      r._auto = true;
    }
    return rows;
  }

  function cryptoRandomId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function newRow(partial = {}) {
    return {
      id: partial.id || cryptoRandomId(),
      A: partial.A || new Date().toISOString().slice(0, 10),
      B: partial.B || "",
      C: partial.C || "",
      D: partial.D || "PHC",
      E: partial.E || "",
      F: partial.F || "",
      G: partial.G || "",
      H: partial.H || "KÍ",
      I: partial.I ?? null,
      J: partial.J ?? 0,
      K: null,
      L: null,
      M: null,
      days: partial.days || [],
      AS: null,
      SL_thuc_cap: null,
      Ngay_thuc_cap: "",
      AT: "",
      AU: "",
      note: partial.note || "",
      updatedBy: partial.updatedBy || "",
      updatedAt: partial.updatedAt || "",
    };
  }

  function sampleData() {
    const rows = [
      newRow({
        E: "OI2601482",
        F: "009701",
        G: "BÁT MÀU RB-0193A (ADIDAS)",
        I: 25,
        J: 0.04,
        days: [],
      }),
      newRow({
        E: "OI2601482",
        F: "009185",
        G: "Cao su [SBR-1502] ADIDAS",
        I: 35,
        J: 1167,
        days: [1190],
      }),
      newRow({
        E: "OI2601482",
        F: "009200",
        G: "CHẤT TRỢ PHÂN TÁN FS-302 ADIDAS",
        I: 25,
        J: 6.6,
        days: [25],
      }),
      newRow({
        E: "OI2602483",
        F: "009701",
        G: "BÁT MÀU RB-0193A (ADIDAS)",
        J: 0.09,
        days: [],
      }),
      newRow({
        E: "OI2602483",
        F: "009185",
        G: "Cao su [SBR-1502] ADIDAS",
        J: 145.63,
        days: [],
      }),
      newRow({
        E: "OI2602489",
        F: "009200",
        G: "CHẤT TRỢ PHÂN TÁN FS-302 ADIDAS",
        J: 10,
        days: [],
      }),
    ];
    return autoFill(rows);
  }

  global.TruNoLogic = {
    MSG,
    num,
    calcAS,
    sumDays,
    calcSLThucCap,
    calcNgayThucCap,
    daysIssuedList,
    buildMaterialCatalog,
    searchMaterials,
    packagesToQty,
    qtyToPackages,
    autoFill,
    newRow,
    sampleData,
    lookupQC,
    findASScanBack,
    voucherOrder,
    firstVoucher,
  };
})(typeof window !== "undefined" ? window : globalThis);
