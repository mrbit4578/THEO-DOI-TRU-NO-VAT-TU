/**
 * GitHub Contents API — multi-user storage for data/store.json
 * Optimistic concurrency via file SHA.
 */
(function (global) {
  const DEFAULT = {
    owner: "mrbit4578",
    repo: "THEO-DOI-TRU-NO-VAT-TU",
    path: "data/store.json",
    branch: "main",
  };

  function b64EncodeUnicode(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  }

  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  }

  class GitHubStore {
    constructor(cfg = {}) {
      this.cfg = { ...DEFAULT, ...cfg };
      this.token = localStorage.getItem("truno_gh_token") || "";
      this.sha = null;
    }

    setToken(token) {
      this.token = (token || "").trim();
      if (this.token) localStorage.setItem("truno_gh_token", this.token);
      else localStorage.removeItem("truno_gh_token");
    }

    setRepo(owner, repo, branch) {
      if (owner) this.cfg.owner = owner;
      if (repo) this.cfg.repo = repo;
      if (branch) this.cfg.branch = branch;
      localStorage.setItem("truno_gh_cfg", JSON.stringify(this.cfg));
    }

    loadCfgFromStorage() {
      try {
        const s = localStorage.getItem("truno_gh_cfg");
        if (s) this.cfg = { ...this.cfg, ...JSON.parse(s) };
      } catch (_) {}
    }

    apiHeaders(json = true) {
      const h = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (json) h["Content-Type"] = "application/json";
      if (this.token) h.Authorization = `Bearer ${this.token}`;
      return h;
    }

    contentUrl() {
      const { owner, repo, path } = this.cfg;
      return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    }

    /** Load store — prefers API (auth), fallback raw + local */
    async load() {
      this.loadCfgFromStorage();
      // 1) GitHub API
      if (this.token) {
        try {
          const url = `${this.contentUrl()}?ref=${encodeURIComponent(this.cfg.branch)}`;
          const res = await fetch(url, { headers: this.apiHeaders(false) });
          if (res.ok) {
            const data = await res.json();
            this.sha = data.sha;
            const text = b64DecodeUnicode(data.content.replace(/\n/g, ""));
            return JSON.parse(text);
          }
          if (res.status === 404) {
            this.sha = null;
            return null;
          }
          throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
        } catch (e) {
          console.warn("API load failed", e);
        }
      }

      // 2) raw.githubusercontent (public)
      try {
        const raw = `https://raw.githubusercontent.com/${this.cfg.owner}/${this.cfg.repo}/${this.cfg.branch}/${this.cfg.path}?t=${Date.now()}`;
        const res = await fetch(raw, { cache: "no-store" });
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn("raw load failed", e);
      }

      // 3) relative path (local / Pages)
      try {
        const res = await fetch(`data/store.json?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) return await res.json();
      } catch (_) {}

      // 4) localStorage cache
      try {
        const loc = localStorage.getItem("truno_store_cache");
        if (loc) return JSON.parse(loc);
      } catch (_) {}

      return null;
    }

    /** Save store to GitHub (requires token with contents:write) */
    async save(store, message, userName) {
      if (!this.token) {
        // offline cache
        localStorage.setItem("truno_store_cache", JSON.stringify(store));
        throw new Error(
          "Chưa có GitHub Token — đã lưu tạm trình duyệt. Thêm PAT (repo scope) để đồng bộ online."
        );
      }

      const bodyObj = {
        message: message || `update data by ${userName || "user"}`,
        content: b64EncodeUnicode(JSON.stringify(store, null, 2)),
        branch: this.cfg.branch,
      };
      if (this.sha) bodyObj.sha = this.sha;

      const res = await fetch(this.contentUrl(), {
        method: "PUT",
        headers: this.apiHeaders(true),
        body: JSON.stringify(bodyObj),
      });

      if (res.status === 409 || res.status === 422) {
        // conflict — reload sha and ask retry
        const err = await res.json().catch(() => ({}));
        throw new Error(
          `Xung đột phiên bản (HTTP ${res.status}). Bấm Tải lại rồi Lưu lại. ${err.message || ""}`
        );
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Lưu GitHub thất bại ${res.status}: ${t}`);
      }
      const data = await res.json();
      this.sha = data.content?.sha || this.sha;
      localStorage.setItem("truno_store_cache", JSON.stringify(store));
      return data;
    }

    cacheLocal(store) {
      localStorage.setItem("truno_store_cache", JSON.stringify(store));
    }
  }

  global.GitHubStore = GitHubStore;
})(typeof window !== "undefined" ? window : globalThis);
