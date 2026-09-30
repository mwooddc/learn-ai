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
})();
