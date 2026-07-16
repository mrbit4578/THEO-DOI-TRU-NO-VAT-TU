/* global TruNoLogic, GitHubStore, TruNoIO */
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
    mode: "view",
    store: emptyStore(),
    maPickIndex: -1,
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

  function fillOpts() {
    return { month: state.month, year: state.year };
  }

  function materialCatalog() {
    return TruNoLogic.buildMaterialCatalog(state.store.sheets);
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
    state.store.sheets[state.sheet] = TruNoLogic.autoFill(rowsOfSheet(), fillOpts());
  }

  function recomputeAll() {
    for (const s of SHEETS) {
      state.store.sheets[s] = TruNoLogic.autoFill(state.store.sheets[s] || [], fillOpts());
    }
  }

  function defaultPlant() {
    if (state.sheet === "PHC") return "PHC";
    return state.sheet.replace("NM ", "");
  }

  function currentQC() {
    const v = Number($("#f_I").value);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  /* ---------- material search ---------- */
  function hideMaDropdown() {
    const dd = $("#maDropdown");
    if (dd) {
      dd.hidden = true;
      dd.innerHTML = "";
    }
    state.maPickIndex = -1;
  }

  function showMaDropdown(items) {
    const dd = $("#maDropdown");
    if (!items.length) {
      dd.hidden = true;
      dd.innerHTML = `<div class="ma-empty">Không tìm thấy mã / tên</div>`;
      dd.hidden = false;
      return;
    }
    dd.innerHTML = items
      .map(
        (m, i) => `<button type="button" class="ma-item ${i === state.maPickIndex ? "active" : ""}" data-ma="${escapeHtml(m.ma)}" data-idx="${i}">
        <strong>${escapeHtml(m.ma)}</strong>
        <span>${escapeHtml(m.ten || "—")}</span>
        <em>QC ${m.qc != null ? fmt(m.qc) : "—"} · ${escapeHtml(m.dvt || "")}</em>
      </button>`
      )
      .join("");
    dd.hidden = false;
    dd.querySelectorAll(".ma-item").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applyMaterial(btn.dataset.ma);
      });
    });
  }

  function applyMaterial(ma) {
    const cat = materialCatalog();
    const m = cat.find((x) => x.ma === ma);
    if (!m) return;
    $("#f_F").value = m.ma;
    $("#f_G").value = m.ten || "";
    if (m.qc != null) $("#f_I").value = m.qc;
    if (m.dvt) $("#f_H").value = m.dvt;
    hideMaDropdown();
    updateDaysHint();
    if (state.daysOpen) {
      const { days } = readDaysAsQty();
      buildDaysGrid(days);
    }
    setStatus(`Đã map: ${m.ma} → ${m.ten || ""} (QC ${fmt(m.qc)})`, "ok");
  }

  function onMaInput() {
    const q = $("#f_F").value;
    const items = TruNoLogic.searchMaterials(materialCatalog(), q, 25);
    state.maPickIndex = items.length ? 0 : -1;
    showMaDropdown(items);
  }

  function onMaKeydown(e) {
    const dd = $("#maDropdown");
    if (dd.hidden) {
      if (e.key === "ArrowDown") onMaInput();
      return;
    }
    const items = Array.from(dd.querySelectorAll(".ma-item"));
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.maPickIndex = Math.min(items.length - 1, state.maPickIndex + 1);
      items.forEach((el, i) => el.classList.toggle("active", i === state.maPickIndex));
      items[state.maPickIndex]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.maPickIndex = Math.max(0, state.maPickIndex - 1);
      items.forEach((el, i) => el.classList.toggle("active", i === state.maPickIndex));
      items[state.maPickIndex]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const btn = items[state.maPickIndex] || items[0];
      if (btn) applyMaterial(btn.dataset.ma);
    } else if (e.key === "Escape") {
      hideMaDropdown();
    }
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
        [r.E, r.F, r.G, r.C, r.D, r.AU, r.AT, r.B, r.Ngay_thuc_cap].some((x) =>
          String(x || "").toLowerCase().includes(q)
        )
      );
  }

  function renderTable() {
    const list = filteredRows();
    const tbody = $("#gridBody");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="16"><div class="empty"><b>Chưa có dữ liệu</b>Bấm 「＋ Thêm dòng」 hoặc 「Demo」</div></td></tr>`;
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
          <td class="num"><strong>${fmt(r.SL_thuc_cap)}</strong></td>
          <td>${escapeHtml(r.Ngay_thuc_cap || "—")}</td>
          <td><span class="badge ${atBadge}">${escapeHtml(r.AT || "—")}</span></td>
          <td><span class="badge info">${escapeHtml(r.AU || "—")}</span></td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => selectRow(tr.dataset.id));
    });
  }

  function updateDaysHint() {
    const qc = currentQC();
    const el = $("#daysHint");
    if (!el) return;
    if (qc) {
      el.innerHTML = `Nhập thẳng <b>số KÍ</b>. QC = <b>${fmt(qc)}</b> → hợp lệ: ${fmt(qc)}, ${fmt(qc * 2)}, ${fmt(qc * 3)}… (vd nhập <b>${fmt(qc * 2)}</b> = 2 kiện). <b>Không tự sửa số</b> — số lẻ sẽ <b>cảnh báo</b>, bạn tự chỉnh.`;
    } else {
      el.innerHTML = `Chưa có <b>QC đóng gói</b> — chọn mã VT để map QC trước khi nhập KÍ theo ngày.`;
    }
  }

  /** Nhập thẳng KÍ, không spinner; lẻ so QC → cảnh báo, KHÔNG tự đổi số */
  function buildDaysGrid(daysQty) {
    const arr = Array.isArray(daysQty) ? daysQty : [];
    const grid = $("#daysGrid");
    grid.innerHTML = Array.from({ length: 31 }, (_, i) => {
      const qty = arr[i];
      const show = qty == null || qty === "" ? "" : fmt(qty);
      return `<label class="day-cell">
        <span>Ngày ${i + 1}</span>
        <input type="text" inputmode="decimal" class="no-spin" data-day="${i}" value="${show}" placeholder="KÍ" />
        <small class="day-qty" data-day-qty="${i}"></small>
      </label>`;
    }).join("");

    grid.querySelectorAll("input[data-day]").forEach((inp) => {
      // hiển thị trạng thái kiện / cảnh báo
      validateDayInput(inp, false);
      inp.addEventListener("input", () => validateDayInput(inp, false));
      inp.addEventListener("blur", () => validateDayInput(inp, true));
    });
  }

  /**
   * @returns {{ ok: boolean, qty: number|null, message: string }}
   */
  function validateDayInput(inp, showStatus) {
    let raw = String(inp.value || "").trim().replace(",", ".");
    // chỉ chặn ký tự lạ khi blur; khi gõ để user tự do
    if (showStatus) {
      raw = raw.replace(/[^\d.]/g, "");
      const parts = raw.split(".");
      if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
      inp.value = raw;
    }

    const di = Number(inp.dataset.day);
    const small = $(`#daysGrid small[data-day-qty="${di}"]`);
    const qc = currentQC();
    const checkRaw = String(inp.value || "").trim().replace(",", ".");

    if (checkRaw === "" || checkRaw === ".") {
      if (small) {
        small.textContent = "";
        small.className = "day-qty";
      }
      inp.classList.remove("day-invalid");
      return { ok: true, qty: null, message: "" };
    }

    const n = Number(checkRaw);
    if (!Number.isFinite(n) || n < 0) {
      if (small) {
        small.textContent = "Số không hợp lệ";
        small.className = "day-qty bad";
      }
      inp.classList.add("day-invalid");
      return { ok: false, qty: null, message: `Ngày ${di + 1}: số không hợp lệ` };
    }

    if (n === 0) {
      if (small) {
        small.textContent = "";
        small.className = "day-qty";
      }
      inp.classList.remove("day-invalid");
      return { ok: true, qty: null, message: "" };
    }

    // Có QC: phải là bội số nguyên của QC — KHÔNG tự đổi số user
    if (qc && !TruNoLogic.isMultipleOfQC(n, qc)) {
      const near = TruNoLogic.snapQtyToQC(n, qc);
      if (small) {
        small.textContent = `⚠ Lẻ QC — hãy chỉnh lại (gợi ý ${fmt(near.value)})`;
        small.className = "day-qty bad";
      }
      inp.classList.add("day-invalid");
      const msg = `SL nhập lẻ so với QC đóng gói (${fmt(qc)}). Ngày ${di + 1}: ${fmt(n)} không hợp lệ — hãy điều chỉnh lại (vd ${fmt(near.value)} = ${near.packages} kiện).`;
      if (showStatus) setStatus(msg, "err");
      return { ok: false, qty: n, message: msg };
    }

    const pk = qc ? TruNoLogic.qtyToPackages(n, qc) : null;
    if (small) {
      small.textContent = pk != null ? `✓ ${pk} kiện × ${fmt(qc)}` : "✓";
      small.className = "day-qty ok";
    }
    inp.classList.remove("day-invalid");
    if (showStatus) inp.value = fmt(n);
    return { ok: true, qty: n, message: "" };
  }

  /** Đọc days; nếu có ô lẻ QC → trả errors */
  function readDaysAsQty() {
    const days = Array(31).fill(null);
    const errors = [];
    $$("#daysGrid input[data-day]").forEach((inp) => {
      const i = Number(inp.dataset.day);
      const res = validateDayInput(inp, false);
      if (!res.ok) {
        errors.push(res.message || `Ngày ${i + 1} không hợp lệ`);
        days[i] = null; // không nhận giá trị lẻ
        return;
      }
      days[i] = res.qty != null && res.qty > 0 ? res.qty : null;
    });
    return { days, errors };
  }

  function validateAllDays() {
    const { days, errors } = readDaysAsQty();
    return { days, errors };
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
    $("#f_SLTC").value = fmt(row.SL_thuc_cap);
    $("#f_NgayTC").value = row.Ngay_thuc_cap || "";
    $("#f_AT").value = row.AT || "";
    $("#f_AU").value = row.AU || "";
    updateDaysHint();
    buildDaysGrid(row.days);
    $("#daysPanel").classList.toggle("open", state.daysOpen);
    $("#btnToggleDays").textContent = state.daysOpen ? "Ẩn ngày" : "Hiện ngày";
    hideMaDropdown();
  }

  function selectRow(id) {
    state.selectedId = id;
    const row = rowsOfSheet().find((r) => r.id === id);
    if (!row) return;
    fillForm(row, "edit");
    renderTable();
  }

  function readForm() {
    const dayRes = validateAllDays();
    return {
      row: TruNoLogic.newRow({
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
        days: dayRes.days,
        updatedBy: currentUser().name,
        updatedAt: new Date().toISOString(),
      }),
      dayErrors: dayRes.errors,
    };
  }

  function saveRow() {
    const { row, dayErrors } = readForm();
    if (!row.E || !row.F) {
      setStatus("Cần nhập «Số phiếu Lefaso» và «MÃ VẬT TƯ».", "err");
      return;
    }
    if (dayErrors.length) {
      setStatus(
        "SL nhập lẻ so với QC đóng gói — hãy điều chỉnh lại trước khi lưu. " + dayErrors[0],
        "err"
      );
      // mở panel ngày để user thấy ô đỏ
      state.daysOpen = true;
      $("#daysPanel").classList.add("open");
      $("#btnToggleDays").textContent = "Ẩn ngày";
      const bad = $("#daysGrid input.day-invalid");
      if (bad) bad.focus();
      return;
    }
    // auto map name if empty
    if (!row.G) {
      const m = materialCatalog().find((x) => x.ma === row.F);
      if (m) {
        row.G = m.ten || "";
        if (row.I == null && m.qc != null) row.I = m.qc;
      }
    }
    const list = rowsOfSheet();
    const idx = list.findIndex((r) => r.id === row.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...row };
    else list.push(row);
    state.store.sheets[state.sheet] = list;
    recomputeSheet();
    const savedId = row.id || list[list.length - 1].id;
    state.selectedId = savedId;
    renderAll();
    const saved = rowsOfSheet().find((r) => r.id === savedId);
    if (saved) fillForm(saved, "edit");
    const tr = $(`#gridBody tr[data-id="${savedId}"]`);
    if (tr) tr.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setStatus(
      `Đã lưu & map danh sách · SL thực cấp ${fmt(saved?.SL_thuc_cap)} · ${saved?.Ngay_thuc_cap || "chưa cấp"}.`,
      "ok"
    );
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
    $("#f_G").value = "";
    renderTable();
    setStatus("Form thêm dòng mới — tìm mã VT để map tên.", "info");
    $("#f_F").focus();
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

  function showForm(show) {
    $("#detailEmpty").style.display = show ? "none" : "block";
    $("#detailForm").style.display = show ? "block" : "none";
  }

  function renderAll() {
    renderUsers();
    renderSheetNav();
    renderKpis();
    renderTable();
    if (!state.selectedId && state.mode !== "create") showForm(false);
  }

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
    setStatus("Demo đã nạp.", "ok");
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
    });
    $("#metaMonth").addEventListener("change", (e) => {
      state.month = Number(e.target.value) || 1;
      localStorage.setItem("truno_month", state.month);
      state.store.meta.month = state.month;
      recomputeAll();
      renderAll();
      if (state.selectedId) {
        const row = rowsOfSheet().find((r) => r.id === state.selectedId);
        if (row) fillForm(row, "edit");
      }
    });
    $("#metaYear").addEventListener("change", (e) => {
      state.year = Number(e.target.value) || 2026;
      localStorage.setItem("truno_year", state.year);
      state.store.meta.year = state.year;
      recomputeAll();
      renderAll();
    });
    $("#filterQ").addEventListener("input", (e) => {
      state.filter = e.target.value;
      renderTable();
    });

    $("#f_F").addEventListener("input", onMaInput);
    $("#f_F").addEventListener("keydown", onMaKeydown);
    $("#f_F").addEventListener("focus", onMaInput);
    $("#f_F").addEventListener("blur", () => setTimeout(hideMaDropdown, 150));
    $("#f_I").addEventListener("change", () => {
      updateDaysHint();
      if (state.daysOpen) {
        const { days } = readDaysAsQty();
        buildDaysGrid(days);
        // re-validate after QC change
        $$("#daysGrid input[data-day]").forEach((inp) => validateDayInput(inp, true));
      }
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
      setStatus(storeApi.token ? "Đã lưu token." : "Đã xóa token.", "ok");
    });
    $("#btnToggleDays").addEventListener("click", () => {
      state.daysOpen = !state.daysOpen;
      $("#daysPanel").classList.toggle("open", state.daysOpen);
      $("#btnToggleDays").textContent = state.daysOpen ? "Ẩn ngày" : "Hiện ngày";
      if (state.daysOpen) {
        let existing = [];
        if (state.selectedId) {
          existing = rowsOfSheet().find((r) => r.id === state.selectedId)?.days || [];
        } else {
          existing = readDaysAsQty().days || [];
        }
        buildDaysGrid(existing);
      }
    });
    $("#exportSelect").addEventListener("change", (e) => {
      const v = e.target.value;
      e.target.value = "";
      if (!v) return;
      try {
        if (v === "template") {
          const name = TruNoIO.exportTemplate();
          setStatus(`Đã tải file mẫu: ${name} — mở bằng Excel, điền rồi Import lại.`, "ok");
        } else if (v === "csv") {
          recomputeAll();
          const { name, count } = TruNoIO.exportDataCsv(state.store);
          setStatus(`Đã xuất ${count} dòng → ${name}`, "ok");
        } else if (v === "json") {
          recomputeAll();
          const name = TruNoIO.exportDataJson(state.store);
          setStatus(`Đã sao lưu JSON → ${name}`, "ok");
        }
      } catch (err) {
        setStatus("Export lỗi: " + err.message, "err");
      }
    });

    $("#fileImport").addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const mode = confirm(
          "OK = Thay thế toàn bộ dữ liệu bằng file import\nCancel = Gộp thêm vào dữ liệu hiện tại"
        )
          ? "replace"
          : "merge";

        const result = TruNoIO.importText(text, f.name, TruNoLogic.newRow, mode);

        if (result.type === "store") {
          state.store = normalizeStore(result.store);
        } else {
          if (mode === "replace") {
            state.store.sheets = { PHC: [], "NM LAF": [], "NM LVF": [] };
          }
          for (const sn of SHEETS) {
            const incoming = result.sheets[sn] || [];
            if (mode === "replace") state.store.sheets[sn] = incoming;
            else state.store.sheets[sn] = [...(state.store.sheets[sn] || []), ...incoming];
          }
        }

        recomputeAll();
        state.selectedId = null;
        showForm(false);
        renderAll();

        if (result.type === "store") {
          setStatus(`Đã import store JSON từ ${f.name}.`, "ok");
        } else {
          setStatus(
            `Import ${mode === "replace" ? "thay thế" : "gộp"}: +${result.count} dòng, bỏ ${result.skipped}. File: ${f.name}`,
            "ok"
          );
        }
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
