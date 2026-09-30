// Stop 2 · Everything is numbers
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const grey = (v) => `rgb(${v},${v},${v})`;
  const showOnce = (id) => { const b = document.getElementById(id); if (b && !b.dataset.shown) { b.hidden = false; b.dataset.shown = "1"; } };

  /* ================= PART 1: paint with numbers ================= */

  const SIZE = 12;
  const SMILEY = [
    "............",
    "...######...",
    "..#......#..",
    ".#........#.",
    ".#..#..#..#.",
    ".#.g....g.#.",
    ".#.#....#.#.",
    ".#..####..#.",
    "..#......#..",
    "...######...",
    "............",
    "............",
  ];
  const SMILEY_SHADES = { ".": 255, "#": 0, "g": 170 };
  const pixels = [];
  const loadSmiley = () => SMILEY.forEach((row, y) => [...row].forEach((ch, x) => { pixels[y * SIZE + x] = SMILEY_SHADES[ch]; }));
  loadSmiley();

  const pic = $("#paint-pic");
  const nums = $("#paint-nums");
  const picCells = [];
  const numCells = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const a = document.createElement("div"); a.className = "cell"; a.dataset.i = i; pic.appendChild(a); picCells.push(a);
    const b = document.createElement("div"); b.className = "cell"; nums.appendChild(b); numCells.push(b);
  }
  function drawCell(i) {
    picCells[i].style.backgroundColor = grey(pixels[i]);
    numCells[i].textContent = pixels[i];
    numCells[i].classList.toggle("dark", pixels[i] < 128);
  }
  const drawAll = () => pixels.forEach((_, i) => drawCell(i));
  drawAll();

  // Brush
  const brush = $("#brush");
  const PRESETS = [0, 85, 170, 255];
  const presetBox = $("#brush-presets");
  presetBox.innerHTML = PRESETS.map((v) => `<button class="brush-preset" data-v="${v}" style="background:${grey(v)}" aria-label="Brush brightness ${v}"></button>`).join("");
  function setBrush(v) {
    brush.value = v;
    $("#brush-value").textContent = v;
    $("#brush-swatch").style.backgroundColor = grey(v);
    presetBox.querySelectorAll(".brush-preset").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.v === +v));
  }
  presetBox.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) setBrush(b.dataset.v); });
  brush.addEventListener("input", () => setBrush(brush.value));
  setBrush(0);

  // Painting (mouse, pen and touch)
  let painting = false;
  let painted = 0;
  let hot = -1;
  const cellAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el && el.parentElement === pic ? +el.dataset.i : -1;
  };
  function setHot(i) {
    if (hot >= 0) { picCells[hot].classList.remove("hot"); numCells[hot].classList.remove("hot"); }
    hot = i;
    if (hot >= 0) { picCells[hot].classList.add("hot"); numCells[hot].classList.add("hot"); }
  }
  function paintAt(e) {
    const i = cellAt(e);
    setHot(i);
    if (!painting || i < 0) return;
    const v = +brush.value;
    if (pixels[i] !== v) {
      pixels[i] = v;
      drawCell(i);
      if (++painted >= 5) showOnce("c1");
    }
  }
  pic.addEventListener("pointerdown", (e) => { painting = true; pic.setPointerCapture(e.pointerId); paintAt(e); });
  pic.addEventListener("pointermove", paintAt);
  pic.addEventListener("pointerup", () => { painting = false; });
  pic.addEventListener("pointercancel", () => { painting = false; });
  pic.addEventListener("pointerleave", () => { if (!painting) setHot(-1); });

  $("#paint-clear").addEventListener("click", () => { pixels.fill(255); drawAll(); });
  $("#paint-smiley").addEventListener("click", () => { loadSmiley(); drawAll(); });

  /* ================= PART 2: resolution ================= */

  // Draw a detailed cat face once, off screen, then average it down into blocks.
  const SRC = 256;
  const src = document.createElement("canvas");
  src.width = src.height = SRC;
  (function drawCat(c) {
    const bg = c.createLinearGradient(0, 0, 0, SRC);
    bg.addColorStop(0, "#e2e2e2"); bg.addColorStop(1, "#b8b8b8");
    c.fillStyle = bg; c.fillRect(0, 0, SRC, SRC);
    const tri = (pts, fill) => { c.beginPath(); c.moveTo(...pts[0]); c.lineTo(...pts[1]); c.lineTo(...pts[2]); c.closePath(); c.fillStyle = fill; c.fill(); };
    tri([[52, 120], [66, 26], [124, 82]], "#3a3a3a");
    tri([[204, 120], [190, 26], [132, 82]], "#3a3a3a");
    tri([[68, 104], [74, 50], [108, 84]], "#8a8a8a");
    tri([[188, 104], [182, 50], [148, 84]], "#8a8a8a");
    const head = c.createRadialGradient(128, 130, 20, 128, 150, 100);
    head.addColorStop(0, "#5a5a5a"); head.addColorStop(1, "#262626");
    c.fillStyle = head; c.beginPath(); c.ellipse(128, 148, 88, 80, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ececec";
    c.beginPath(); c.ellipse(94, 132, 17, 21, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(162, 132, 17, 21, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#0e0e0e";
    c.beginPath(); c.ellipse(94, 134, 6, 15, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(162, 134, 6, 15, 0, 0, Math.PI * 2); c.fill();
    tri([[116, 168], [140, 168], [128, 182]], "#a6a6a6");
    c.strokeStyle = "#a6a6a6"; c.lineWidth = 3; c.lineCap = "round";
    c.beginPath(); c.moveTo(128, 182); c.quadraticCurveTo(122, 196, 110, 194); c.moveTo(128, 182); c.quadraticCurveTo(134, 196, 146, 194); c.stroke();
    c.strokeStyle = "#d8d8d8"; c.lineWidth = 2;
    [[-1, 176, 168], [-1, 184, 186], [-1, 192, 204], [1, 176, 168], [1, 184, 186], [1, 192, 204]].forEach(([s, y0, y1]) => {
      c.beginPath(); c.moveTo(128 + s * 30, y0); c.lineTo(128 + s * 110, y1); c.stroke();
    });
  })(src.getContext("2d"));
  const srcData = src.getContext("2d").getImageData(0, 0, SRC, SRC).data;

  const LEVELS = [4, 8, 16, 32, 64, 128];
  const NOTES = {
    4: "Just 16 numbers. Is that a cat? It could be almost anything.",
    8: "64 numbers. Can you make out the ears yet?",
    16: "256 numbers, the same as the cat at the end of Stop 1.",
    32: "1,024 numbers. Now it's clearly a cat.",
    64: "4,096 numbers. The whiskers appear.",
    128: "16,384 numbers, and this is still a very small picture.",
  };
  const resCanvas = $("#res-canvas");
  const rc = resCanvas.getContext("2d");
  function drawRes(n) {
    const block = SRC / n;
    for (let by = 0; by < n; by++) {
      for (let bx = 0; bx < n; bx++) {
        let sum = 0;
        for (let y = by * block; y < (by + 1) * block; y++)
          for (let x = bx * block; x < (bx + 1) * block; x++) sum += srcData[(y * SRC + x) * 4];
        const v = Math.round(sum / (block * block));
        rc.fillStyle = grey(v);
        rc.fillRect(bx * block, by * block, block, block);
        if (n <= 8) {
          rc.fillStyle = v < 128 ? "#fff" : "#000";
          rc.font = `600 ${Math.round(block * 0.26)}px "JetBrains Mono", monospace`;
          rc.textAlign = "center"; rc.textBaseline = "middle";
          rc.fillText(v, bx * block + block / 2, by * block + block / 2);
        }
      }
    }
    $("#res-size").textContent = `${n} × ${n}`;
    $("#res-count").textContent = (n * n).toLocaleString("en-GB");
    $("#res-note").textContent = NOTES[n];
  }
  const resSlider = $("#res-slider");
  resSlider.addEventListener("input", () => { drawRes(LEVELS[resSlider.value]); showOnce("c2"); });
  drawRes(LEVELS[resSlider.value]);
  // redraw once the number font has loaded so the labels use it
  if (document.fonts) document.fonts.ready.then(() => drawRes(LEVELS[resSlider.value]));

  /* ================= PART 3: colour ================= */

  const TARGETS = [
    { name: "Yellow", rgb: [255, 220, 0], after: "Surprised? On a screen, <strong>red light + green light = yellow</strong>. Mixing light isn't like mixing paint." },
    { name: "Purple", rgb: [140, 40, 200], after: "Purple is lots of red and blue, with hardly any green." },
    { name: "Grey", rgb: [128, 128, 128], after: "When all three numbers are the <strong>same</strong>, you get grey. That's why the black-and-white pictures earlier only needed one number per pixel." },
    { name: "Brown", rgb: [120, 70, 20], after: "Brown is really just dark orange: the same mix as orange, with smaller numbers." },
  ];
  let t = 0;
  let matched = false;
  const sl = { r: $("#sl-r"), g: $("#sl-g"), b: $("#sl-b") };
  const mixMsg = $("#match-msg");

  function showTarget() {
    const T = TARGETS[t];
    $("#target-swatch").style.backgroundColor = `rgb(${T.rgb})`;
    $("#target-title").textContent = `Match this colour: ${T.name} (${t + 1} of ${TARGETS.length})`;
    matched = false;
    mixMsg.hidden = true;
    updateMix();
  }
  function updateMix() {
    const m = [+sl.r.value, +sl.g.value, +sl.b.value];
    $("#out-r").textContent = m[0]; $("#out-g").textContent = m[1]; $("#out-b").textContent = m[2];
    $("#mix-swatch").style.backgroundColor = `rgb(${m})`;
    const T = TARGETS[t].rgb;
    // "Off by" = the three gaps added together, so learners can check it themselves.
    const gaps = m.map((v, i) => Math.abs(v - T[i]));
    const d = gaps[0] + gaps[1] + gaps[2];
    const fill = $("#close-fill");
    fill.style.width = Math.max(0, 100 - d / 4) + "%";
    const hit = d <= 60;
    fill.classList.toggle("matched", hit);
    $("#close-text").textContent = hit ? `Off by ${d}: match! ✓` : `Off by ${d}`;
    $("#close-breakdown").textContent = `red ${gaps[0]} + green ${gaps[1]} + blue ${gaps[2]} = ${d}`;
    if (hit && !matched) {
      matched = true;
      const last = t === TARGETS.length - 1;
      mixMsg.innerHTML = `<p>${TARGETS[t].after}</p>` +
        (last ? `<p><strong>All four matched.</strong> Every colour on your screen is some mix of these three numbers.</p>`
              : `<button class="btn primary" id="next-colour">Next colour →</button>`);
      mixMsg.hidden = false;
      showOnce("c3");
    }
  }
  Object.values(sl).forEach((s) => s.addEventListener("input", updateMix));
  mixMsg.addEventListener("click", (e) => {
    if (e.target.closest("#next-colour")) { t++; showTarget(); }
  });
  showTarget();

  /* ================= PART 4: sound ================= */

  const N = 32;
  const WAVES = {
    Smooth: (i) => Math.round(100 * Math.sin((2 * Math.PI * i) / N)),
    Buzzy: (i) => (i < N / 2 ? 80 : -80),
    Sharp: (i) => Math.round(-100 + (200 * i) / (N - 1)),
    Silence: () => 0,
  };
  let samples = Array.from({ length: N }, (_, i) => WAVES.Smooth(i));
  const wc = $("#wave-canvas");
  const wx = wc.getContext("2d");

  function drawWave() {
    // Match the drawing's proportions to the on-screen size (taller on phones).
    const box = wc.getBoundingClientRect();
    if (box.width) wc.height = Math.round((wc.width * box.height) / box.width);
    const W = wc.width, H = wc.height, mid = H / 2, colW = W / N;
    wx.clearRect(0, 0, W, H);
    wx.strokeStyle = css("--ink-3"); wx.lineWidth = 1; wx.setLineDash([4, 4]);
    wx.beginPath(); wx.moveTo(0, mid); wx.lineTo(W, mid); wx.stroke(); wx.setLineDash([]);
    const accent = css("--accent");
    samples.forEach((v, i) => {
      const y = mid - (v / 100) * (mid - 10);
      wx.fillStyle = accent; wx.globalAlpha = .35;
      wx.fillRect(i * colW + 2, Math.min(mid, y), colW - 4, Math.abs(y - mid));
      wx.globalAlpha = 1;
      wx.beginPath(); wx.arc(i * colW + colW / 2, y, 4, 0, Math.PI * 2); wx.fill();
    });
    wx.strokeStyle = accent; wx.lineWidth = 2;
    wx.beginPath();
    samples.forEach((v, i) => { const x = i * colW + colW / 2, y = mid - (v / 100) * (mid - 10); i ? wx.lineTo(x, y) : wx.moveTo(x, y); });
    wx.stroke();
    $("#wave-nums").textContent = samples.join(", ");
  }

  let dragging = false, lastI = -1;
  function editAt(e) {
    const r = wc.getBoundingClientRect();
    const i = Math.min(N - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * N)));
    // a little overshoot (×110) makes ±100 easy to reach at the canvas edges
    const clamp = Math.max(-100, Math.min(100, Math.round((1 - ((e.clientY - r.top) / r.height) * 2) * 110)));
    if (lastI >= 0 && lastI !== i) {
      // fill any columns skipped by a fast drag
      const step = i > lastI ? 1 : -1;
      const from = samples[lastI];
      for (let k = lastI + step; k !== i; k += step) samples[k] = Math.round(from + ((clamp - from) * (k - lastI)) / (i - lastI));
    }
    samples[i] = clamp;
    lastI = i;
    setPreset(null);
    drawWave();
  }
  wc.addEventListener("pointerdown", (e) => { dragging = true; lastI = -1; wc.setPointerCapture(e.pointerId); editAt(e); });
  wc.addEventListener("pointermove", (e) => { if (dragging) editAt(e); });
  wc.addEventListener("pointerup", () => { dragging = false; });
  wc.addEventListener("pointercancel", () => { dragging = false; });

  const presetBar = $("#wave-presets");
  presetBar.innerHTML = Object.keys(WAVES).map((k) => `<button class="chip" data-wave="${k}" aria-pressed="${k === "Smooth"}">${k}</button>`).join("");
  function setPreset(name) { presetBar.querySelectorAll("[data-wave]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.wave === name)); }
  presetBar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-wave]");
    if (!b) return;
    samples = Array.from({ length: N }, (_, i) => WAVES[b.dataset.wave](i));
    setPreset(b.dataset.wave);
    drawWave();
  });

  const pitch = $("#pitch");
  function updatePitch() {
    const f = +pitch.value;
    $("#pitch-out").textContent = f;
    $("#pitch-hint").textContent = f < 150 ? "(a deep rumble)" : f < 300 ? "(a low hum)" : f < 500 ? "(a middle note)" : "(a high note)";
  }
  pitch.addEventListener("input", updatePitch);
  updatePitch();

  let audio = null;
  $("#play").addEventListener("click", async () => {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") await audio.resume();
      const sr = audio.sampleRate, dur = 1.2, len = Math.floor(sr * dur), f = +pitch.value;
      const buf = audio.createBuffer(1, len, sr);
      const out = buf.getChannelData(0);
      const fadeIn = sr * 0.02, fadeOut = sr * 0.15;
      for (let i = 0; i < len; i++) {
        const p = ((i * f) / sr % 1) * N;
        const i0 = Math.floor(p), i1 = (i0 + 1) % N, frac = p - i0;
        const v = (samples[i0] * (1 - frac) + samples[i1] * frac) / 100;
        const env = Math.min(1, i / fadeIn, (len - i) / fadeOut);
        out[i] = v * 0.22 * env;
      }
      const node = audio.createBufferSource();
      node.buffer = buf;
      node.connect(audio.destination);
      node.start();
      showOnce("c4");
    } catch (err) {
      $("#play").textContent = "Sound isn't available here";
    }
  });

  drawWave();
  window.addEventListener("resize", drawWave);
  $("#s4").addEventListener("revealed", drawWave);
  // re-colour the canvas when the theme changes
  new MutationObserver(drawWave).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ================= PART 5: words ================= */

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function renderCodes(input, box) {
    const chars = Array.from(input.value);
    box.innerHTML = chars.map((ch) => {
      const n = ch.codePointAt(0);
      const isSpace = ch === " ";
      return `<span class="code"><span class="ch">${isSpace ? "␣" : esc(ch)}</span><span class="n${isSpace ? " space" : ""}">${n}</span></span>`;
    }).join("");
  }
  const wa = $("#word-a"), wb = $("#word-b");
  wa.addEventListener("input", () => renderCodes(wa, $("#codes-a")));
  wb.addEventListener("input", () => renderCodes(wb, $("#codes-b")));
  renderCodes(wa, $("#codes-a"));
  renderCodes(wb, $("#codes-b"));
  document.querySelector(".words").addEventListener("click", (e) => {
    const c = e.target.closest("[data-word]");
    if (!c) return;
    wb.value = c.dataset.word;
    renderCodes(wb, $("#codes-b"));
  });

  $("#s5").addEventListener("revealed", () => LearnAI.markComplete("02-everything-is-numbers"));
})();
