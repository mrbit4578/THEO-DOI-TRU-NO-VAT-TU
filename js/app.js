/* global TruNoLogic, GitHubStore */
(function () {
  const SHEETS = ["PHC", "NM LAF", "NM LVF"];
  const storeApi = new GitHubStore();
  storeApi.loadCfgFromStorage();

  const state = {
    userId: localStorage.getItem("truno_user") || "u1",
    sheet: localStorage.getItem("truno_sheet") || "PHC",
    month: Number(localStorage.getItem("truno_month") || 7),
    year: Number(localStorage.getItem("truno_year") || 2026),
    selectedId: null,
    filter: "",
    daysOpen: false,
    mode: "view", // view | edit | create
    store: emptyStore(),
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
    if (!Array.isArray(state.store.sheets[state.sheet])) state.store.sheets[state.sheet] = [];
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
    if (out.meta.month) state.month = out.meta.month;
    if (out.meta.year) state.year = out.meta.year;
    return out;
  }

  function recomputeSheet() {
    state.store.sheets[state.sheet] = TruNoLogic.autoFill(rowsOfSheet());
  }

  function recomputeAll() {
    for (const s of SHEETS) {
      state.store.sheets[s] = TruNoLogic.autoFill(state.store.sheets[s] || []);
    }
  }

  function defaultPlant() {
    if (state.sheet === "PHC") return "PHC";
    return state.sheet.replace("NM ", "");
  }

  /* ---------- render ---------- */
  function renderUsers() {
    $("#userSelect").innerHTML = state.store.users
      .map((u) => `<option value="${u.id}" ${u.id === state.userId ? "selected" : ""}>${escapeHtml(u.name)}</option>`)
      .join("");
    $("#sideUser").textContent = currentUser().name;
  }

  function renderSheetNav() {
    $("#sheetNav").innerHTML = SHEETS.map((s) => {
      const n = (state.store.sheets[s] || []).length;
      const active = s === state.sheet ? "active" : "";
      const ico = s === "PHC" ? "🏭" : s.includes("LAF") ? "🧱" : "🧪";
      return `<button type="button" class="nav-item ${active}" data-sheet="${s}">
        <span class="ico">${ico}</span>
        <span>${s}</span>
        <span class="meta">${n}</span>
      </button>`;
    }).join("");
    $$("#sheetNav .nav-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.sheet = btn.dataset.sheet;
        localStorage.setItem("truno_sheet", state.sheet);
        state.selectedId = null;
        closeMobileSidebar();
        renderAll();
      });
    });
  }

  function renderKpis() {
    const rows = rowsOfSheet();
    const phieus = new Set(rows.map((r) => String(r.E || "").trim()).filter(Boolean));
    $("#kpiRows").textContent = rows.length;
    $("#kpiPhieu").textContent = phieus.size;
    $("#kpiK").textContent = rows.filter((r) => r.K != null && r.K !== "").length;
    $("#kpiL").textContent = rows.filter((r) => r.L != null && r.L !== "").length;
    $("#listCount").textContent = `${rows.length} dòng`;
    $("#listTitle").textContent = `Danh sách · ${state.sheet}`;
    $("#metaMonth").value = state.month;
    $("#metaYear").value = state.year;
    $("#sideUpdated").textContent = state.store.meta.updatedBy
      ? `${state.store.meta.updatedBy}\n${(state.store.meta.updatedAt || "").slice(0, 19).replace("T", " ")}`
      : "—";
    $("#sideToken").textContent = storeApi.token ? "Đã cấu hình ✓" : "Chưa cấu hình";
  }

  function filteredRows() {
    const q = state.filter.trim().toLowerCase();
    const rows = rowsOfSheet();
    if (!q) return rows.map((r, i) => ({ r, i }));
    return rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) =>
        [r.E, r.F, r.G, r.C, r.D, r.AU, r.AT, r.B].some((x) => String(x || "").toLowerCase().includes(q))
      );
  }

  function renderTable() {
    const list = filteredRows();
    const tbody = $("#gridBody");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="14"><div class="empty"><b>Chưa có dữ liệu</b>Bấm 「＋ Thêm dòng」 hoặc 「Demo」</div></td></tr>`;
      return;
    }
    tbody.innerHTML = list
      .map(({ r, i }) => {
        const active = r.id === state.selectedId ? "active" : "";
        const atBadge = r.AT
          ? r.AT.includes("OK")
            ? "ok"
            : r.AT.includes("lớn hơn")
              ? "warn"
              : "info"
          : "muted";
        return `<tr class="${active}" data-id="${r.id}">
          <td>${i + 1}</td>
          <td>${escapeHtml(r.A || "")}</td>
          <td>${escapeHtml(r.D || "")}</td>
          <td><strong>${escapeHtml(r.E || "")}</strong></td>
          <td><strong>${escapeHtml(r.F || "")}</strong></td>
          <td class="clip" title="${escapeHtml(r.G || "")}">${escapeHtml(r.G || "")}</td>
          <td class="num">${fmt(r.I)}</td>
          <td class="num">${fmt(r.J)}</td>
          <td class="num">${fmt(r.K)}</td>
          <td class="num">${fmt(r.L)}</td>
          <td class="num"><strong>${fmt(r.M)}</strong></td>
          <td class="num">${fmt(r.AS)}</td>
          <td><span class="badge ${atBadge}">${escapeHtml(r.AT || "—")}</span></td>
          <td><span class="badge info">${escapeHtml(r.AU || "—")}</span></td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => selectRow(tr.dataset.id));
    });
  }

  function buildDaysGrid(days) {
    const arr = Array.isArray(days) ? days : [];
    const grid = $("#daysGrid");
    grid.innerHTML = Array.from({ length: 31 }, (_, i) => {
      const v = arr[i];
      return `<label class="day-cell">
        <span>Ngày ${i + 1}</span>
        <input type="number" step="any" data-day="${i}" value="${v == null || v === "" ? "" : fmt(v)}" />
      </label>`;
    }).join("");
  }

  function showForm(show) {
    $("#detailEmpty").style.display = show ? "none" : "block";
    $("#detailForm").style.display = show ? "block" : "none";
  }

  function fillForm(row, mode) {
    state.mode = mode;
    showForm(true);
    $("#detailTitle").textContent = mode === "create" ? "Thêm dòng mới" : "Chỉnh sửa dòng";
    $("#f_id").value = row.id || "";
    $("#f_A").value = row.A || new Date().toISOString().slice(0, 10);
    $("#f_B").value = row.B || "";
    $("#f_C").value = row.C || "";
    $("#f_D").value = row.D || defaultPlant();
    $("#f_E").value = row.E || "";
    $("#f_F").value = row.F || "";
    $("#f_G").value = row.G || "";
    $("#f_H").value = row.H || "KÍ";
    $("#f_I").value = row.I ?? "";
    $("#f_J").value = row.J ?? 0;
    $("#f_K").value = fmt(row.K);
    $("#f_L").value = fmt(row.L);
    $("#f_M").value = fmt(row.M);
    $("#f_AS").value = fmt(row.AS);
    $("#f_AT").value = row.AT || "";
    $("#f_AU").value = row.AU || "";
    buildDaysGrid(row.days);
    $("#daysPanel").classList.toggle("open", state.daysOpen);
    $("#btnToggleDays").textContent = state.daysOpen ? "Ẩn ngày" : "Hiện ngày";
  }

  function selectRow(id) {
    state.selectedId = id;
    const row = rowsOfSheet().find((r) => r.id === id);
    if (!row) return;
    fillForm(row, "edit");
    renderTable();
  }

  function readForm() {
    const days = Array(31).fill(null);
    $$("#daysGrid input[data-day]").forEach((inp) => {
      const i = Number(inp.dataset.day);
      const raw = inp.value.trim();
      days[i] = raw === "" ? null : Number(raw);
    });
    return TruNoLogic.newRow({
      id: $("#f_id").value || undefined,
      A: $("#f_A").value,
      B: $("#f_B").value,
      C: $("#f_C").value,
      D: $("#f_D").value || defaultPlant(),
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
  }

  function saveRow() {
    const row = readForm();
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
    state.selectedId = row.id || list[list.length - 1].id;
    renderAll();
    const saved = rowsOfSheet().find((r) => r.id === state.selectedId);
    if (saved) fillForm(saved, "edit");
    setStatus("Đã lưu dòng & tính K/L/M/AT/AU. Nhớ ☁ Lưu GitHub để chia sẻ.", "ok");
  }

  function newForm() {
    state.selectedId = null;
    state.mode = "create";
    fillForm(
      TruNoLogic.newRow({
        D: defaultPlant(),
        A: new Date().toISOString().slice(0, 10),
        H: "KÍ",
        J: 0,
        days: [],
      }),
      "create"
    );
    $("#f_id").value = "";
    renderTable();
    setStatus("Form thêm dòng mới.", "info");
  }

  function deleteRow() {
    const id = $("#f_id").value || state.selectedId;
    if (!id) {
      setStatus("Chưa chọn dòng để xóa.", "err");
      return;
    }
    if (!confirm("Xóa dòng đang chọn?")) return;
    state.store.sheets[state.sheet] = rowsOfSheet().filter((r) => r.id !== id);
    recomputeSheet();
    state.selectedId = null;
    showForm(false);
    renderAll();
    setStatus("Đã xóa dòng (chưa lưu GitHub).", "info");
  }

  function renderAll() {
    renderUsers();
    renderSheetNav();
    renderKpis();
    renderTable();
    if (!state.selectedId && state.mode !== "create") showForm(false);
  }

  /* ---------- remote ---------- */
  async function loadRemote() {
    setStatus("Đang tải GitHub…", "info");
    try {
      const data = await storeApi.load();
      state.store = normalizeStore(data);
      recomputeAll();
      state.selectedId = null;
      state.mode = "view";
      showForm(false);
      renderAll();
      const total = SHEETS.reduce((s, k) => s + (state.store.sheets[k]?.length || 0), 0);
      setStatus(total ? `Đã tải ${total} dòng.` : "Chưa có dữ liệu online.", total ? "ok" : "info");
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
    setStatus("Đang lưu GitHub…", "info");
    try {
      await storeApi.save(state.store, `update by ${user.name}`, user.name);
      renderKpis();
      setStatus(`Đã lưu GitHub · ${user.name}`, "ok");
    } catch (e) {
      storeApi.cacheLocal(state.store);
      setStatus(String(e.message || e), "err");
    }
  }

  function loadDemo() {
    if (rowsOfSheet().length && !confirm("Thay sheet hiện tại bằng demo?")) return;
    state.sheet = "PHC";
    localStorage.setItem("truno_sheet", "PHC");
    state.store.sheets.PHC = TruNoLogic.sampleData();
    recomputeSheet();
    state.selectedId = null;
    showForm(false);
    renderAll();
    setStatus("Demo đã nạp (OI2601482 → OI2602483 → OI2602489).", "ok");
  }

  function openGuide(focus) {
    $("#guideModal").classList.add("open");
    $("#tokenInput").value = storeApi.token || "";
    if (focus) setTimeout(() => $("#tokenInput").focus(), 50);
  }
  function closeGuide() {
    $("#guideModal").classList.remove("open");
  }

  function openMobileSidebar() {
    $("#sidebar").classList.add("open");
    $("#sidebarBackdrop").classList.add("open");
  }
  function closeMobileSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebarBackdrop").classList.remove("open");
  }

  function bind() {
    $("#userSelect").addEventListener("change", (e) => {
      state.userId = e.target.value;
      localStorage.setItem("truno_user", state.userId);
      $("#sideUser").textContent = currentUser().name;
      setStatus(`Đang làm việc: ${currentUser().name}`, "info");
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
    $("#filterQ").addEventListener("input", (e) => {
      state.filter = e.target.value;
      renderTable();
    });

    $("#btnAdd").addEventListener("click", newForm);
    $("#btnNewRow").addEventListener("click", newForm);
    $("#btnSaveRow").addEventListener("click", saveRow);
    $("#btnDelRow").addEventListener("click", deleteRow);
    $("#btnRecalc").addEventListener("click", () => {
      recomputeAll();
      renderAll();
      if (state.selectedId) {
        const row = rowsOfSheet().find((r) => r.id === state.selectedId);
        if (row) fillForm(row, "edit");
      }
      setStatus("Đã tính lại toàn bộ.", "ok");
    });
    $("#btnLoad").addEventListener("click", loadRemote);
    $("#btnSaveGh").addEventListener("click", saveRemote);
    $("#btnDemo").addEventListener("click", loadDemo);
    $("#btnToken").addEventListener("click", () => openGuide(true));
    $("#btnGuide").addEventListener("click", () => openGuide(false));
    $("#btnCloseGuide").addEventListener("click", closeGuide);
    $("#btnCloseGuide2").addEventListener("click", closeGuide);
    $("#btnSaveTokenModal").addEventListener("click", () => {
      storeApi.setToken($("#tokenInput").value.trim());
      closeGuide();
      renderKpis();
      setStatus(storeApi.token ? "Đã lưu token trên trình duyệt này." : "Đã xóa token.", "ok");
    });
    $("#btnToggleDays").addEventListener("click", () => {
      state.daysOpen = !state.daysOpen;
      $("#daysPanel").classList.toggle("open", state.daysOpen);
      $("#btnToggleDays").textContent = state.daysOpen ? "Ẩn ngày" : "Hiện ngày";
    });
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
        state.store = normalizeStore(JSON.parse(await f.text()));
        recomputeAll();
        state.selectedId = null;
        showForm(false);
        renderAll();
        setStatus("Đã import JSON.", "ok");
      } catch (err) {
        setStatus("Import lỗi: " + err.message, "err");
      }
      e.target.value = "";
    });
    $("#btnMenu").addEventListener("click", openMobileSidebar);
    $("#sidebarBackdrop").addEventListener("click", closeMobileSidebar);
  }

  async function init() {
    bind();
    await loadRemote();
    if (!SHEETS.some((s) => (state.store.sheets[s] || []).length)) {
      state.store.sheets.PHC = TruNoLogic.sampleData();
      recomputeSheet();
      setStatus("Demo mặc định (chưa có data remote).", "info");
    }
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
