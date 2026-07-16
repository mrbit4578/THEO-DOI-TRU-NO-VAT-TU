/* global TruNoLogic, GitHubStore */
(function () {
  const storeApi = new GitHubStore();
  storeApi.loadCfgFromStorage();

  const state = {
    userId: localStorage.getItem("truno_user") || "u1",
    store: {
      version: 1,
      users: [
        { id: "u1", name: "User 1", role: "editor" },
        { id: "u2", name: "User 2", role: "editor" },
        { id: "u3", name: "User 3", role: "editor" },
        { id: "u4", name: "User 4", role: "editor" },
        { id: "u5", name: "User 5", role: "editor" },
      ],
      meta: { title: "Theo dõi trừ nợ vật tư", plant: "PHC", updatedAt: "", updatedBy: "" },
      rows: [],
    },
    busy: false,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function currentUser() {
    return state.store.users.find((u) => u.id === state.userId) || state.store.users[0];
  }

  function setStatus(msg, type = "info") {
    const el = $("#status");
    el.textContent = msg;
    el.className = "status " + type;
  }

  function fmt(n) {
    if (n === null || n === undefined || n === "") return "";
    const x = Number(n);
    if (!Number.isFinite(x)) return "";
    return Number.isInteger(x) ? String(x) : String(Math.round(x * 10000) / 10000);
  }

  function recompute() {
    state.store.rows = TruNoLogic.autoFill(state.store.rows);
    renderTable();
  }

  function renderUsers() {
    const sel = $("#userSelect");
    sel.innerHTML = state.store.users
      .map((u) => `<option value="${u.id}" ${u.id === state.userId ? "selected" : ""}>${u.name}</option>`)
      .join("");
  }

  function renderTable() {
    const tbody = $("#tblBody");
    const rows = state.store.rows;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;color:#9aa8bc;padding:24px">
        Chưa có dòng. Thêm dòng mới, tải dữ liệu GitHub, hoặc nạp mẫu demo.
      </td></tr>`;
      return;
    }
    tbody.innerHTML = rows
      .map((r, idx) => {
        return `<tr data-id="${r.id}">
          <td>${idx + 1}</td>
          <td>${escapeHtml(r.A || "")}</td>
          <td>${escapeHtml(r.D || "")}</td>
          <td><strong>${escapeHtml(r.E || "")}</strong></td>
          <td>${escapeHtml(r.F || "")}</td>
          <td title="${escapeHtml(r.G || "")}">${escapeHtml(truncate(r.G, 28))}</td>
          <td class="num cell-y">${fmt(r.I)}</td>
          <td class="num">${fmt(r.J)}</td>
          <td class="num cell-y">${fmt(r.K)}</td>
          <td class="num cell-y">${fmt(r.L)}</td>
          <td class="num"><strong>${fmt(r.M)}</strong></td>
          <td class="num">${fmt(r.AS)}</td>
          <td class="cell-o">${escapeHtml(r.AT || "")}</td>
          <td class="cell-c">${escapeHtml(r.AU || "")}</td>
          <td>
            <button class="btn btn-ghost btn-edit" data-id="${r.id}" type="button">Sửa</button>
            <button class="btn btn-danger btn-del" data-id="${r.id}" type="button">Xóa</button>
          </td>
        </tr>`;
      })
      .join("");

    $$(".btn-del").forEach((b) =>
      b.addEventListener("click", () => {
        if (!confirm("Xóa dòng này?")) return;
        state.store.rows = state.store.rows.filter((r) => r.id !== b.dataset.id);
        recompute();
        setStatus("Đã xóa dòng (chưa lưu GitHub).", "info");
      })
    );
    $$(".btn-edit").forEach((b) =>
      b.addEventListener("click", () => {
        const row = state.store.rows.find((r) => r.id === b.dataset.id);
        if (row) fillForm(row);
      })
    );

    $("#metaLine").textContent = `Dòng: ${rows.length} · Cập nhật: ${state.store.meta.updatedBy || "—"} ${
      state.store.meta.updatedAt || ""
    }`;
  }

  function truncate(s, n) {
    s = String(s || "");
    return s.length > n ? s.slice(0, n) + "…" : s;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillForm(row) {
    $("#f_id").value = row.id || "";
    $("#f_E").value = row.E || "";
    $("#f_F").value = row.F || "";
    $("#f_G").value = row.G || "";
    $("#f_D").value = row.D || "PHC";
    $("#f_I").value = row.I ?? "";
    $("#f_J").value = row.J ?? "";
    $("#f_days").value = (row.days || []).join(",");
    $("#f_A").value = row.A || "";
    setStatus(`Đang sửa dòng ${row.F || row.id}`, "info");
  }

  function readForm() {
    const daysRaw = $("#f_days").value.trim();
    const days = daysRaw
      ? daysRaw.split(/[,;\s]+/).map((x) => Number(x)).filter((x) => Number.isFinite(x))
      : [];
    const id = $("#f_id").value || undefined;
    return TruNoLogic.newRow({
      id,
      A: $("#f_A").value || new Date().toISOString().slice(0, 10),
      D: $("#f_D").value || "PHC",
      E: $("#f_E").value.trim(),
      F: $("#f_F").value.trim(),
      G: $("#f_G").value.trim(),
      I: $("#f_I").value === "" ? null : Number($("#f_I").value),
      J: $("#f_J").value === "" ? 0 : Number($("#f_J").value),
      days,
      updatedBy: currentUser().name,
      updatedAt: new Date().toISOString(),
    });
  }

  function clearForm() {
    $("#f_id").value = "";
    $("#f_E").value = "";
    $("#f_F").value = "";
    $("#f_G").value = "";
    $("#f_I").value = "";
    $("#f_J").value = "";
    $("#f_days").value = "";
    $("#f_A").value = new Date().toISOString().slice(0, 10);
  }

  async function loadRemote() {
    setStatus("Đang tải dữ liệu…", "info");
    try {
      const data = await storeApi.load();
      if (data && Array.isArray(data.rows)) {
        state.store = {
          ...state.store,
          ...data,
          users: data.users?.length ? data.users : state.store.users,
          rows: data.rows,
        };
        recompute();
        renderUsers();
        setStatus(`Đã tải ${state.store.rows.length} dòng (GitHub/local).`, "ok");
      } else {
        setStatus("Chưa có store online — dùng mẫu demo hoặc thêm dòng mới.", "info");
      }
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  async function saveRemote() {
    const user = currentUser();
    state.store.meta.updatedAt = new Date().toISOString();
    state.store.meta.updatedBy = user.name;
    state.store.rows = TruNoLogic.autoFill(state.store.rows);

    setStatus("Đang lưu lên GitHub…", "info");
    try {
      await storeApi.save(
        state.store,
        `data: update by ${user.name} @ ${state.store.meta.updatedAt}`,
        user.name
      );
      setStatus(`Đã lưu GitHub bởi ${user.name}.`, "ok");
    } catch (e) {
      storeApi.cacheLocal(state.store);
      setStatus(String(e.message || e), "err");
    }
  }

  function bind() {
    $("#userSelect").addEventListener("change", (e) => {
      state.userId = e.target.value;
      localStorage.setItem("truno_user", state.userId);
      setStatus(`Đang làm việc với tư cách ${currentUser().name}`, "info");
    });

    $("#btnSaveRow").addEventListener("click", () => {
      const row = readForm();
      if (!row.E || !row.F) {
        setStatus("Cần nhập Số phiếu (E) và Mã VT (F).", "err");
        return;
      }
      const idx = state.store.rows.findIndex((r) => r.id === row.id);
      if (idx >= 0) state.store.rows[idx] = { ...state.store.rows[idx], ...row };
      else state.store.rows.push(row);
      recompute();
      clearForm();
      setStatus("Đã thêm/cập nhật dòng — nhớ Lưu GitHub.", "ok");
    });

    $("#btnClearForm").addEventListener("click", clearForm);
    $("#btnRecalc").addEventListener("click", () => {
      recompute();
      setStatus("Đã tính lại I/K/L/M/AT/AU theo quy tắc VBA.", "ok");
    });
    $("#btnDemo").addEventListener("click", () => {
      if (state.store.rows.length && !confirm("Thay bằng dữ liệu mẫu demo?")) return;
      state.store.rows = TruNoLogic.sampleData();
      recompute();
      setStatus("Đã nạp mẫu: OI2601482 → OI2602483 → OI2602489 (009200 quét lùi).", "ok");
    });
    $("#btnLoad").addEventListener("click", loadRemote);
    $("#btnSaveGh").addEventListener("click", saveRemote);

    $("#btnToken").addEventListener("click", () => {
      const t = prompt("GitHub Personal Access Token (scope: repo / contents write):", storeApi.token || "");
      if (t === null) return;
      storeApi.setToken(t);
      setStatus(t ? "Đã lưu token trên trình duyệt (localStorage)." : "Đã xóa token.", "ok");
    });

    $("#btnExport").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.store, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `truno-export-${Date.now()}.json`;
      a.click();
    });

    $("#fileImport").addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        if (Array.isArray(data.rows)) state.store = { ...state.store, ...data };
        else if (Array.isArray(data)) state.store.rows = data;
        else throw new Error("JSON không hợp lệ");
        recompute();
        renderUsers();
        setStatus("Đã import JSON.", "ok");
      } catch (err) {
        setStatus("Import lỗi: " + err.message, "err");
      }
      e.target.value = "";
    });
  }

  async function init() {
    $("#f_A").value = new Date().toISOString().slice(0, 10);
    $("#tokenHint").textContent = storeApi.token ? "Token: đã cấu hình" : "Token: chưa có";
    renderUsers();
    bind();
    await loadRemote();
    if (!state.store.rows.length) {
      state.store.rows = TruNoLogic.sampleData();
      recompute();
      setStatus("Nạp mẫu demo (chưa có dữ liệu remote).", "info");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
