window.__ModuleLoader__.load({
  id: "dsh-memory-drive",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
    var React = require("react");
    var h = React.createElement;
    var BUNDLE_NAME = "dsh-memory-drive";
    var LOCALE_NS = "dsh-memory-drive";
    var inject = ["slots", "locale"];
    var API = "/api/memory-drive";

    var zh = {
      title: "记忆云盘",
      subtitle: "统一管理 DSH 记忆插件的记忆文件，并同步到网盘。",
      tabFiles: "记忆文件",
      tabSync: "同步",
      tabDrives: "网盘",
      tabSettings: "设置",
      loading: "加载中…",
      notLoaded: "宿主侧的 memory-drive 插件尚未加载：重启 DSH 后再打开本页。",
      sources: "记忆来源",
      files: "文件",
      pickFile: "从左侧选择一个记忆文件查看或编辑。",
      editorHint: "文件内容（Markdown）",
      save: "保存",
      saving: "保存中…",
      delete: "删除",
      deleted: "已移入回收站",
      deleteConfirm: "确定删除这个记忆文件？文件会被移到插件回收站，可手动恢复。",
      conflict: "文件在别处被修改过，请重新加载后再保存。",
      reload: "重新加载",
      saved: "已保存",
      bytes: "字节",
      updated: "更新于",
      noFiles: "这个来源下没有可显示的记忆文件。",
      syncTitle: "同步",
      syncTarget: "同步网盘",
      syncNone: "未选择同步网盘",
      syncHint: "一个插件只允许一个同步网盘（拉取+推送，带基线），其他网盘只能做上传备份。",
      lastSync: "上次同步",
      neverSynced: "从未同步",
      syncBoth: "同步（拉取 + 推送）",
      syncPull: "仅从网盘拉取",
      syncPush: "仅推送到网盘",
      backupNow: "备份到其他网盘",
      syncing: "同步中…",
      syncDone: "同步完成",
      pulled: "拉取",
      pushed: "推送",
      conflictCount: "冲突",
      skipped: "跳过",
      errors: "错误",
      drivesTitle: "网盘",
      drivesHint: "优先使用网盘客户端提供的本地同步文件夹；也可以添加自定义目录或 WebDAV。",
      primary: "设为同步网盘",
      backup: "加入备份",
      setPrimary: "设为同步网盘（只选一个）",
      addBackup: "加入备份（可多选，只上传）",
      detected: "已检测到",
      notDetected: "未检测到",
      addFolder: "添加自定义同步目录",
      addFolderHint: "填入网盘客户端暴露在本地、且会自动上传的文件夹路径。",
      add: "添加",
      remove: "移除",
      test: "测试连接",
      providerOk: "连接正常",
      providerFail: "连接失败",
      settingsTitle: "设置",
      autoPull: "DSH 启动后自动从网盘拉取",
      autoPush: "每轮对话结束后自动推送",
      injectMemory: "把云盘记忆注入系统提示词",
      injectMax: "注入最大字符数",
      sourceSync: "参与云同步的记忆来源",
      saveSettings: "保存设置",
      sourceWorkBuddyWarn: "WorkBuddy 目录默认由 huaweicloud-memory-sync 技能管理，建议不参与本插件的云同步。",
      offline: "无法连接宿主路由",
      path: "路径",
      unknown: "未知",
      confirmRemove: "移除这个网盘配置？已同步的数据不会被删除。"
    };
    var en = {
      title: "Memory Drive",
      subtitle: "One place for DSH memory-plugin files, synced to your cloud drive.",
      tabFiles: "Files",
      tabSync: "Sync",
      tabDrives: "Drives",
      tabSettings: "Settings",
      loading: "Loading…",
      notLoaded: "The host half of memory-drive is not loaded yet. Restart DSH, then reopen this page.",
      sources: "Memory sources",
      files: "Files",
      pickFile: "Pick a memory file on the left to view or edit.",
      editorHint: "File content (Markdown)",
      save: "Save",
      saving: "Saving…",
      delete: "Delete",
      deleted: "Moved to trash",
      deleteConfirm: "Delete this memory file? It will be moved to the plugin trash and can be restored manually.",
      conflict: "This file changed elsewhere; reload before saving.",
      reload: "Reload",
      saved: "Saved",
      bytes: "bytes",
      updated: "updated",
      noFiles: "No visible memory files in this source.",
      syncTitle: "Sync",
      syncTarget: "Sync drive",
      syncNone: "No sync drive selected",
      syncHint: "Only one drive is allowed as the sync target (pull + push with a baseline). Other drives can only receive uploads.",
      lastSync: "Last sync",
      neverSynced: "Never",
      syncBoth: "Sync (pull + push)",
      syncPull: "Pull from drive",
      syncPush: "Push to drive",
      backupNow: "Back up to other drives",
      syncing: "Syncing…",
      syncDone: "Sync finished",
      pulled: "pulled",
      pushed: "pushed",
      conflictCount: "conflicts",
      skipped: "skipped",
      errors: "errors",
      drivesTitle: "Drives",
      drivesHint: "Prefer the local sync folder exposed by each cloud-drive client; custom folders and WebDAV are also supported.",
      primary: "Use for sync",
      backup: "Add to backups",
      setPrimary: "Use for sync (choose one)",
      addBackup: "Add to backups (upload only)",
      detected: "detected",
      notDetected: "not detected",
      addFolder: "Add a custom sync folder",
      addFolderHint: "Enter the local folder that your cloud-drive client uploads automatically.",
      add: "Add",
      remove: "Remove",
      test: "Test",
      providerOk: "Reachable",
      providerFail: "Unreachable",
      settingsTitle: "Settings",
      autoPull: "Pull from the drive after DSH starts",
      autoPush: "Push after each turn",
      injectMemory: "Inject synced memory into the system prompt",
      injectMax: "Max injected characters",
      sourceSync: "Sources included in cloud sync",
      saveSettings: "Save settings",
      sourceWorkBuddyWarn: "The WorkBuddy tree is managed by the huaweicloud-memory-sync skill by default; keeping it out of this plugin's sync is recommended.",
      offline: "Cannot reach host routes",
      path: "Path",
      unknown: "unknown",
      confirmRemove: "Remove this drive configuration? Already-synced data is not deleted."
    };

    var S = {
      card: {
        border: "0.5px solid var(--dsw-alias-settings-card-stroke, rgba(127,127,127,0.28))",
        borderRadius: "var(--dsw-radius-lg, 12px)",
        background: "var(--dsw-alias-settings-card-fill, rgba(32,32,32,0.96))",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        color: "var(--dsw-alias-label-primary, #e6e6e6)"
      },
      header: { display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" },
      title: { fontSize: 15, fontWeight: 600, lineHeight: "22px" },
      subtitle: { fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary, #9a9a9a)" },
      tabs: { display: "flex", gap: 4, borderBottom: "0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))", paddingBottom: 6 },
      tab: { appearance: "none", border: "none", background: "transparent", padding: "4px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "var(--dsw-alias-label-secondary, #bbb)" },
      tabActive: { background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.12))", color: "var(--dsw-alias-label-primary, #fff)" },
      row: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
      hint: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary, #9a9a9a)" },
      chip: { border: "1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))", borderRadius: 999, padding: "3px 10px", fontSize: 12, cursor: "pointer", background: "transparent", color: "inherit" },
      chipActive: { borderColor: "var(--dsw-alias-label-primary, #fff)", background: "var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.14))" },
      list: { width: 240, maxHeight: 360, overflow: "auto", border: "0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25))", borderRadius: 8, padding: 4 },
      listItem: { display: "block", width: "100%", textAlign: "left", appearance: "none", border: "none", background: "transparent", color: "inherit", padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12 },
      listItemActive: { background: "var(--dsw-alias-bg-layer-3, rgba(127,127,127,0.2))" },
      main: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
      editorWrap: { flex: "1 1 420px", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 },
      textarea: { width: "100%", minHeight: 300, resize: "vertical", fontSize: 12, lineHeight: 1.55, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", padding: 10, borderRadius: 8, border: "0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))", background: "var(--dsw-alias-bg-layer-1, rgba(0,0,0,0.2))", color: "inherit" },
      button: { appearance: "none", border: "1px solid transparent", borderRadius: "var(--dsw-radius-md, 8px)", padding: "5px 14px", font: "inherit", fontSize: 13, lineHeight: 1.5, cursor: "pointer", background: "var(--dsw-alias-label-primary, #fff)", color: "var(--dsw-alias-bg-layer-3, #111)" },
      buttonGhost: { appearance: "none", border: "0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.35))", borderRadius: "var(--dsw-radius-md, 8px)", padding: "5px 12px", font: "inherit", fontSize: 13, lineHeight: 1.5, cursor: "pointer", background: "transparent", color: "inherit" },
      buttonDanger: { color: "var(--dsw-alias-state-error-primary, #ff6b6b)", border: "0.5px solid var(--dsw-alias-state-error-primary, #ff6b6b)", background: "transparent" },
      buttonDisabled: { opacity: 0.45, cursor: "default" },
      note: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary, #bbb)" },
      error: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-state-error-primary, #ff6b6b)" },
      ok: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-state-success-primary, #62d18b)" },
      kv: { fontSize: 12, lineHeight: "20px", color: "var(--dsw-alias-label-secondary, #bbb)" },
      panel: { display: "flex", flexDirection: "column", gap: 10 },
      field: { display: "flex", flexDirection: "column", gap: 4 },
      input: { padding: "6px 8px", borderRadius: 6, border: "0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.3))", background: "var(--dsw-alias-bg-layer-1, rgba(0,0,0,0.2))", color: "inherit", fontSize: 12 },
      providerRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.18))" },
      grow: { flex: 1, minWidth: 0 }
    };

    function fmtBytes(n) {
      if (!Number.isFinite(n)) return "?";
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KiB";
      return (n / 1024 / 1024).toFixed(1) + " MiB";
    }
    function fmtTime(ms) {
      if (!ms) return "—";
      try { return new Date(ms).toLocaleString() } catch { return String(ms) }
    }
    async function api(path, init) {
      var res = await fetch(API + path, { headers: { Accept: "application/json", ...(init && init.headers ? init.headers : {}) }, ...(init || {}) });
      var data = null;
      try { data = await res.json() } catch { data = null }
      if (!res.ok) {
        var message = data && data.error ? data.error : "HTTP " + res.status;
        var err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    }
    function buttonStyle(baseStyle, disabled, extra) {
      var style = { ...baseStyle };
      if (extra) style = { ...style, ...extra };
      if (disabled) style = { ...style, ...S.buttonDisabled };
      return style;
    }

    function MemoryDriveCard(props) {
      var t = props.t;
      var _s = React.useState(null), status = _s[0], setStatus = _s[1];
      var _e = React.useState(""), error = _e[0], setError = _e[1];
      var _n = React.useState(""), notice = _n[0], setNotice = _n[1];
      var _tab = React.useState("files"), tab = _tab[0], setTab = _tab[1];
      var _src = React.useState(""), sourceId = _src[0], setSourceId = _src[1];
      var _files = React.useState([]), files = _files[0], setFiles = _files[1];
      var _sel = React.useState(null), selected = _sel[0], setSelected = _sel[1];
      var _content = React.useState(""), content = _content[0], setContent = _content[1];
      var _hash = React.useState(""), baseHash = _hash[0], setBaseHash = _hash[1];
      var _dirty = React.useState(false), dirty = _dirty[0], setDirty = _dirty[1];
      var _busy = React.useState(false), busy = _busy[0], setBusy = _busy[1];
      var _syncResult = React.useState(null), syncResult = _syncResult[0], setSyncResult = _syncResult[1];
      var _newDir = React.useState(""), newDir = _newDir[0], setNewDir = _newDir[1];
      var _settings = React.useState(null), settings = _settings[0], setSettings = _settings[1];
      var _providerTest = React.useState({}), providerTest = _providerTest[0], setProviderTest = _providerTest[1];

      async function loadStatus(keepSource) {
        try {
          var data = await api("/status");
          setStatus(data);
          setSettings(data.config);
          var sources = data.sources || [];
          var next = keepSource && sources.some(function (s) { return s.id === sourceId }) ? sourceId : (sources[0] ? sources[0].id : "");
          if (!sourceId || !sources.some(function (s) { return s.id === sourceId; })) setSourceId(next);
          if (next) await loadFiles(next);
          if (data.config && data.config.injectMemory !== undefined) setSettings(data.config);
          setError("");
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        }
      }
      async function loadFiles(sid) {
        try {
          var data = await api("/files?source=" + encodeURIComponent(sid));
          setFiles(data.files || []);
          setSelected(null);
          setContent("");
          setBaseHash("");
          setDirty(false);
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        }
      }
      async function openFile(file) {
        setSelected(file);
        setNotice("");
        try {
          var data = await api("/file?source=" + encodeURIComponent(file.source) + "&root=" + encodeURIComponent(file.root) + "&path=" + encodeURIComponent(file.path));
          setContent(data.content || "");
          setBaseHash(data.hash || "");
          setDirty(false);
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        }
      }
      async function saveFile() {
        if (!selected) return;
        setBusy(true); setError(""); setNotice("");
        try {
          var data = await api("/file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: selected.source, root: selected.root, path: selected.path, content: content, baseHash: baseHash })
          });
          setBaseHash(data.hash || "");
          setDirty(false);
          setNotice(t("saved"));
          await loadFiles(sourceId);
        } catch (err) {
          if (err.status === 409) setError(t("conflict"));
          else setError(String(err && err.message ? err.message : err));
        } finally { setBusy(false); }
      }
      async function deleteFile() {
        if (!selected) return;
        if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("deleteConfirm"))) return;
        setBusy(true); setError(""); setNotice("");
        try {
          await api("/file?source=" + encodeURIComponent(selected.source) + "&root=" + encodeURIComponent(selected.root) + "&path=" + encodeURIComponent(selected.path) + "&confirm=1", { method: "DELETE" });
          setNotice(t("deleted"));
          setSelected(null); setContent(""); setBaseHash(""); setDirty(false);
          await loadFiles(sourceId);
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        } finally { setBusy(false); }
      }
      async function runSync(mode) {
        setBusy(true); setError(""); setNotice(""); setSyncResult(null);
        try {
          var data = await api("/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: mode }) });
          setSyncResult(data);
          if (data && data.ok === false) setError((data.errors || []).join("; ") || t("providerFail"));
          else setNotice(t("syncDone"));
          await loadStatus(true);
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        } finally { setBusy(false); }
      }
      async function patchConfig(patch) {
        setBusy(true); setError(""); setNotice("");
        try {
          var data = await api("/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
          setSettings(data.config);
          await loadStatus(true);
          setNotice(t("saved"));
        } catch (err) {
          setError(String(err && err.message ? err.message : err));
        } finally { setBusy(false); }
      }
      async function testProvider(id) {
        setProviderTest({ ...providerTest, [id]: { state: "loading" } });
        try {
          var data = await api("/provider/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id }) });
          setProviderTest({ ...providerTest, [id]: { state: "ok", detail: (data.files || 0) + " files" } });
        } catch (err) {
          setProviderTest({ ...providerTest, [id]: { state: "fail", detail: String(err && err.message ? err.message : err) } });
        }
      }
      async function addCustomFolder() {
        var dir = String(newDir || "").trim();
        if (!dir) return;
        var cfg = settings || {};
        var providers = Array.isArray(cfg.providers) ? cfg.providers.slice() : [];
        var id = "folder:custom-" + Date.now().toString(36);
        providers.push({ id: id, type: "folder", label: dir.split(/[\\/]/).filter(Boolean).pop() || "custom", root: dir });
        setNewDir("");
        await patchConfig({ providers: providers });
      }
      async function removeProvider(id) {
        if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("confirmRemove"))) return;
        var cfg = settings || {};
        var providers = (Array.isArray(cfg.providers) ? cfg.providers : []).filter(function (p) { return p && p.id !== id; });
        await patchConfig({ providers: providers });
      }

      React.useEffect(function () { loadStatus(); }, []);

      if (error && !status) {
        return h("div", { style: S.card }, h("div", { style: S.title }, t("title")), h("p", { style: S.error }, t("notLoaded")), h("p", { style: S.hint }, error));
      }
      if (!status) {
        return h("div", { style: S.card }, h("div", { style: S.title }, t("title")), h("p", { style: S.hint }, t("loading")));
      }

      var sources = status.sources || [];
      var providers = status.providers || [];
      var currentSource = sources.filter(function (s) { return s.id === sourceId; })[0] || null;
      var syncProvider = providers.filter(function (p) { return p.sync; })[0] || null;

      var header = h("div", { style: S.header }, [
        h("div", { style: S.title, key: "t" }, t("title")),
        h("div", { style: S.subtitle, key: "s" }, t("subtitle"))
      ]);

      var tabDefs = [["files", t("tabFiles")], ["sync", t("tabSync")], ["drives", t("tabDrives")], ["settings", t("tabSettings")]];
      var tabs = h("div", { style: S.tabs }, tabDefs.map(function (def) {
        var active = tab === def[0];
        return h("button", { key: def[0], type: "button", style: { ...S.tab, ...(active ? S.tabActive : {}) }, onClick: function () { setTab(def[0]); } }, def[1]);
      }));

      var body = null;
      if (tab === "files") {
        var sourceChips = h("div", { style: S.row }, sources.map(function (s) {
          var active = s.id === sourceId;
          return h("button", { key: s.id, type: "button", style: { ...S.chip, ...(active ? S.chipActive : {}) }, onClick: function () { setSourceId(s.id); loadFiles(s.id); } }, s.label.zh + " (" + (s.fileCount || 0) + ")");
        }));
        var list = h("div", { style: S.list }, files.length === 0 ? h("p", { style: { ...S.hint, padding: 8 } }, t("noFiles")) : files.map(function (f) {
          var active = selected && selected.source === f.source && selected.root === f.root && selected.path === f.path;
          return h("button", {
            key: f.source + "/" + f.root + "/" + f.path,
            type: "button",
            title: f.path,
            style: { ...S.listItem, ...(active ? S.listItemActive : {}) },
            onClick: function () { openFile(f); }
          }, [
            h("span", { key: "p", style: { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, f.path),
            h("span", { key: "m", style: { display: "block", fontSize: 11, opacity: 0.65 } }, fmtBytes(f.size) + " · " + fmtTime(f.mtime))
          ]);
        }));
        var editor = h("div", { style: S.editorWrap }, [
          selected ? h("div", { key: "meta", style: S.kv }, [t("path") + ": " + selected.path, h("br", { key: "br" }), fmtBytes(selected.size) + " · " + t("updated") + " " + fmtTime(selected.mtime)]) : h("p", { key: "empty", style: S.hint }, t("pickFile")),
          selected ? h("textarea", { key: "ta", style: S.textarea, value: content, onChange: function (e) { setContent(e.target.value); setDirty(true); } }) : null,
          selected ? h("div", { key: "actions", style: S.row }, [
            h("button", { key: "save", type: "button", style: buttonStyle(S.button, busy || !dirty), disabled: busy || !dirty, onClick: saveFile }, busy ? t("saving") : t("save")),
            h("button", { key: "reload", type: "button", style: S.buttonGhost, disabled: busy, onClick: function () { openFile(selected); } }, t("reload")),
            h("button", { key: "delete", type: "button", style: { ...S.buttonGhost, ...S.buttonDanger }, disabled: busy, onClick: deleteFile }, t("delete"))
          ]) : null
        ]);
        body = h("div", { style: S.panel }, [sourceChips, h("div", { style: S.main }, [list, editor])]);
      } else if (tab === "sync") {
        var last = status.lastSync;
        body = h("div", { style: S.panel }, [
          h("div", { key: "kv", style: S.kv }, [
            t("syncTarget") + ": " + (syncProvider ? (syncProvider.label.zh + " · " + (syncProvider.root || syncProvider.url || "")) : t("syncNone")),
            h("br", { key: "br1" }),
            t("lastSync") + ": " + (last ? fmtTime(last.at) + " · " + last.files + " files" : t("neverSynced"))
          ]),
          h("p", { key: "hint", style: S.hint }, t("syncHint")),
          h("div", { key: "buttons", style: S.row }, [
            h("button", { key: "both", type: "button", style: S.button, disabled: busy, onClick: function () { runSync("both"); } }, busy ? t("syncing") : t("syncBoth")),
            h("button", { key: "pull", type: "button", style: S.buttonGhost, disabled: busy, onClick: function () { runSync("pull"); } }, t("syncPull")),
            h("button", { key: "push", type: "button", style: S.buttonGhost, disabled: busy, onClick: function () { runSync("push"); } }, t("syncPush")),
            h("button", { key: "backup", type: "button", style: S.buttonGhost, disabled: busy, onClick: function () { runSync("backup"); } }, t("backupNow"))
          ]),
          syncResult ? h("div", { key: "result", style: S.kv }, [
            t("syncDone") + ": " + t("pulled") + "=" + syncResult.pulled + " · " + t("pushed") + "=" + syncResult.pushed + " · " + t("conflictCount") + "=" + syncResult.conflicts + " · " + t("skipped") + "=" + syncResult.skipped,
            (syncResult.errors && syncResult.errors.length) ? h("div", { key: "errs", style: S.error }, syncResult.errors.join("; ")) : null
          ]) : null
        ]);
      } else if (tab === "drives") {
        body = h("div", { style: S.panel }, [
          h("p", { key: "hint", style: S.hint }, t("drivesHint")),
          h("div", { key: "providers" }, providers.map(function (p) {
            var test = providerTest[p.id];
            var testText = test && test.state === "ok" ? t("providerOk") + " · " + test.detail : test && test.state === "fail" ? t("providerFail") + " · " + test.detail : "";
            return h("div", { key: p.id, style: S.providerRow }, [
              h("div", { key: "info", style: { ...S.grow, display: "flex", flexDirection: "column", gap: 2 } }, [
                h("span", { key: "name", style: { fontSize: 13, fontWeight: 500 } }, p.label.zh + " · " + p.type + (p.detected ? " · " + t("detected") : p.configured ? "" : " · " + t("notDetected"))),
                h("span", { key: "path", style: { fontSize: 11, opacity: 0.7, wordBreak: "break-all" } }, p.root || p.url || ""),
                testText ? h("span", { key: "test", style: test && test.state === "ok" ? S.ok : S.error }, testText) : null
              ]),
              h("label", { key: "primary", style: { display: "flex", alignItems: "center", gap: 4, fontSize: 12 } }, [
                h("input", { key: "r", type: "radio", "aria-label": p.label.zh + " · " + t("setPrimary"), checked: p.sync, disabled: !p.configured || busy, onChange: function () { patchConfig({ syncProviderId: p.id }); } }),
                t("primary")
              ]),
              h("label", { key: "backup", style: { display: "flex", alignItems: "center", gap: 4, fontSize: 12 } }, [
                h("input", {
                  key: "c", type: "checkbox", "aria-label": p.label.zh + " · " + t("addBackup"), checked: p.backup, disabled: !p.configured || p.sync || busy,
                  onChange: function (e) {
                    var ids = (providers.filter(function (x) { return x.backup; }).map(function (x) { return x.id; }));
                    if (e.target.checked) { if (ids.indexOf(p.id) < 0) ids.push(p.id); } else { ids = ids.filter(function (id) { return id !== p.id; }); }
                    patchConfig({ backupProviderIds: ids });
                  }
                }),
                t("backup")
              ]),
              h("button", { key: "test", type: "button", style: S.buttonGhost, disabled: !p.configured || busy, onClick: function () { testProvider(p.id); } }, t("test")),
              (p.kind === "custom" || p.kind === "webdav") ? h("button", { key: "remove", type: "button", style: { ...S.buttonGhost, ...S.buttonDanger }, disabled: busy, onClick: function () { removeProvider(p.id); } }, t("remove")) : null
            ]);
          })),
          h("div", { key: "add", style: { ...S.field, marginTop: 10 } }, [
            h("span", { key: "l", style: { fontSize: 12, fontWeight: 500 } }, t("addFolder")),
            h("span", { key: "h", style: S.hint }, t("addFolderHint")),
            h("div", { key: "row", style: S.row }, [
              h("input", { key: "i", style: { ...S.input, flex: "1 1 320px" }, value: newDir, placeholder: "C:\\Users\\you\\Quark", onChange: function (e) { setNewDir(e.target.value); } }),
              h("button", { key: "b", type: "button", style: S.button, disabled: busy || !newDir.trim(), onClick: addCustomFolder }, t("add"))
            ])
          ])
        ]);
      } else {
        var cfg = settings || status.config || {};
        var sourceToggles = h("div", { style: S.field }, [
          h("span", { key: "l", style: { fontSize: 12, fontWeight: 500 } }, t("sourceSync")),
          sources.map(function (s) {
            var checked = s.sync;
            return h("label", { key: s.id, style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "3px 0" } }, [
              h("input", {
                key: "c", type: "checkbox", checked: checked,
                onChange: function (e) {
                  var map = { ...(cfg.sourceSync || {}) };
                  map[s.id] = e.target.checked;
                  setSettings({ ...cfg, sourceSync: map });
                }
              }),
              s.label.zh,
              s.id === "workbuddy-memory" ? h("span", { key: "w", style: { opacity: 0.65 } }, "(" + t("sourceWorkBuddyWarn") + ")") : null
            ]);
          })
        ]);
        var toggles = h("div", { style: S.field }, [
          h("label", { key: "pull", style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12 } }, [
            h("input", { key: "c", type: "checkbox", checked: cfg.autoPullOnStart !== false, onChange: function (e) { setSettings({ ...cfg, autoPullOnStart: e.target.checked }); } }), t("autoPull")
          ]),
          h("label", { key: "push", style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12 } }, [
            h("input", { key: "c", type: "checkbox", checked: cfg.autoPushOnTurnStop !== false, onChange: function (e) { setSettings({ ...cfg, autoPushOnTurnStop: e.target.checked }); } }), t("autoPush")
          ]),
          h("label", { key: "inject", style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12 } }, [
            h("input", { key: "c", type: "checkbox", checked: cfg.injectMemory === true, onChange: function (e) { setSettings({ ...cfg, injectMemory: e.target.checked }); } }), t("injectMemory")
          ]),
          h("label", { key: "max", style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12 } }, [
            t("injectMax"),
            h("input", { key: "i", type: "number", min: 500, max: 20000, step: 500, style: { ...S.input, width: 110 }, value: cfg.injectMaxChars || 4000, onChange: function (e) { setSettings({ ...cfg, injectMaxChars: Number(e.target.value) || 4000 }); } })
          ])
        ]);
        body = h("div", { style: S.panel }, [
          toggles,
          sourceToggles,
          h("div", { key: "save", style: S.row }, [
            h("button", {
              key: "b", type: "button", style: S.button, disabled: busy,
              onClick: function () {
                var payload = {
                  autoPullOnStart: settings.autoPullOnStart !== false,
                  autoPushOnTurnStop: settings.autoPushOnTurnStop !== false,
                  injectMemory: settings.injectMemory === true,
                  injectMaxChars: settings.injectMaxChars || 4000,
                  sourceSync: settings.sourceSync || {}
                };
                patchConfig(payload);
              }
            }, t("saveSettings"))
          ])
        ]);
      }

      return h("div", { style: S.card }, [
        header,
        tabs,
        error ? h("p", { key: "err", style: S.error }, error) : null,
        notice ? h("p", { key: "ok", style: S.ok }, notice) : null,
        body
      ]);
    }

    function apply(ctx) {
      ctx.effect(function () {
        return ctx.locale.register(LOCALE_NS, { zh: zh, en: en });
      }, "dsh-memory-drive: dictionaries");
      ctx.slots.inject("plugins.bundle.config", function () {
        return ctx.slots.register({ name: "plugins.bundle.config", key: BUNDLE_NAME, locale: LOCALE_NS }, function (seat) {
          return h(MemoryDriveCard, { t: seat.t });
        });
      });
    }

    module.exports = { apply: apply, inject: inject };
    return module.exports;
  }
});
