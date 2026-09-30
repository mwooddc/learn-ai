// Learn AI — shared helpers used by every stop.
// Progress is a per-browser convenience only: it must never be required for a page to work.
(function () {
  const KEY = "learnai.progress.v1";

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function writeProgress(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ }
  }

  // Reveal a hidden section and bring it into view. Sections unlock in order so
  // learners build each idea before meeting the next one.
  function reveal(id, { scroll = true } = {}) {
    const sec = document.getElementById(id);
    if (!sec) return;
    const wasHidden = sec.hidden;
    sec.hidden = false;
    if (wasHidden) sec.classList.add("reveal");
    updateProgressBar();
    if (scroll && wasHidden) {
      requestAnimationFrame(() => sec.scrollIntoView({ block: "start" }));
    }
    if (wasHidden) sec.dispatchEvent(new CustomEvent("revealed"));
  }

  function updateProgressBar() {
    const bar = document.getElementById("progress");
    if (!bar) return;
    const secs = [...document.querySelectorAll("main .section")];
    if (!secs.length) return;
    const shown = secs.filter((s) => !s.hidden).length;
    bar.style.width = Math.round((shown / secs.length) * 100) + "%";
  }

  window.LearnAI = {
    reveal,
    updateProgressBar,
    markComplete(stopId) {
      const p = readProgress();
      p[stopId] = { done: true, at: new Date().toISOString() };
      writeProgress(p);
    },
    isComplete(stopId) {
      return !!(readProgress()[stopId] || {}).done;
    },
  };

  // Any button with data-reveal="sectionId" unlocks that section.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reveal]");
    if (!btn) return;
    reveal(btn.dataset.reveal);
    btn.hidden = true;
  });

  document.addEventListener("DOMContentLoaded", updateProgressBar);

  /* ---------- themes ---------- */
  // Each page's <head> applies the saved theme before first paint (no flash);
  // this builds the picker in the top bar.
  const THEME_KEY = "learnai.theme";
  const THEMES = [
    { id: "auto", name: "Match my device", bg: "linear-gradient(90deg,#f6f3ec 50%,#14130f 50%)", accent: "#2b59e0" },
    { id: "paper", name: "Paper", bg: "#f6f3ec", accent: "#2b59e0" },
    { id: "snow", name: "Snow", bg: "#ffffff", accent: "#2458d6" },
    { id: "violet", name: "Violet", bg: "#f5f5f5", accent: "#8a2be2" },
    { id: "night", name: "Night", bg: "#14130f", accent: "#7c9cff" },
    { id: "coral", name: "Coral", bg: "#1a1a2e", accent: "#e94560" },
    { id: "slate", name: "Slate", bg: "#2c3e50", accent: "#1abc9c" },
    { id: "contrast", name: "High contrast", bg: "#000000", accent: "#ffd400" },
  ];

  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || "slate"; } catch (e) { return "slate"; }
  }
  function applyTheme(id) {
    if (id === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = id;
    try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* storage unavailable */ }
  }

  function buildPicker() {
    const bar = document.querySelector(".bar-inner");
    if (!bar) return;
    const wrap = document.createElement("div");
    wrap.className = "theme-picker";
    wrap.innerHTML = `
      <button class="theme-btn" aria-haspopup="true" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>
        <span class="label">Theme</span></button>
      <div class="theme-menu" role="radiogroup" aria-label="Colour theme" hidden>
        ${THEMES.map((t) => `<button class="theme-option" role="radio" data-theme-id="${t.id}">
          <span class="swatch" style="background:linear-gradient(135deg,transparent 55%,${t.accent} 55%),${t.bg}"></span>${t.name}</button>`).join("")}
      </div>`;
    bar.appendChild(wrap);

    const btn = wrap.querySelector(".theme-btn");
    const menu = wrap.querySelector(".theme-menu");
    const sync = () => menu.querySelectorAll(".theme-option").forEach((o) =>
      o.setAttribute("aria-checked", o.dataset.themeId === currentTheme()));
    const open = (on) => {
      menu.hidden = !on;
      btn.setAttribute("aria-expanded", on);
      if (on) { sync(); menu.querySelector('[aria-checked="true"]').focus(); }
    };

    btn.addEventListener("click", () => open(menu.hidden));
    menu.addEventListener("click", (e) => {
      const o = e.target.closest("[data-theme-id]");
      if (!o) return;
      applyTheme(o.dataset.themeId);
      sync();
      open(false);
      btn.focus();
    });
    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) open(false); });
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { open(false); btn.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const opts = [...menu.querySelectorAll(".theme-option")];
        const i = opts.indexOf(document.activeElement);
        if (i === -1) return;
        e.preventDefault();
        opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1)) % opts.length].focus();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildPicker);
  else buildPicker();
})();
