// Learn AI · shared neuron widget (Stop 3 onwards)
// Draws the neuron diagram, its controls and the working-out, and keeps them
// in sync. Colours come from CSS (assets/css/neuron.css) so every theme works.
(function () {
  const fmt = (n) => (n < 0 ? `−${-n}` : `${n}`); // proper minus sign
  const fmtTerm = (n) => (n < 0 ? `(${fmt(n)})` : fmt(n));
  const signed = (n) => (n > 0 ? `+${n}` : fmt(n));

  // Sam's (and the learner's) park decision.
  const INPUTS = ["Sunny", "Friends", "Homework"];
  const INPUT_HELP = ["Is it sunny today?", "Are your friends going?", "Is homework due tomorrow?"];
  // How each fact reads in plain English when it's false (0) or true (1).
  const FACT = [
    ["it isn't sunny", "it's sunny"],
    ["friends aren't going", "friends are going"],
    ["no homework is due", "homework is due"],
  ];

  // What a weight means, in words, so −5 isn't mistaken for "don't care".
  function weightMeaning(w, who = "me") {
    if (w === 0) return `doesn't matter to ${who}`;
    const size = Math.abs(w) >= 5 ? "a huge" : Math.abs(w) >= 3 ? "a strong" : "a small";
    return `${size} reason to ${w > 0 ? "go" : "stay"}`;
  }

  /* opts: values, weights, threshold, showThreshold, editValues, editWeights,
           editThreshold, onChange(api) */
  function Neuron(root, opts) {
    const s = {
      values: opts.values.slice(),
      weights: opts.weights.slice(),
      threshold: opts.threshold ?? 0,
    };
    const showT = !!opts.showThreshold;
    let changed = new Set(); // weight indexes (or "t") to flash after set()

    root.innerHTML = `
      <svg class="neuron-svg" viewBox="0 0 480 300" role="img" aria-label="Diagram of the neuron: three inputs, each multiplied by a weight, summed${showT ? " and compared with a threshold" : ""}"></svg>
      <div class="n-controls"></div>
      <div class="n-maths" aria-live="polite"></div>`;
    const svg = root.querySelector("svg");
    const controls = root.querySelector(".n-controls");
    const maths = root.querySelector(".n-maths");

    // ---- controls ----
    // Two clearly separate kinds of number: facts about today (inputs)
    // and how much each fact matters to this person (weights).
    let html = `<div class="n-row n-head">
        <span></span>
        <span><span class="kind in">Today's facts</span><small>the inputs · yes = 1, no = 0</small></span>
        <span><span class="kind wt">How much it matters</span><small>the weights${opts.weightNote ?? " · −5 to +5"}</small></span>
      </div>`;
    INPUTS.forEach((name, i) => {
      const val = opts.editValues
        ? `<button class="toggle" data-i="${i}" aria-label="${INPUT_HELP[i]}"></button>`
        : `<span class="toggle static" data-i="${i}"></span>`;
      const wt = opts.editWeights
        ? `<span class="w-line"><input type="range" min="-5" max="5" step="1" data-w="${i}" aria-label="How much ${name.toLowerCase()} matters"><output class="mono" data-wo="${i}"></output></span>`
        : `<span class="w-line"><span class="mono wt-static" data-wo="${i}"></span></span>`;
      html += `<div class="n-row">
        <span class="n-name">${name}<small>${INPUT_HELP[i]}</small></span>
        <span>${val}</span>
        <span class="n-weight">${wt}<small class="w-mean" data-wm="${i}"></small></span>
      </div>`;
    });
    if (showT) {
      const th = opts.editThreshold
        ? `<input type="range" min="0" max="10" step="1" data-t aria-label="Threshold"><output class="mono" data-to></output>`
        : `<span class="mono wt-static" data-to></span>`;
      html += `<div class="n-row n-threshold"><span class="n-name">Threshold</span><span class="n-t-help">GO if the sum reaches</span><span class="n-weight"><span class="w-line">${th}</span></span></div>`;
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
      let g = `<text class="col-head in" x="${ix}" y="16">TODAY</text>
               <text class="col-head wt" x="${ix + 24 + (nx - 44 - ix - 24) * 0.45}" y="16">WEIGHT</text>
               <text class="col-head" x="${nx}" y="16">SUM</text>`;
      ys.forEach((y, i) => {
        const w = s.weights[i], on = s.values[i] === 1;
        const cls = w === 0 ? "zero" : w > 0 ? "pos" : "neg";
        const width = w === 0 ? 1.5 : 2 + Math.min(Math.abs(w), 6) * 1.7;
        g += `<line class="link ${cls} ${on && w !== 0 ? "flow" : "idle"}" x1="${ix + 24}" y1="${y}" x2="${nx - 44}" y2="${ny + (y - ny) * 0.12}" stroke-width="${width}"/>`;
      });
      ys.forEach((y, i) => {
        const w = s.weights[i];
        const px = ix + 24 + (nx - 44 - ix - 24) * 0.45, py = y + (ny + (y - ny) * 0.12 - y) * 0.45;
        g += `<g class="pill ${w === 0 ? "zero" : w > 0 ? "pos" : "neg"} ${changed.has(i) ? "changed" : ""}"><rect x="${px - 24}" y="${py - 14}" width="48" height="28" rx="14"/><text x="${px}" y="${py + 5}">×${fmt(w)}</text></g>`;
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
              <text class="t-label ${changed.has("t") ? "changed" : ""}" x="${(nx + 44 + 382) / 2}" y="${ny - 12}">≥${fmt(s.threshold)}?</text>
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
        o.className = o.className.replace(/\b(pos|neg|zero|changed)\b/g, "").trim() + " " + (w === 0 ? "zero" : w > 0 ? "pos" : "neg") + (changed.has(+o.dataset.wo) ? " changed" : "");
      });
      controls.querySelectorAll("[data-wm]").forEach((m) => {
        const w = s.weights[+m.dataset.wm];
        m.textContent = weightMeaning(w, opts.who);
        m.className = "w-mean " + (w === 0 ? "zero" : w > 0 ? "pos" : "neg");
      });
      const t = controls.querySelector("[data-t]"); if (t) t.value = s.threshold;
      const to = controls.querySelector("[data-to]");
      if (to) { to.textContent = fmt(s.threshold); to.classList.toggle("changed", changed.has("t")); }

      // The working-out, then the same thing in plain English.
      const total = sum();
      const terms = s.values.map((v, i) => `<span class="term ${v ? "" : "zero"}">${v} × ${fmtTerm(s.weights[i])}</span>`).join(" + ");
      let line = `<p class="n-sum">${terms} = <strong>${fmt(total)}</strong>`;
      if (showT) {
        line += fires()
          ? ` <span class="verdict go">reaches ${fmt(s.threshold)} → GO</span>`
          : ` <span class="verdict stay">below ${fmt(s.threshold)} → STAY</span>`;
      }
      line += `</p>`;
      const counted = s.values.map((v, i) => (v ? `${FACT[i][1]} (${signed(s.weights[i])})` : null)).filter(Boolean);
      const ignored = s.values.map((v, i) => (v ? null : FACT[i][0])).filter(Boolean);
      const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0]);
      let words = counted.length ? `Counted: ${list(counted)}. ` : "";
      if (ignored.length) {
        const which = !counted.length ? "all three weights are" : ignored.length > 1 ? "those weights are" : "that weight is";
        words += `${list(ignored).replace(/^./, (c) => c.toUpperCase())}, so ${which} ignored (× 0). `;
      }
      if (!showT) {
        words += total > 0 ? `Total ${fmt(total)}: more reasons to go than to stay.`
          : total < 0 ? `Total ${fmt(total)}: more reasons to stay than to go.`
          : counted.length ? "Total 0: the reasons balance out exactly."
          : "Total 0: nothing pushes you either way.";
      }
      line += `<p class="n-words">${words}</p>`;
      maths.innerHTML = line;
      drawSvg();
      if (opts.onChange) opts.onChange(api);
    }

    const api = {
      get state() { return { values: s.values.slice(), weights: s.weights.slice(), threshold: s.threshold }; },
      sum, fires,
      // set() flashes any weight or threshold that changed, so learners see what moved.
      set(p) {
        changed = new Set();
        if (p.weights) p.weights.forEach((w, i) => { if (w !== s.weights[i]) changed.add(i); });
        if (p.threshold !== undefined && p.threshold !== s.threshold) changed.add("t");
        if (p.values) s.values = p.values.slice();
        if (p.weights) s.weights = p.weights.slice();
        if (p.threshold !== undefined) s.threshold = p.threshold;
        update();
        changed = new Set();
      },
    };
    update();
    return api;
  }

  window.LearnAINeuron = { Neuron, fmt, fmtTerm, signed, weightMeaning, INPUTS, INPUT_HELP, FACT };
})();
