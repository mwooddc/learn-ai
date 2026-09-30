// Stop 3 · A single neuron
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const showOnce = (id) => { const b = document.getElementById(id); if (b && !b.dataset.shown) { b.hidden = false; b.dataset.shown = "1"; } };
  const fmt = (n) => (n < 0 ? `−${-n}` : `${n}`);            // proper minus sign
  const fmtTerm = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));

  const INPUTS = ["Sunny", "Friends", "Homework"];
  const INPUT_HELP = ["Is it sunny?", "Are your friends going?", "Is homework due tomorrow?"];

  /* ============ The neuron widget (used in Parts 1–4) ============
     Draws the diagram, the controls and the working-out line, and keeps
     them in sync. Colours come from CSS so every theme works. */
  function Neuron(root, opts) {
    const s = {
      values: opts.values.slice(),
      weights: opts.weights.slice(),
      threshold: opts.threshold ?? 0,
    };
    const showT = !!opts.showThreshold;

    root.innerHTML = `
      <svg class="neuron-svg" viewBox="0 0 480 300" role="img" aria-label="Diagram of the neuron: three inputs, each multiplied by a weight, summed${showT ? " and compared with a threshold" : ""}"></svg>
      <div class="n-controls"></div>
      <p class="n-maths" aria-live="polite"></p>`;
    const svg = root.querySelector("svg");
    const controls = root.querySelector(".n-controls");
    const maths = root.querySelector(".n-maths");

    // ---- controls ----
    let html = `<div class="n-row n-head"><span></span><span>Input</span><span>Weight</span></div>`;
    INPUTS.forEach((name, i) => {
      const val = opts.editValues
        ? `<button class="toggle" data-i="${i}" aria-label="${INPUT_HELP[i]}"></button>`
        : `<span class="toggle static" data-i="${i}"></span>`;
      const wt = opts.editWeights
        ? `<input type="range" min="-5" max="5" step="1" data-w="${i}" aria-label="Weight for ${name}"><output class="mono" data-wo="${i}"></output>`
        : `<span class="mono wt-static" data-wo="${i}"></span>`;
      html += `<div class="n-row"><span class="n-name">${name}</span><span>${val}</span><span class="n-weight">${wt}</span></div>`;
    });
    if (showT) {
      const th = opts.editThreshold
        ? `<input type="range" min="0" max="10" step="1" data-t aria-label="Threshold"><output class="mono" data-to></output>`
        : `<span class="mono wt-static" data-to></span>`;
      html += `<div class="n-row n-threshold"><span class="n-name">Threshold</span><span class="n-t-help">GO if the sum reaches</span><span class="n-weight">${th}</span></div>`;
    }
    controls.innerHTML = html;

    controls.addEventListener("click", (e) => {
      const b = e.target.closest("button.toggle");
      if (!b) return;
      s.values[+b.dataset.i] = 1 - s.values[+b.dataset.i];
      update();
    });
    controls.addEventListener("input", (e) => {
      if (e.target.dataset.w !== undefined) s.weights[+e.target.dataset.w] = +e.target.value;
      if (e.target.dataset.t !== undefined) s.threshold = +e.target.value;
      update();
    });

    const sum = () => s.values.reduce((a, v, i) => a + v * s.weights[i], 0);
    const fires = () => sum() >= s.threshold;

    function drawSvg() {
      const ys = [60, 150, 240], nx = 300, ny = 150, ix = 138;
      let g = "";
      ys.forEach((y, i) => {
        const w = s.weights[i], on = s.values[i] === 1;
        const cls = w === 0 ? "zero" : w > 0 ? "pos" : "neg";
        const width = w === 0 ? 1.5 : 2 + Math.abs(w) * 1.7;
        g += `<line class="link ${cls} ${on && w !== 0 ? "flow" : "idle"}" x1="${ix + 24}" y1="${y}" x2="${nx - 44}" y2="${ny + (y - ny) * 0.12}" stroke-width="${width}"/>`;
      });
      ys.forEach((y, i) => {
        const w = s.weights[i];
        const px = ix + 24 + (nx - 44 - ix - 24) * 0.45, py = y + (ny + (y - ny) * 0.12 - y) * 0.45;
        g += `<g class="pill ${w === 0 ? "zero" : w > 0 ? "pos" : "neg"}"><rect x="${px - 24}" y="${py - 14}" width="48" height="28" rx="14"/><text x="${px}" y="${py + 5}">×${fmt(w)}</text></g>`;
      });
      ys.forEach((y, i) => {
        const on = s.values[i] === 1;
        g += `<text class="in-label" x="${ix - 34}" y="${y + 5}">${INPUTS[i]}</text>
              <circle class="in-node ${on ? "on" : ""}" cx="${ix}" cy="${y}" r="24"/>
              <text class="in-val ${on ? "on" : ""}" x="${ix}" y="${y + 7}">${s.values[i]}</text>`;
      });
      const total = sum();
      g += `<circle class="body ${showT ? (fires() ? "go" : "stay") : ""}" cx="${nx}" cy="${ny}" r="44"/>
            <text class="sum-val" x="${nx}" y="${ny + 8}">${fmt(total)}</text>
            <text class="sum-label" x="${nx}" y="${ny + 28}">sum</text>`;
      if (showT) {
        const go = fires();
        g += `<line class="out-link" x1="${nx + 44}" y1="${ny}" x2="382" y2="${ny}"/>
              <text class="t-label" x="${(nx + 44 + 382) / 2}" y="${ny - 12}">≥${fmt(s.threshold)}?</text>
              <rect class="out ${go ? "go" : "stay"}" x="384" y="${ny - 30}" width="88" height="60" rx="12"/>
              <text class="out-text ${go ? "go" : "stay"}" x="428" y="${ny + 8}">${go ? "GO" : "STAY"}</text>`;
      }
      svg.innerHTML = g;
    }

    function update() {
      controls.querySelectorAll(".toggle").forEach((b) => {
        const v = s.values[+b.dataset.i];
        b.textContent = v ? "Yes · 1" : "No · 0";
        b.classList.toggle("on", !!v);
        if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", !!v);
      });
      controls.querySelectorAll("[data-w]").forEach((r) => { r.value = s.weights[+r.dataset.w]; });
      controls.querySelectorAll("[data-wo]").forEach((o) => {
        const w = s.weights[+o.dataset.wo];
        o.textContent = fmt(w);
        o.className = o.className.replace(/\b(pos|neg|zero)\b/g, "").trim() + " " + (w === 0 ? "zero" : w > 0 ? "pos" : "neg");
      });
      const t = controls.querySelector("[data-t]"); if (t) t.value = s.threshold;
      const to = controls.querySelector("[data-to]"); if (to) to.textContent = fmt(s.threshold);

      const terms = s.values.map((v, i) => `<span class="term ${v ? "" : "zero"}">${v} × ${fmtTerm(s.weights[i])}</span>`).join(" + ");
      let line = `${terms} = <strong>${fmt(sum())}</strong>`;
      if (showT) {
        line += fires()
          ? ` <span class="verdict go">reaches ${fmt(s.threshold)} → GO</span>`
          : ` <span class="verdict stay">below ${fmt(s.threshold)} → STAY</span>`;
      }
      maths.innerHTML = line;
      drawSvg();
      if (opts.onChange) opts.onChange(api);
    }

    const api = {
      get state() { return { values: s.values.slice(), weights: s.weights.slice(), threshold: s.threshold }; },
      sum, fires,
      set(p) {
        if (p.values) s.values = p.values.slice();
        if (p.weights) s.weights = p.weights.slice();
        if (p.threshold !== undefined) s.threshold = p.threshold;
        update();
      },
    };
    update();
    return api;
  }

  /* ================= PART 1 ================= */
  const n1 = Neuron($("#n1"), { values: [1, 1, 0], weights: [2, 3, -4], editValues: true, editWeights: true });

  /* ================= PART 2 (starts from the learner's Part 1 neuron) ================= */
  let n2 = null;
  $("#s2").addEventListener("revealed", () => {
    if (n2) return;
    const st = n1.state;
    n2 = Neuron($("#n2"), { values: st.values, weights: st.weights, threshold: 4, showThreshold: true, editValues: true, editWeights: true, editThreshold: true });
  });

  /* ================= PART 3: predict Alex's neuron ================= */
  const ALEX = { weights: [3, 2, -4], threshold: 3 };
  const SITUATIONS = [
    { values: [1, 1, 0], note: "" },
    { values: [0, 1, 0], note: "" },
    { values: [1, 0, 0], note: "That's exactly the threshold, and \"reaches\" includes being equal, so it's GO." },
    { values: [1, 1, 1], note: "Homework's −4 drags a sum of 5 down to 1." },
  ];
  const n3 = Neuron($("#n3"), { values: [0, 0, 0], weights: ALEX.weights, threshold: ALEX.threshold, showThreshold: true });
  const answers = [];
  const YESNO = (v) => (v ? "yes" : "no");
  $("#predictions").innerHTML = SITUATIONS.map((sit, i) => `
    <div class="predict card" data-p="${i}">
      <p class="predict-title">Afternoon ${i + 1}</p>
      <p class="predict-inputs">${INPUTS.map((n, k) => `<span class="${sit.values[k] ? "yes" : ""}">${n}: ${YESNO(sit.values[k])}</span>`).join("")}</p>
      <div class="predict-buttons">
        <button class="btn" data-guess="1">GO</button>
        <button class="btn" data-guess="0">STAY</button>
      </div>
      <div class="predict-result" hidden></div>
    </div>`).join("");

  $("#predictions").addEventListener("click", (e) => {
    const b = e.target.closest("[data-guess]");
    if (!b) return;
    const card = b.closest("[data-p]");
    const i = +card.dataset.p;
    if (answers[i] !== undefined) return;
    const sit = SITUATIONS[i];
    n3.set({ values: sit.values });
    const truth = n3.fires();
    const guess = b.dataset.guess === "1";
    answers[i] = guess === truth;
    card.querySelectorAll("[data-guess]").forEach((x) => { x.disabled = true; x.classList.toggle("chosen", x === b); });
    const res = card.querySelector(".predict-result");
    res.hidden = false;
    res.className = "predict-result " + (answers[i] ? "right" : "wrong");
    res.innerHTML = `<strong>${answers[i] ? "✓ Right" : "✗ Not quite"}: it's ${truth ? "GO" : "STAY"}.</strong> Sum = ${fmt(n3.sum())}${sit.note ? `. ${sit.note}` : "."}`;
    const done = answers.filter((a) => a !== undefined).length;
    if (done === SITUATIONS.length) {
      const right = answers.filter(Boolean).length;
      $("#predict-score").textContent = `You predicted ${right} out of ${SITUATIONS.length}. ` +
        (right === SITUATIONS.length ? "You can think like a neuron." : "Every answer follows the same three steps: multiply, add, compare.");
      showOnce("c3");
    }
  });

  /* ================= PART 4: fit Sam ================= */
  // Sam's hidden rule is sunny 2, friends 2, homework −3, threshold 1:
  // Sam only goes with homework due when it's sunny AND friends are going.
  const SAM = [
    { values: [1, 0, 0], go: true },
    { values: [0, 1, 0], go: true },
    { values: [0, 0, 0], go: false },
    { values: [1, 0, 1], go: false },
    { values: [1, 1, 1], go: true },
    { values: [0, 1, 1], go: false },
  ];
  let selected = 0;
  let won = false;
  const table = $("#sam-table");
  let n4 = null;

  function renderSam() {
    if (!n4) return;
    const { weights, threshold } = n4.state;
    let right = 0;
    const rows = SAM.map((d, i) => {
      const s = d.values.reduce((a, v, k) => a + v * weights[k], 0);
      const says = s >= threshold;
      const ok = says === d.go;
      if (ok) right++;
      return `<div class="d-row ${ok ? "ok" : "bad"} ${i === selected ? "sel" : ""}" role="row" tabindex="0" data-day="${i}">
        <span role="cell">${i + 1}</span>
        ${d.values.map((v) => `<span role="cell" class="mono ${v ? "one" : ""}">${v}</span>`).join("")}
        <span role="cell" class="dec">${d.go ? "GO" : "STAY"}</span>
        <span role="cell" class="dec">${says ? "GO" : "STAY"}</span>
        <span role="cell" class="mark">${ok ? "✓" : "✗"}</span>
      </div>`;
    }).join("");
    table.innerHTML = `<div class="d-row d-head" role="row">
        <span role="columnheader">#</span>${INPUTS.map((n) => `<span role="columnheader">${n}</span>`).join("")}
        <span role="columnheader">Sam did</span><span role="columnheader">Neuron</span><span role="columnheader"><span class="sr-only">Match</span></span>
      </div>` + rows;
    $("#sam-score").textContent = `The neuron matches Sam on ${right} out of ${SAM.length} afternoons.`;
    if (right === SAM.length && !won) {
      won = true;
      $("#sam-win").hidden = false;
      showOnce("c4");
    }
  }

  $("#s4").addEventListener("revealed", () => {
    if (n4) return;
    n4 = Neuron($("#n4"), {
      values: SAM[0].values, weights: [0, 0, 0], threshold: 1, showThreshold: true,
      editWeights: true, editThreshold: true, onChange: renderSam,
    });
    renderSam();
  });

  function selectDay(i) {
    selected = i;
    n4.set({ values: SAM[i].values });
  }
  table.addEventListener("click", (e) => {
    const r = e.target.closest("[data-day]");
    if (r) selectDay(+r.dataset.day);
  });
  table.addEventListener("keydown", (e) => {
    const r = e.target.closest("[data-day]");
    if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectDay(+r.dataset.day); }
  });

  const HINTS = [
    "Look at afternoons 4 and 5. With homework due, Sam stayed when it was only sunny, but went when it was sunny AND friends were going. So sunny and friends <em>together</em> must beat homework, but sunny alone mustn't.",
    "Try giving Sunny and Friends the same weight, make Homework a bit more negative than either one on its own, and keep the threshold low.",
  ];
  let hintN = 0;
  $("#sam-hint").addEventListener("click", (e) => {
    const p = $("#sam-hint-text");
    p.innerHTML = HINTS[Math.min(hintN, HINTS.length - 1)];
    p.hidden = false;
    hintN++;
    if (hintN >= HINTS.length) e.currentTarget.textContent = "Show the hint again";
    else e.currentTarget.textContent = "I'm still stuck";
  });

  /* ================= PART 5: a neuron that looks at pixels ================= */
  const G = 5;
  const DETECTORS = {
    vertical: { weights: Array.from({ length: G * G }, (_, i) => (i % G === 2 ? 1 : -1)), threshold: 4, what: "a line down the middle" },
    horizontal: { weights: Array.from({ length: G * G }, (_, i) => (Math.floor(i / G) === 2 ? 1 : -1)), threshold: 4, what: "a line across the middle" },
  };
  let det = "vertical";
  const ink = Array.from({ length: G * G }, (_, i) => (i % G === 2 ? 1 : 0));
  const inBox = $("#eye-input"), wBox = $("#eye-weights");
  for (let i = 0; i < G * G; i++) {
    const a = document.createElement("button"); a.className = "mcell"; a.dataset.i = i; inBox.appendChild(a);
    const b = document.createElement("div"); b.className = "mcell"; wBox.appendChild(b);
  }
  function renderEye() {
    const D = DETECTORS[det];
    let plus = 0, minus = 0;
    [...inBox.children].forEach((c, i) => {
      c.classList.toggle("ink", !!ink[i]);
      c.textContent = ink[i];
      c.setAttribute("aria-label", `Row ${Math.floor(i / G) + 1}, column ${(i % G) + 1}: ${ink[i] ? "ink" : "blank"}`);
      c.setAttribute("aria-pressed", !!ink[i]);
    });
    [...wBox.children].forEach((c, i) => {
      const w = D.weights[i];
      c.className = "mcell " + (w > 0 ? "pos" : "neg") + (ink[i] ? " counted" : "");
      c.textContent = w > 0 ? "+1" : "−1";
      if (ink[i]) { if (w > 0) plus++; else minus++; }
    });
    const total = plus - minus;
    const fire = total >= D.threshold;
    $("#eye-result").innerHTML = `
      <p class="eye-maths">Ink on <span class="pos">+1</span> squares: <strong>${plus}</strong> &nbsp;·&nbsp; ink on <span class="neg">−1</span> squares: <strong>${minus}</strong>
      &nbsp;→&nbsp; sum = ${plus} − ${minus} = <strong>${fmt(total)}</strong></p>
      <p class="eye-verdict ${fire ? "go" : "stay"}">${fire ? "FIRES" : "Doesn't fire"}: threshold is ${D.threshold}, so the neuron says ${fire ? "YES" : "NO"}, ${fire ? "this is" : "this isn't"} ${D.what}.</p>`;
  }
  inBox.addEventListener("click", (e) => {
    const c = e.target.closest("[data-i]");
    if (!c) return;
    ink[+c.dataset.i] = 1 - ink[+c.dataset.i];
    renderEye();
  });
  document.querySelector(".eye-controls").addEventListener("click", (e) => {
    const d = e.target.closest("[data-detector]");
    if (d) {
      det = d.dataset.detector;
      document.querySelectorAll("[data-detector]").forEach((b) => b.setAttribute("aria-pressed", b === d));
      renderEye();
    }
    if (e.target.closest("#eye-clear")) { ink.fill(0); renderEye(); }
  });
  renderEye();

  $("#s5").addEventListener("revealed", () => LearnAI.markComplete("03-a-single-neuron"));
})();
