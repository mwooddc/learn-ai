// Stop 3 · A single neuron
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const showOnce = (id) => { const b = document.getElementById(id); if (b && !b.dataset.shown) { b.hidden = false; b.dataset.shown = "1"; } };
  // The neuron widget and its helpers are shared with later stops (assets/js/neuron.js).
  const { Neuron, fmt, INPUTS } = LearnAINeuron;

  /* ================= PART 1 ================= */
  // A short checklist of experiments that tick themselves off, so learners
  // discover what inputs and weights each do before moving on.
  const TRIES = [
    { id: "flip", test: (st, prev) => prev && st.values.some((v, i) => v === 0 && prev.values[i] === 1),
      done: "The weight didn't change, but × 0 means it no longer counts. A \"no\" is simply ignored." },
    { id: "zero", test: (st) => st.weights.some((w) => w === 0),
      done: "A weight of 0 means that fact makes no difference, whether it's true or not." },
    { id: "neg", test: (st) => st.values.reduce((a, v, i) => a + v * st.weights[i], 0) < 0,
      done: "A negative sum means the reasons to stay outweigh the reasons to go." },
  ];
  const ticked = new Set();
  let prev1 = null;
  function checkTries(n) {
    const st = n.state;
    TRIES.forEach((t) => {
      if (ticked.has(t.id) || !t.test(st, prev1)) return;
      ticked.add(t.id);
      const li = document.querySelector(`[data-try="${t.id}"]`);
      li.classList.add("done");
      li.querySelector(".try-result").textContent = t.done;
    });
    prev1 = st;
    if (ticked.size === TRIES.length) showOnce("c1");
  }
  const n1 = Neuron($("#n1"), { values: [1, 1, 0], weights: [2, 3, -4], editValues: true, editWeights: true, onChange: checkTries });

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
