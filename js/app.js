/* global TruNoLogic, GitHubStore */
(function () {
  /** Exact Excel headers (row 2) — do not rename */
  const COLS = [
    { key: "A", title: "Ngày Phiếu", w: 100, type: "date" },
    { key: "B", title: "Chỉ thị", w: 80, type: "text" },
    { key: "C", title: "Code Màu đơn hàng", w: 130, type: "text" },
    { key: "D", title: "Nhà máy", w: 70, type: "text" },
    { key: "E", title: "Số phiếu Lefaso", w: 110, type: "text" },
    { key: "F", title: "MÃ VẬT TƯ", w: 90, type: "text" },
    { key: "G", title: "TÊN VẬT TƯ", w: 220, type: "text" },
    { key: "H", title: "ĐVT", w: 50, type: "text" },
    { key: "I", title: "QC đóng gói", w: 80, type: "num", yellow: true },
    { key: "J", title: "SL hệ thống", w: 90, type: "num" },
    { key: "K", title: "SL xưởng nợ kho", w: 100, type: "num", yellow: true },
    { key: "L", title: "SL kho nợ xưởng", w: 100, type: "num", yellow: true },
    { key: "M", title: "SL cần lấy", w: 90, type: "num" },
  ];
  // Days 1..31 → N..AR (titles "1".."31" like Excel formulas =1..31)
  const DAY_COLS = Array.from({ length: 31 }, (_, i) => ({
    key: "d" + (i + 1),
    title: String(i + 1),
    w: 42,
    type: "num",
    dayIndex: i,
  }));
  const TAIL = [
    { key: "AS", title: "SL Thừa/Thiếu", w: 100, type: "num" },
    { key: "AT", title: "SL còn lại so với QC đóng gói", w: 160, type: "text", orange: true },
    { key: "AU", title: "So phieu nguon chuyen qua", w: 140, type: "text", cyan: true },
  ];

  const SHEETS = ["PHC", "NM LAF", "NM LVF"];

  const storeApi = new GitHubStore();
  storeApi.loadCfgFromStorage();

  const state = {
    userId: localStorage.getItem("truno_user") || "u1",
    sheet: localStorage.getItem("truno_sheet") || "PHC",
    month: Number(localStorage.getItem("truno_month") || 7),
    year: Number(localStorage.getItem("truno_year") || 2026),
    selectedId: null,
    store: emptyStore(),
    filter: "",
  };

  function emptyStore() {
    return {
      version: 2,
      users: [
        { id: "u1", name: "User 1", role: "editor" },
        { id: "u2", name: "User 2", role: "editor" },
        { id: "u3", name: "User 3", role: "editor" },
        { id: "u4", name: "User 4", role: "editor" },
        { id: "u5", name: "User 5", role: "editor" },
      ],
      meta: {
        title: "THEO DÕI TRỪ NỢ NHÀ MÀY & KHO",
        month: 7,
        year: 2026,
        updatedAt: "",
        updatedBy: "",
      },
      sheets: { PHC: [], "NM LAF": [], "NM LVF": [] },
    };
  }

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  function currentUser() {
    return state.store.users.find((u) => u.id === state.userId) || state.store.users[0];
  }

  function rowsOfSheet() {
    if (!state.store.sheets) state.store.sheets = { PHC: [], "NM LAF": [], "NM LVF": [] };
    if (!state.store.sheets[state.sheet]) state.store.sheets[state.sheet] = [];
    return state.store.sheets[state.sheet];
  }

  function setStatus(msg, type = "info") {
    const el = $("#statusMsg");
    el.textContent = msg;
    el.className = type;
  }

  function fmt(n) {
    if (n === null || n === undefined || n === "") return "";
    const x = Number(n);
    if (!Number.isFinite(x)) return "";
    return Number.isInteger(x) ? String(x) : String(Math.round(x * 10000) / 10000);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Normalize store from v1 (rows[]) → v2 (sheets) */
  function normalizeStore(data) {
    const base = emptyStore();
    if (!data) return base;
    const out = {
      ...base,
      ...data,
      users: data.users?.length ? data.users : base.users,
      meta: { ...base.meta, ...(data.meta || {}) },
      sheets: { PHC: [], "NM LAF": [], "NM LVF": [] },
    };
    if (data.sheets) {
      for (const s of SHEETS) out.sheets[s] = Array.isArray(data.sheets[s]) ? data.sheets[s] : [];
    } else if (Array.isArray(data.rows)) {
      out.sheets.PHC = data.rows;
    }
    state.month = out.meta.month || state.month;
    state.year = out.meta.year || state.year;
    return out;
  }

  function recomputeSheet() {
    const rows = rowsOfSheet();
    state.store.sheets[state.sheet] = TruNoLogic.autoFill(rows);
  }

  function recomputeAll() {
    for (const s of SHEETS) {
      const rows = state.store.sheets[s] || [];
      state.store.sheets[s] = TruNoLogic.autoFill(rows);
    }
  }

  function renderUsers() {
    $("#userSelect").innerHTML = state.store.users
      .map((u) => `<option value="${u.id}" ${u.id === state.userId ? "selected" : ""}>${escapeHtml(u.name)}</option>`)
      .join("");
  }

  function renderTabs() {
    $$(".sheet-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.sheet === state.sheet);
    });
  }

  function renderMeta() {
    $("#metaMonth").value = state.month;
    $("#metaYear").value = state.year;
    $("#metaUpdated").textContent = state.store.meta.updatedBy
      ? `${state.store.meta.updatedBy} · ${state.store.meta.updatedAt || ""}`
      : "—";
    $("#tokenHint").textContent = storeApi.token ? "Token: đã cấu hình" : "Token: chưa có";
    const n = rowsOfSheet().length;
    $("#metaCount").textContent = `${n} dòng · sheet ${state.sheet}`;
  }

  function filteredRows() {
    const q = state.filter.trim().toLowerCase();
    const rows = rowsOfSheet();
    if (!q) return rows.map((r, i) => ({ r, i }));
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        [r.E, r.F, r.G, r.C, r.D, r.AU, r.AT].some((x) => String(x || "").toLowerCase().includes(q))
      );
  }

  function renderTable() {
    const thead = $("#gridHead");
    const tbody = $("#gridBody");

    // Header: group row + column titles (exact Excel names)
    const daySpan = DAY_COLS.length;
    thead.innerHTML = `
      <tr class="group">
        <th class="row-num" rowspan="2">#</th>
        <th colspan="${COLS.length}" style="text-align:left;padding-left:8px">Thông tin phiếu / vật tư</th>
        <th colspan="${daySpan}">Chi tiết từng ngày cấp phát thực tế kho &amp; xưởng giao nhận</th>
        <th colspan="${TAIL.length}">Kết quả trừ nợ</th>
        <th rowspan="2" style="min-width:70px">Thao tác</th>
      </tr>
      <tr class="cols">
        ${COLS.map((c, idx) => {
          const freeze =
            idx === 0 ? "col-freeze-2" : idx === 1 ? "" : "";
          // freeze A (date) after row num — keep simple: freeze E,F via class on body only for first few
          return `<th style="min-width:${c.w}px" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</th>`;
        }).join("")}
        ${DAY_COLS.map((c) => `<th style="min-width:${c.w}px">${escapeHtml(c.title)}</th>`).join("")}
        ${TAIL.map((c) => `<th style="min-width:${c.w}px" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</th>`).join("")}
      </tr>`;

    const list = filteredRows();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="${COLS.length + DAY_COLS.length + TAIL.length + 2}" style="text-align:center;padding:28px;color:#78909c">
        Chưa có dữ liệu. Bấm <b>+ Thêm dòng</b>, <b>Demo</b> hoặc <b>Tải GitHub</b>.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map(({ r, i }) => {
        const sel = r.id === state.selectedId ? "selected" : "";
        const days = Array.isArray(r.days) ? r.days : [];
        const dayCells = DAY_COLS.map((dc) => {
          const v = days[dc.dayIndex];
          return `<td class="cell-num cell-input-wrap" data-id="${r.id}" data-field="day" data-day="${dc.dayIndex}">
            <input class="cell-input cell-num" value="${fmt(v)}" data-id="${r.id}" data-day="${dc.dayIndex}" /></td>`;
        }).join("");

        return `<tr class="${sel}" data-id="${r.id}">
          <td class="row-num">${i + 1}</td>
          <td class="col-freeze-2"><input class="cell-input" data-id="${r.id}" data-field="A" value="${escapeHtml(r.A || "")}" /></td>
          <td><input class="cell-input" data-id="${r.id}" data-field="B" value="${escapeHtml(r.B || "")}" /></td>
          <td><input class="cell-input" data-id="${r.id}" data-field="C" value="${escapeHtml(r.C || "")}" /></td>
          <td class="cell-center"><input class="cell-input cell-center" data-id="${r.id}" data-field="D" value="${escapeHtml(r.D || (state.sheet === "PHC" ? "PHC" : state.sheet.replace("NM ", "")))}" /></td>
          <td><input class="cell-input" data-id="${r.id}" data-field="E" value="${escapeHtml(r.E || "")}" style="font-weight:700" /></td>
          <td><input class="cell-input" data-id="${r.id}" data-field="F" value="${escapeHtml(r.F || "")}" style="font-weight:700" /></td>
          <td><input class="cell-input" data-id="${r.id}" data-field="G" value="${escapeHtml(r.G || "")}" title="${escapeHtml(r.G || "")}" /></td>
          <td class="cell-center"><input class="cell-input cell-center" data-id="${r.id}" data-field="H" value="${escapeHtml(r.H || "KÍ")}" /></td>
          <td class="cell-num cell-yellow"><input class="cell-input cell-num" data-id="${r.id}" data-field="I" value="${fmt(r.I)}" title="QC (auto / nhập phiếu gốc)" /></td>
          <td class="cell-num"><input class="cell-input cell-num" data-id="${r.id}" data-field="J" value="${fmt(r.J)}" /></td>
          <td class="cell-num cell-yellow cell-readonly">${fmt(r.K)}</td>
          <td class="cell-num cell-yellow cell-readonly">${fmt(r.L)}</td>
          <td class="cell-num cell-readonly"><strong>${fmt(r.M)}</strong></td>
          ${dayCells}
          <td class="cell-num cell-readonly">${fmt(r.AS)}</td>
          <td class="cell-orange cell-readonly" title="${escapeHtml(r.AT || "")}">${escapeHtml(r.AT || "")}</td>
          <td class="cell-cyan cell-readonly">${escapeHtml(r.AU || "")}</td>
          <td>
            <button type="button" class="btn btn-danger btn-del" data-id="${r.id}" style="padding:2px 6px;font-size:11px;background:#c00000;border:none">Xóa</button>
          </td>
        </tr>`;
      })
      .join("");

    // bind inputs
    tbody.querySelectorAll("input.cell-input").forEach((inp) => {
      inp.addEventListener("change", onCellChange);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          inp.blur();
        }
      });
    });
    tbody.querySelectorAll(".btn-del").forEach((b) => {
      b.addEventListener("click", () => {
        if (!confirm("Xóa dòng này?")) return;
        const id = b.dataset.id;
        state.store.sheets[state.sheet] = rowsOfSheet().filter((r) => r.id !== id);
        recomputeSheet();
        renderTable();
        setStatus("Đã xóa dòng (chưa lưu GitHub).", "info");
      });
    });
    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        state.selectedId = tr.dataset.id;
        $$("#gridBody tr").forEach((x) => x.classList.toggle("selected", x.dataset.id === state.selectedId));
      });
    });
  }

  function onCellChange(e) {
    const inp = e.target;
    const id = inp.dataset.id;
    const row = rowsOfSheet().find((r) => r.id === id);
    if (!row) return;

    if (inp.dataset.day !== undefined) {
      const di = Number(inp.dataset.day);
      if (!Array.isArray(row.days)) row.days = [];
      while (row.days.length < 31) row.days.push(null);
      const raw = inp.value.trim();
      row.days[di] = raw === "" ? null : Number(raw);
    } else {
      const field = inp.dataset.field;
      let val = inp.value;
      if (["I", "J"].includes(field)) {
        val = val.trim() === "" ? null : Number(val);
      }
      row[field] = val;
    }
    row.updatedBy = currentUser().name;
    row.updatedAt = new Date().toISOString();
    recomputeSheet();
    renderTable();
    setStatus("Đã cập nhật & tính lại K/L/M/AT/AU.", "ok");
  }

  function openDrawer(editId) {
    $("#drawer").classList.add("open");
    $("#drawerBackdrop").classList.add("open");
    const row = editId ? rowsOfSheet().find((r) => r.id === editId) : null;
    $("#f_id").value = row?.id || "";
    $("#f_A").value = row?.A || new Date().toISOString().slice(0, 10);
    $("#f_B").value = row?.B || "";
    $("#f_C").value = row?.C || "";
    $("#f_D").value = row?.D || (state.sheet === "PHC" ? "PHC" : state.sheet.replace("NM ", ""));
    $("#f_E").value = row?.E || "";
    $("#f_F").value = row?.F || "";
    $("#f_G").value = row?.G || "";
    $("#f_H").value = row?.H || "KÍ";
    $("#f_I").value = row?.I ?? "";
    $("#f_J").value = row?.J ?? 0;
    $("#f_days").value = (row?.days || []).filter((x) => x != null && x !== "").join(",");
    $("#drawerTitle").textContent = row ? "Sửa dòng" : "Thêm dòng mới";
  }

  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawerBackdrop").classList.remove("open");
  }

  function saveDrawer() {
    const id = $("#f_id").value || undefined;
    const daysRaw = $("#f_days").value.trim();
    const days = Array(31).fill(null);
    if (daysRaw) {
      daysRaw.split(/[,;\s]+/).forEach((x, i) => {
        if (i < 31 && x !== "") days[i] = Number(x);
      });
    }
    const row = TruNoLogic.newRow({
      id,
      A: $("#f_A").value,
      B: $("#f_B").value,
      C: $("#f_C").value,
      D: $("#f_D").value,
      E: $("#f_E").value.trim(),
      F: $("#f_F").value.trim(),
      G: $("#f_G").value.trim(),
      H: $("#f_H").value || "KÍ",
      I: $("#f_I").value === "" ? null : Number($("#f_I").value),
      J: $("#f_J").value === "" ? 0 : Number($("#f_J").value),
      days,
      updatedBy: currentUser().name,
      updatedAt: new Date().toISOString(),
    });
    if (!row.E || !row.F) {
      setStatus("Cần nhập «Số phiếu Lefaso» và «MÃ VẬT TƯ».", "err");
      return;
    }
    const list = rowsOfSheet();
    const idx = list.findIndex((r) => r.id === row.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...row };
    else list.push(row);
    state.store.sheets[state.sheet] = list;
    recomputeSheet();
    closeDrawer();
    renderTable();
    renderMeta();
    setStatus("Đã lưu dòng — nhớ «Lưu GitHub» để chia sẻ cho user khác.", "ok");
  }

  async function loadRemote() {
    setStatus("Đang tải từ GitHub…", "info");
    try {
      const data = await storeApi.load();
      state.store = normalizeStore(data);
      recomputeAll();
      renderUsers();
      renderMeta();
      renderTabs();
      renderTable();
      const total = SHEETS.reduce((s, k) => s + (state.store.sheets[k]?.length || 0), 0);
      setStatus(total ? `Đã tải ${total} dòng từ GitHub/local.` : "Chưa có dữ liệu online — dùng Demo hoặc thêm dòng.", total ? "ok" : "info");
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  async function saveRemote() {
    const user = currentUser();
    state.store.meta.updatedAt = new Date().toISOString();
    state.store.meta.updatedBy = user.name;
    state.store.meta.month = state.month;
    state.store.meta.year = state.year;
    state.store.meta.title = "THEO DÕI TRỪ NỢ NHÀ MÀY & KHO";
    recomputeAll();
    setStatus("Đang lưu lên GitHub…", "info");
    try {
      await storeApi.save(state.store, `update by ${user.name} @ ${state.store.meta.updatedAt}`, user.name);
      renderMeta();
      setStatus(`Đã lưu GitHub · ${user.name}`, "ok");
    } catch (e) {
      storeApi.cacheLocal(state.store);
      setStatus(String(e.message || e), "err");
    }
  }

  function loadDemo() {
    if (rowsOfSheet().length && !confirm("Thay dữ liệu sheet hiện tại bằng mẫu demo?")) return;
    // demo only on PHC by default
    state.sheet = "PHC";
    state.store.sheets.PHC = TruNoLogic.sampleData();
    localStorage.setItem("truno_sheet", "PHC");
    recomputeSheet();
    renderTabs();
    renderTable();
    renderMeta();
    setStatus("Demo: OI2601482 → OI2602483 → OI2602489 (quét lùi 009200).", "ok");
  }

  function bind() {
    $("#userSelect").addEventListener("change", (e) => {
      state.userId = e.target.value;
      localStorage.setItem("truno_user", state.userId);
      setStatus(`Đang làm việc: ${currentUser().name}`, "info");
    });

    $$(".sheet-tab").forEach((t) => {
      t.addEventListener("click", () => {
        state.sheet = t.dataset.sheet;
        localStorage.setItem("truno_sheet", state.sheet);
        renderTabs();
        renderTable();
        renderMeta();
      });
    });

    $("#metaMonth").addEventListener("change", (e) => {
      state.month = Number(e.target.value) || 1;
      localStorage.setItem("truno_month", state.month);
      state.store.meta.month = state.month;
    });
    $("#metaYear").addEventListener("change", (e) => {
      state.year = Number(e.target.value) || 2026;
      localStorage.setItem("truno_year", state.year);
      state.store.meta.year = state.year;
    });

    $("#btnAdd").addEventListener("click", () => openDrawer(null));
    $("#btnRecalc").addEventListener("click", () => {
      recomputeAll();
      renderTable();
      setStatus("Đã tính lại toàn bộ sheet theo quy tắc VBA.", "ok");
    });
    $("#btnLoad").addEventListener("click", loadRemote);
    $("#btnSaveGh").addEventListener("click", saveRemote);
    $("#btnDemo").addEventListener("click", loadDemo);
    $("#btnToken").addEventListener("click", () => {
      openTokenModal(true);
    });
    $("#btnGuide").addEventListener("click", () => openTokenModal(false));
    $("#btnExport").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.store, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `truno-${Date.now()}.json`;
      a.click();
    });
    $("#fileImport").addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        state.store = normalizeStore(data);
        recomputeAll();
        renderUsers();
        renderTable();
        renderMeta();
        setStatus("Đã import JSON.", "ok");
      } catch (err) {
        setStatus("Import lỗi: " + err.message, "err");
      }
      e.target.value = "";
    });

    $("#filterQ").addEventListener("input", (e) => {
      state.filter = e.target.value;
      renderTable();
    });

    $("#btnDrawerSave").addEventListener("click", saveDrawer);
    $("#btnDrawerClose").addEventListener("click", closeDrawer);
    $("#drawerBackdrop").addEventListener("click", closeDrawer);
    $("#btnDrawerCancel").addEventListener("click", closeDrawer);

    $("#btnCloseGuide").addEventListener("click", () => {
      $("#guideModal").classList.remove("open");
    });
    $("#btnSaveTokenModal").addEventListener("click", () => {
      const t = $("#tokenInput").value.trim();
      storeApi.setToken(t);
      $("#guideModal").classList.remove("open");
      renderMeta();
      setStatus(t ? "Đã lưu GitHub Token trên trình duyệt này." : "Đã xóa token.", "ok");
    });
  }

  function openTokenModal(focusToken) {
    $("#guideModal").classList.add("open");
    $("#tokenInput").value = storeApi.token || "";
    if (focusToken) setTimeout(() => $("#tokenInput").focus(), 100);
  }

  async function init() {
    renderUsers();
    renderTabs();
    bind();
    await loadRemote();
    if (!SHEETS.some((s) => (state.store.sheets[s] || []).length)) {
      state.store.sheets.PHC = TruNoLogic.sampleData();
      recomputeSheet();
      setStatus("Nạp demo (chưa có dữ liệu remote).", "info");
    }
    renderMeta();
    renderTable();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
