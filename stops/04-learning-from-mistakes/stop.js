// Stop 4 · Learning from mistakes
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const showOnce = (id) => { const b = document.getElementById(id); if (b && !b.dataset.shown) { b.hidden = false; b.dataset.shown = "1"; } };
  const { Neuron, fmt, INPUTS } = LearnAINeuron;
  const YESNO = (v) => (v ? "yes" : "no");
  const sumOf = (x, w) => x.reduce((a, v, i) => a + v * w[i], 0);
  const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0]);

  /* A tiny bar chart: one bar per round, height = mistakes in that round. */
  function Chart(el, max) {
    return {
      set(hist) {
        el.innerHTML = hist.map((m, i) => `
          <div class="bar-col">
            <span class="bar-n">${m}</span>
            <div class="bar ${m === 0 ? "zero" : ""}" style="height:${Math.max(4, (m / max) * 100)}%"></div>
            <span class="bar-l">${i + 1}</span>
          </div>`).join("") + `<span class="chart-axis">round →</span>`;
      },
    };
  }

  /* The learning rule, used everywhere on this page.
     Too cautious (said STAY / no, answer GO / yes): yes-inputs' weights +1, threshold −1.
     Too eager (said GO, answer STAY): yes-inputs' weights −1, threshold +1. */
  function learnStep(x, y, w, T) {
    const said = sumOf(x, w) >= T;
    if (said === y) return { said, mistake: false, w, T };
    const dir = y ? 1 : -1;
    return { said, mistake: true, kind: y ? "cautious" : "eager", w: w.map((wi, i) => wi + dir * x[i]), T: T - dir };
  }

  /* ================= PART 1: fix one mistake by hand ================= */
  function FixCase(key, cfg) {
    const pad = $(`#pad-${key}`), fb = $(`#fb-${key}`);
    let st = { weights: cfg.weights.slice(), threshold: cfg.threshold };
    let solved = false;
    const n = Neuron($(`#n-${key}`), { values: cfg.values, weights: st.weights, threshold: st.threshold, showThreshold: true, who: "Sam", weightNote: "" });
    $(`#case-${key}-text`).innerHTML = `<p><strong>This afternoon:</strong> ${INPUTS.map((nm, i) => `${nm}: <strong>${YESNO(cfg.values[i])}</strong>`).join(" · ")}. Sam <strong>${cfg.go ? "went" : "stayed at home"}</strong>.</p>`;

    const rows = INPUTS.map((nm, i) => ({ id: i, name: `${nm} weight` })).concat([{ id: "t", name: "Threshold" }]);
    pad.innerHTML = rows.map((r) => `
      <div class="pad-row"><span>${r.name}</span>
        <button class="btn pad-btn" data-k="${r.id}" data-d="-1" aria-label="${r.name} minus 1">−1</button>
        <button class="btn pad-btn" data-k="${r.id}" data-d="1" aria-label="${r.name} plus 1">+1</button>
      </div>`).join("") + `<button class="btn pad-reset" data-reset>Undo all changes</button>`;

    pad.addEventListener("click", (e) => {
      if (solved) return;
      if (e.target.closest("[data-reset]")) {
        st = { weights: cfg.weights.slice(), threshold: cfg.threshold };
        n.set({ weights: st.weights, threshold: st.threshold });
        fb.textContent = ""; fb.className = "fix-feedback";
        return;
      }
      const b = e.target.closest("[data-k]");
      if (!b) return;
      const k = b.dataset.k, d = +b.dataset.d;
      if (k === "t") st.threshold += d; else st.weights[+k] += d;
      n.set({ weights: st.weights, threshold: st.threshold });
      const fixed = n.fires() === cfg.go;
      if (fixed) {
        solved = true;
        pad.querySelectorAll("button").forEach((x) => (x.disabled = true));
        fb.className = "fix-feedback good";
        fb.innerHTML = `<strong>Fixed!</strong> ${cfg.why} ${cfg.other}`;
        cfg.onSolved();
        return;
      }
      fb.className = "fix-feedback";
      if (k !== "t" && cfg.values[+k] === 0) {
        fb.innerHTML = `That changed the <strong>${INPUTS[+k]}</strong> weight, but ${INPUTS[+k].toLowerCase()} was <strong>no (0)</strong> this afternoon. Anything × 0 is 0, so the sum didn't move at all.`;
      } else {
        const helps = k === "t" ? (cfg.go ? d < 0 : d > 0) : (cfg.go ? d > 0 : d < 0);
        fb.innerHTML = helps
          ? `That moved things the right way, but not far enough yet.`
          : `That made it <strong>worse</strong>: the neuron is now even ${cfg.go ? "less" : "more"} likely to say GO. Try the other direction, or press <em>Undo all changes</em>.`;
      }
    });
  }

  FixCase("a", {
    values: [1, 0, 0], weights: [0, 0, 0], threshold: 1, go: true,
    why: "Sam went, but the neuron said STAY, so it was <strong>too cautious</strong>. It needed a bigger sum or a lower threshold.",
    other: "Raising the Sunny weight or lowering the threshold both work. Changing Friends or Homework does nothing, because they were \"no\" this afternoon.",
    onSolved: () => { $("#case-b-wrap").hidden = false; },
  });
  FixCase("b", {
    values: [1, 0, 1], weights: [1, 1, 0], threshold: 1, go: false,
    why: "Sam stayed, but the neuron said GO, so it was <strong>too eager</strong>. It needed a smaller sum or a higher threshold.",
    other: "Lowering the Sunny or Homework weight, or raising the threshold, all work. Friends was \"no\", so its weight can't help.",
    onSolved: () => { $("#fix-lesson").hidden = false; showOnce("c1"); },
  });

  /* ================= PART 3: be the machine ================= */
  // Sam's six afternoons (same decisions as Stop 3), in an order that gives
  // a clear learning curve: 4 → 2 → 0 mistakes.
  const SAM = [
    { values: [1, 0, 0], go: true },
    { values: [0, 0, 0], go: false },
    { values: [0, 1, 0], go: true },
    { values: [1, 1, 1], go: true },
    { values: [1, 0, 1], go: false },
    { values: [0, 1, 1], go: false },
  ];
  let w = [0, 0, 0], T = 1, step = 0, round1Mistakes = 0, awaitingNext = false;
  let nLearn = null;
  const samHist = [];
  const samChart = Chart($("#chart-sam"), 6);

  function describeNudge(x, kind) {
    const yes = INPUTS.filter((_, i) => x[i]);
    const sign = kind === "cautious" ? "+1" : "−1";
    const tSign = kind === "cautious" ? "−1" : "+1";
    if (!yes.length) return `No inputs were yes, so there were no weights to nudge. Only the threshold moved (${tSign}).`;
    return `${list(yes)} ${yes.length > 1 ? "weights each" : "weight"} ${sign}, threshold ${tSign}.`;
  }

  function showStep() {
    const d = SAM[step];
    nLearn.set({ values: d.values });
    const said = nLearn.fires();
    $("#step-title").textContent = `Afternoon ${step + 1} of 6`;
    $("#step-facts").innerHTML = INPUTS.map((nm, i) => `<span class="${d.values[i] ? "yes" : ""}">${nm}: ${YESNO(d.values[i])}</span>`).join("");
    $("#step-said").textContent = said ? "GO" : "STAY";
    $("#step-said").className = said ? "go" : "stay";
    $("#step-truth").textContent = d.go ? "GO" : "STAY";
    $("#step-feedback").innerHTML = "";
    document.querySelectorAll("#step-choices [data-choice]").forEach((b) => (b.disabled = false));
    awaitingNext = false;
  }

  $("#s3").addEventListener("revealed", () => {
    if (nLearn) return;
    nLearn = Neuron($("#n-learn"), { values: SAM[0].values, weights: w, threshold: T, showThreshold: true, who: "Sam", weightNote: "" });
    showStep();
  });

  $("#step-choices").addEventListener("click", (e) => {
    const b = e.target.closest("[data-choice]");
    if (!b || awaitingNext) return;
    const d = SAM[step];
    const r = learnStep(d.values, d.go, w, T);
    const correct = r.mistake ? r.kind : "right";
    const fbEl = $("#step-feedback");
    if (b.dataset.choice !== correct) {
      const said = r.said ? "GO" : "STAY", did = d.go ? "went" : "stayed";
      fbEl.className = "step-feedback wrong";
      fbEl.innerHTML = correct === "right"
        ? `Look again: the neuron said <strong>${said}</strong> and Sam ${did}. They match, so nothing needs to change.`
        : correct === "cautious"
          ? `The neuron said <strong>STAY</strong> but Sam <strong>went</strong>. It held back when it should have gone. That's <strong>too cautious</strong>.`
          : `The neuron said <strong>GO</strong> but Sam <strong>stayed</strong>. It went for it when it shouldn't have. That's <strong>too eager</strong>.`;
      return;
    }
    awaitingNext = true;
    document.querySelectorAll("#step-choices [data-choice]").forEach((x) => (x.disabled = true));
    let logLine;
    if (r.mistake) {
      round1Mistakes++;
      w = r.w; T = r.T;
      nLearn.set({ weights: w, threshold: T });
      logLine = `<strong>${r.kind === "cautious" ? "Too cautious" : "Too eager"}:</strong> ${describeNudge(d.values, r.kind)}`;
      const nowRight = nLearn.fires() === d.go;
      fbEl.className = "step-feedback good";
      fbEl.innerHTML = `✓ ${logLine} The glowing numbers in the neuron show what changed. ` +
        (nowRight
          ? `With its new weights, the neuron would now get this afternoon right.`
          : `Even after the nudge it would still get this afternoon wrong. One small nudge isn't always enough; later rounds will keep correcting it.`);
    } else {
      logLine = `<strong>Right:</strong> nothing changes.`;
      fbEl.className = "step-feedback good";
      fbEl.innerHTML = `✓ ${logLine}`;
    }
    $("#log").insertAdjacentHTML("beforeend", `<div class="log-row ${r.mistake ? "m" : ""}"><span>Afternoon ${step + 1}</span><span>${logLine}</span><span class="mono">${INPUTS.map((nm, i) => `${nm[0]} ${fmt(w[i])}`).join(" · ")} · T ${fmt(T)}</span></div>`);
    const last = step === SAM.length - 1;
    fbEl.insertAdjacentHTML("beforeend", ` <button class="btn primary" id="next-step">${last ? "Finish round 1" : "Next afternoon →"}</button>`);
  });

  $("#stepper").addEventListener("click", (e) => {
    if (!e.target.closest("#next-step")) return;
    if (step < SAM.length - 1) { step++; showStep(); return; }
    // Round 1 done.
    samHist.push(round1Mistakes);
    $("#stepper").hidden = true;
    $("#round1-summary").innerHTML = `<p><strong>Round 1 done.</strong> The neuron made ${round1Mistakes} mistakes, and you nudged it ${round1Mistakes} times. Its weights are now Sunny ${fmt(w[0])}, Friends ${fmt(w[1])}, Homework ${fmt(w[2])}, threshold ${fmt(T)}.</p>
      <p>Is it perfect now? The only way to find out is another round. You know the recipe, and so does the computer.</p>`;
    $("#auto-wrap").hidden = false;
    $("#chart-sam-card").hidden = false;
    samChart.set(samHist);
  });

  $("#auto-run").addEventListener("click", (e) => {
    e.currentTarget.disabled = true;
    let i = 0, mistakes = 0;
    const timer = setInterval(() => {
      const d = SAM[i];
      nLearn.set({ values: d.values });
      const r = learnStep(d.values, d.go, w, T);
      if (r.mistake) { mistakes++; w = r.w; T = r.T; nLearn.set({ weights: w, threshold: T }); }
      i++;
      if (i === SAM.length) {
        samHist.push(mistakes);
        samChart.set(samHist);
        if (mistakes === 0 || samHist.length >= 10) {
          clearInterval(timer);
          $("#sam-done").innerHTML = `<strong>Round ${samHist.length}: no mistakes. The neuron has learned Sam's decisions by itself.</strong>
            It ended with Sunny ${fmt(w[0])}, Friends ${fmt(w[1])}, Homework ${fmt(w[2])}, threshold ${fmt(T)}.
            In Stop 3, one hand-made answer was Sunny 2, Friends 2, Homework −3, threshold 1. Different numbers, same six decisions: there's often more than one set of weights that works.`;
          showOnce("c3");
        }
        i = 0; mistakes = 0;
      }
    }, 420);
  });

  /* ================= PART 4: X vs O ================= */
  const G = 5;
  const pic = (s) => s.replace(/\s/g, "").split("").map((c) => (c === "#" ? 1 : 0));
  const XS = [
    "#...# .#.#. ..#.. .#.#. #...#", "..... .#.#. ..#.. .#.#. .....", "#...# .#.#. ..#.. .#.#. #....", "....# .#.#. ..#.. .#.#. #...#",
    "##.## .#.#. ..#.. .#.#. ##.##", "#...# .#.#. ..... .#.#. #...#", "#..#. .##.. .##.. #..#. .....", "#...# ##.## ..#.. ##.## #...#",
  ];
  const OS = [
    ".###. #...# #...# #...# .###.", "..... .###. .#.#. .###. .....", "##### #...# #...# #...# #####", ".###. #...# #...# #...# .##..",
    ".##.. #..#. #..#. #..#. .##..", ".###. #...# #.... #...# .###.", "###.. #.#.. ###.. ..... .....", ".###. ##.## #...# ##.## .###.",
  ];
  const XO = [];
  XS.forEach((s, i) => { XO.push({ x: pic(s), y: true }); XO.push({ x: pic(OS[i]), y: false }); });

  const exBox = $("#xo-examples");
  exBox.innerHTML = XO.map((d, i) => `<div class="ex" data-ex="${i}"><div class="mini-grid tiny">${d.x.map((v) => `<span class="${v ? "ink" : ""}"></span>`).join("")}</div><span>${d.y ? "X" : "O"}</span></div>`).join("");

  const curBox = $("#xo-current"), wBox = $("#xo-weights");
  for (let i = 0; i < G * G; i++) {
    curBox.insertAdjacentHTML("beforeend", `<div class="mcell"></div>`);
    wBox.insertAdjacentHTML("beforeend", `<div class="mcell"></div>`);
  }
  let xw, xT, xi, xMist, xHist, xDone, xTimer = null;
  const xoChart = Chart($("#chart-xo"), 8);

  function drawWeights(flash = []) {
    [...wBox.children].forEach((c, i) => {
      const v = xw[i];
      const pct = Math.min(100, Math.abs(v) * 30);
      c.style.background = v === 0 ? "" : `color-mix(in srgb, var(${v > 0 ? "--good" : "--bad"}) ${pct}%, var(--surface))`;
      c.style.color = v === 0 ? "" : Math.abs(v) >= 2 ? "var(--surface)" : `var(${v > 0 ? "--good" : "--bad"})`;
      c.textContent = fmt(v);
      c.classList.toggle("flash", flash.includes(i));
    });
    $("#xo-t").textContent = fmt(xT);
  }
  function drawCurrent(d) {
    [...curBox.children].forEach((c, i) => c.classList.toggle("ink", !!(d && d.x[i])));
  }
  function resetXO() {
    clearInterval(xTimer); xTimer = null;
    xw = Array(G * G).fill(0); xT = 1; xi = 0; xMist = 0; xHist = []; xDone = false;
    drawWeights(); drawCurrent(null);
    exBox.querySelectorAll(".ex").forEach((e) => e.classList.remove("cur", "miss", "ok"));
    $("#xo-current-cap").textContent = "Example";
    $("#xo-status").innerHTML = "Press <strong>Step</strong> to show the neuron the first example.";
    $("#xo-step").disabled = false; $("#xo-play").disabled = false; $("#xo-play").textContent = "Play ▶";
    xoChart.set([]);
  }
  function stepXO() {
    if (xDone) return;
    if (xi === 0) exBox.querySelectorAll(".ex").forEach((e) => e.classList.remove("miss", "ok"));
    const d = XO[xi];
    exBox.querySelectorAll(".ex").forEach((e, i) => e.classList.toggle("cur", i === xi));
    drawCurrent(d);
    const s = sumOf(d.x, xw);
    const r = learnStep(d.x, d.y, xw, xT);
    const saidTxt = r.said ? "X" : "O";
    $("#xo-current-cap").textContent = `Example ${xi + 1} of 16 · really ${d.y ? "X" : "O"}`;
    let msg = `Round ${xHist.length + 1}, example ${xi + 1}: sum = ${fmt(s)}, threshold ${fmt(xT)}, so it said <strong>${saidTxt}</strong>. `;
    if (r.mistake) {
      xMist++;
      const inked = d.x.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      xw = r.w; xT = r.T;
      drawWeights(inked);
      msg += `<span class="neg">Wrong: ${r.kind === "cautious" ? "too cautious" : "too eager"}.</span> Every inked square's weight ${r.kind === "cautious" ? "+1" : "−1"}, threshold ${r.kind === "cautious" ? "−1" : "+1"}.`;
      exBox.children[xi].classList.add("miss");
    } else {
      drawWeights();
      msg += `<span class="pos">Right</span>: nothing changes.`;
      exBox.children[xi].classList.add("ok");
    }
    xi++;
    if (xi === XO.length) {
      xHist.push(xMist); xoChart.set(xHist);
      if (xMist === 0 || xHist.length >= 10) {
        xDone = true;
        clearInterval(xTimer); xTimer = null;
        $("#xo-step").disabled = true; $("#xo-play").disabled = true; $("#xo-play").textContent = "Play ▶";
        msg = `<strong>Round ${xHist.length}: all 16 right. It has learned to tell X from O.</strong> Look at the weights: can you see the X?`;
        $("#xo-test-card").hidden = false;
        renderTest();
        showOnce("c4");
      } else {
        msg += ` <em>End of round ${xHist.length}: ${xMist} mistake${xMist === 1 ? "" : "s"}. Starting another round.</em>`;
      }
      xi = 0; xMist = 0;
    }
    $("#xo-status").innerHTML = msg;
  }
  $("#xo-step").addEventListener("click", stepXO);
  $("#xo-play").addEventListener("click", (e) => {
    if (xTimer) { clearInterval(xTimer); xTimer = null; e.currentTarget.textContent = "Play ▶"; return; }
    e.currentTarget.textContent = "Pause ❚❚";
    xTimer = setInterval(stepXO, 650);
  });
  $("#xo-reset").addEventListener("click", resetXO);
  resetXO();

  // Test drawing
  const testBox = $("#xo-test");
  const PRESETS = {
    x: "#...# .#.#. ..#.. .#.#. #...#",
    wonky: "#.... .#..# ..#.. .#.#. #...#",
    plus: "..#.. ..#.. ##### ..#.. ..#..",
    clear: ".........................",
  };
  let drawing = pic(PRESETS.wonky);
  for (let i = 0; i < G * G; i++) testBox.insertAdjacentHTML("beforeend", `<button class="mcell" data-i="${i}" aria-label="Row ${Math.floor(i / G) + 1}, column ${(i % G) + 1}"></button>`);
  function renderTest() {
    [...testBox.children].forEach((c, i) => { c.classList.toggle("ink", !!drawing[i]); c.setAttribute("aria-pressed", !!drawing[i]); });
    const s = sumOf(drawing, xw);
    const isX = s >= xT;
    $("#xo-test-verdict").innerHTML = `Sum = <strong>${fmt(s)}</strong>, threshold ${fmt(xT)}<br><span class="big ${isX ? "pos" : "neg"}">It thinks: ${isX ? "X" : "O"}</span>`;
  }
  testBox.addEventListener("click", (e) => {
    const c = e.target.closest("[data-i]");
    if (!c) return;
    drawing[+c.dataset.i] = 1 - drawing[+c.dataset.i];
    renderTest();
  });
  document.querySelector(".test-presets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-draw]");
    if (!b) return;
    drawing = pic(PRESETS[b.dataset.draw]);
    renderTest();
  });

  /* ================= PART 5: Jordan (can't be learned by one neuron) ================= */
  const JORDAN = [
    { x: [1, 0], y: true, label: "Sunny only" },
    { x: [0, 1], y: true, label: "Friends only" },
    { x: [1, 1], y: false, label: "Both (too crowded)" },
    { x: [0, 0], y: false, label: "Neither" },
  ];
  $("#jordan-table").innerHTML = `<div class="j-row j-head"><span>Afternoon</span><span>Sunny</span><span>Friends</span><span>Jordan</span></div>` +
    JORDAN.map((d) => `<div class="j-row"><span>${d.label}</span><span class="mono">${d.x[0]}</span><span class="mono">${d.x[1]}</span><span><strong>${d.y ? "GO" : "STAY"}</strong></span></div>`).join("");
  const jChart = Chart($("#chart-jordan"), 4);
  $("#jordan-run").addEventListener("click", (e) => {
    e.currentTarget.disabled = true;
    let jw = [0, 0], jT = 1;
    const hist = [];
    const timer = setInterval(() => {
      let m = 0;
      JORDAN.forEach((d) => { const r = learnStep(d.x, d.y, jw, jT); if (r.mistake) { m++; jw = r.w; jT = r.T; } });
      hist.push(m);
      jChart.set(hist);
      if (hist.length === 10) {
        clearInterval(timer);
        $("#jordan-note").innerHTML = `<strong>10 rounds, and it's still making mistakes every round.</strong> It never settles, because no set of weights can get all four right. It would go on nudging forever.`;
      }
    }, 300);
  });

  $("#s5").addEventListener("revealed", () => LearnAI.markComplete("04-learning-from-mistakes"));
})();
