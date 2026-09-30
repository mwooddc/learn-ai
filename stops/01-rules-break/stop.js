// Stop 1 · Rules break
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ================= PART 1: the hook ================= */

  const HOOK = [
    { t: "FREE 5000 GEMS!! claim now at gems-giveaway.site", scam: true },
    { t: "gg wp, rematch?", scam: false },
    { t: "Send me your login and I'll level up your account for you", scam: true },
    { t: "my wifi is so bad today", scam: false },
    { t: "You WON a mystery box!! verify your account to open it", scam: true },
    { t: "who picked this map again 😂", scam: false },
  ];
  const hookAnswers = new Array(HOOK.length).fill(null);
  let hookStart = null;

  function renderHook() {
    const list = $("#hook-list");
    list.innerHTML = "";
    HOOK.forEach((m, i) => {
      const li = document.createElement("li");
      li.className = "msg";
      const ans = hookAnswers[i];
      let right;
      if (ans === null) {
        right = `<div class="msg-actions">
          <button class="btn" data-hook="${i}" data-ans="scam">Scam</button>
          <button class="btn" data-hook="${i}" data-ans="friend">Friend</button></div>`;
      } else {
        const correct = ans === m.scam;
        li.classList.add(correct ? "good" : "bad");
        const label = (ans ? "You said scam" : "You said friend") + (correct ? " ✓" : " ✗");
        right = `<span class="verdict ${correct ? "good" : "bad"}">${label}</span>`;
      }
      li.innerHTML = `<span class="msg-text">${esc(m.t)}</span>${right}`;
      list.appendChild(li);
    });
  }

  $("#hook-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hook]");
    if (!b) return;
    if (hookStart === null) hookStart = performance.now();
    const i = +b.dataset.hook;
    hookAnswers[i] = b.dataset.ans === "scam";
    renderHook();
    // keep keyboard users moving down the list
    const next = $("#hook-list [data-hook]");
    if (next) next.focus();
    if (hookAnswers.every((a) => a !== null)) finishHook();
  });

  function finishHook() {
    const secs = Math.max(1, Math.round((performance.now() - hookStart) / 1000));
    const right = hookAnswers.filter((a, i) => a === HOOK[i].scam).length;
    const out = $("#hook-result");
    out.innerHTML = `
      <p class="big">${right} out of ${HOOK.length}, in about ${secs} second${secs === 1 ? "" : "s"}.</p>
      <p>You didn't follow a checklist. You read each message and <em>knew</em>. Part of that was noticing words like "free" or "login". But a lot of it is harder to pin down: the tone, whether it sounds too good to be true, what a real friend would actually say.</p>`;
    out.hidden = false;
    $("#hook-continue").hidden = false;
  }

  renderHook();

  /* ================= PART 2: the rule filter ================= */

  const DAYS = [
    {
      name: "Monday",
      intro: "Your first shift. Add rules until your filter handles these messages well.",
      msgs: [
        { t: "FREE GEMS!!! click here to claim", scam: true },
        { t: "Win a free legendary skin, just enter your password", scam: true },
        { t: "Get 10000 coins free at coins4u.site", scam: true },
        { t: "Claim your prize now before it expires!!", scam: true },
        { t: "free gems for everyone who adds me", scam: true },
        { t: "gg that was a close one", scam: false },
        { t: "want to team up after dinner?", scam: false },
        { t: "how did you get past level 12", scam: false },
        { t: "lol my brother just walked in front of the camera", scam: false },
        { t: "nice skin! where did you get it", scam: false },
        { t: "brb getting a snack", scam: false },
      ],
    },
    {
      name: "Tuesday",
      intro: "Overnight, the scammers noticed their messages were being blocked. Your rules haven't changed. Run them and see.",
      msgs: [
        { t: "FR33 G3MS click fast", scam: true },
        { t: "g.e.m.s giveaway, message me your login", scam: true },
        { t: "you have been selected!! reward waiting at gemzone.site", scam: true },
        { t: "Hi, it's the game team. We need your password to verify your account", scam: true },
        { t: "want free stuff? add me", scam: true },
        { t: "are you free on Saturday?", scam: false },
        { t: "I won!! first place finally", scam: false },
        { t: "my password got reset so I'm on a new account", scam: false },
        { t: "lol that prize wheel is rigged", scam: false },
        { t: "the new update has a free map", scam: false },
        { t: "go claim the hill, I'll cover you", scam: false },
      ],
    },
    {
      name: "Wednesday",
      intro: "Word has spread. The scammers are getting sneaky, and your friends keep chatting as normal.",
      msgs: [
        { t: "omg is this you in this video?? vid-clips.site/you", scam: true },
        { t: "I'm quitting the game, giving my account away. send your login so I can swap it over", scam: true },
        { t: "Congratulations, you are today's lucky player", scam: true },
        { t: "f r e e  g e m s  in my profile", scam: true },
        { t: "gift for you 🎁 tap the link in my bio", scam: true },
        { t: "that video you sent was so funny", scam: false },
        { t: "I'm quitting for tonight, see you tomorrow", scam: false },
        { t: "congrats on the win!!", scam: false },
        { t: "free gems are in the chest behind the waterfall btw", scam: false },
        { t: "my link keeps lagging", scam: false },
        { t: "lucky shot lol", scam: false },
      ],
    },
  ];
  const TOTAL_SCAMS = (d) => DAYS[d].msgs.filter((m) => m.scam).length;
  const TOTAL_FRIENDS = (d) => DAYS[d].msgs.filter((m) => !m.scam).length;

  const SUGGESTIONS = ["free", "gems", "click", "password", "prize", "claim", "login", ".site"];

  const state = {
    rules: [],          // { type: "block" | "allow", word }
    totalAdded: 0,
    day: 0,             // day being viewed
    unlocked: 0,        // furthest day reached
    ran: [false, false, false],
    firstTry: [null, null, null], // { missed, wrongBlocked }
    reflected: false,
  };

  function evaluate(text) {
    const lower = text.toLowerCase();
    const blockHits = state.rules.filter((r) => r.type === "block" && lower.includes(r.word));
    const allowHits = state.rules.filter((r) => r.type === "allow" && lower.includes(r.word));
    return { blocked: blockHits.length > 0 && allowHits.length === 0, blockHits, allowHits };
  }

  // Wrap every matched rule word in <mark> so learners can see *why* a rule fired.
  function highlight(text, res) {
    const lower = text.toLowerCase();
    const marks = new Array(text.length).fill(null);
    const paint = (hits, kind) => {
      for (const r of hits) {
        let i = lower.indexOf(r.word);
        while (i !== -1) {
          for (let k = i; k < i + r.word.length; k++) marks[k] = kind;
          i = lower.indexOf(r.word, i + 1);
        }
      }
    };
    paint(res.blockHits, "block");
    paint(res.allowHits, "allow");
    let out = "";
    let i = 0;
    while (i < text.length) {
      const kind = marks[i];
      let j = i;
      while (j < text.length && marks[j] === kind) j++;
      const seg = esc(text.slice(i, j));
      out += kind ? `<mark class="hit-${kind}">${seg}</mark>` : seg;
      i = j;
    }
    return out;
  }

  function scoreDay(d) {
    let missed = 0, wrongBlocked = 0, caught = 0;
    for (const m of DAYS[d].msgs) {
      const { blocked } = evaluate(m.t);
      if (m.scam && blocked) caught++;
      if (m.scam && !blocked) missed++;
      if (!m.scam && blocked) wrongBlocked++;
    }
    return { caught, missed, wrongBlocked, mistakes: missed + wrongBlocked };
  }

  /* ---- rules UI ---- */

  const form = $("#rule-form");
  const wordInput = $("#rule-word");
  let errorEl = null;

  function showRuleError(msg) {
    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.className = "rule-error";
      errorEl.setAttribute("role", "alert");
      form.after(errorEl);
    }
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function addRule(type, raw) {
    const word = raw.toLowerCase().trim();
    if (!word) { showRuleError("Type a word (or a few letters) for the rule to look for."); return false; }
    if (state.rules.some((r) => r.type === type && r.word === word)) {
      showRuleError(`You already have that rule.`);
      return false;
    }
    showRuleError("");
    state.rules.push({ type, word });
    state.totalAdded++;
    renderAll();
    return true;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (addRule($("#rule-type").value, wordInput.value)) wordInput.value = "";
    wordInput.focus();
  });

  const suggest = $("#suggest");
  SUGGESTIONS.forEach((w) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = w;
    b.addEventListener("click", () => {
      wordInput.value = w;
      wordInput.focus();
    });
    suggest.appendChild(b);
  });

  $("#rule-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-remove]");
    if (!b) return;
    state.rules.splice(+b.dataset.remove, 1);
    renderAll();
  });

  function renderRules() {
    const list = $("#rule-list");
    list.innerHTML = state.rules
      .map((r, i) => `<li class="rule"><span class="tag ${r.type}">${r.type}</span><span class="word">${esc(r.word)}</span>
        <button class="remove" data-remove="${i}" aria-label="Remove rule: ${r.type} ${esc(r.word)}">×</button></li>`)
      .join("");
    $("#rule-empty").hidden = state.rules.length > 0;
  }

  /* ---- days UI ---- */

  function renderTabs() {
    const tabs = $("#day-tabs");
    tabs.innerHTML = DAYS.map((d, i) => {
      const locked = i > state.unlocked;
      return `<button class="day-tab" role="tab" data-day="${i}" aria-selected="${i === state.day}" ${locked ? "disabled" : ""}>
        ${locked ? "🔒 " : ""}${d.name}</button>`;
    }).join("");
  }

  $("#day-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]");
    if (!b || b.disabled) return;
    state.day = +b.dataset.day;
    renderAll();
  });

  function verdictFor(m, blocked) {
    if (m.scam && blocked) return { cls: "good", label: "Scam stopped" };
    if (m.scam) return { cls: "bad", label: "Scam got through" };
    if (blocked) return { cls: "bad", label: "Friend blocked" };
    return { cls: "good", label: "Delivered" };
  }

  function renderDay() {
    const d = state.day;
    const day = DAYS[d];
    const ran = state.ran[d];
    const panel = $("#day-panel");

    let html = `<div class="day-head"><h3>${day.name}'s messages</h3>
      ${ran ? "" : `<button class="btn primary" id="run-day">Run my rules</button>`}</div>
      <p class="day-intro">${day.intro}</p>`;

    if (ran) {
      const s = scoreDay(d);
      html += `<div class="score" aria-live="polite">
        <div class="stat ${s.caught === TOTAL_SCAMS(d) ? "good" : "bad"}"><div class="n">${s.caught} / ${TOTAL_SCAMS(d)}</div><div class="l">scams stopped</div></div>
        <div class="stat ${s.wrongBlocked === 0 ? "good" : "bad"}"><div class="n">${s.wrongBlocked} / ${TOTAL_FRIENDS(d)}</div><div class="l">friends wrongly blocked</div></div>
      </div>`;
      const ft = state.firstTry[d];
      if (d > 0 && ft) {
        html += `<p class="first-try-note">First try this morning: <strong>${ft.mistakes} mistake${ft.mistakes === 1 ? "" : "s"}</strong>. Results update as you change your rules.</p>`;
      } else {
        html += `<p class="first-try-note">Results update as you change your rules.</p>`;
      }
    }

    html += `<ul class="msgs">` + day.msgs.map((m) => {
      if (!ran) {
        return `<li class="msg"><span class="msg-text">${esc(m.t)}</span><span class="verdict pending">?</span></li>`;
      }
      const res = evaluate(m.t);
      const v = verdictFor(m, res.blocked);
      return `<li class="msg ${v.cls}"><span class="msg-text">${highlight(m.t, res)}</span><span class="verdict ${v.cls}">${v.label}</span></li>`;
    }).join("") + `</ul>`;

    if (ran && d === state.unlocked) {
      if (d < DAYS.length - 1) {
        html += `<div class="day-foot"><p>Happy with your filter?</p><button class="btn primary" id="next-day">Next morning →</button></div>`;
      } else if (!state.reflected) {
        html += `<div class="day-foot"><button class="btn primary" id="reflect">What just happened? ↓</button></div>`;
      }
    }

    panel.innerHTML = html;
  }

  $("#day-panel").addEventListener("click", (e) => {
    if (e.target.closest("#run-day")) {
      const d = state.day;
      state.ran[d] = true;
      state.firstTry[d] = scoreDay(d);
      renderAll();
    } else if (e.target.closest("#next-day")) {
      state.unlocked++;
      state.day = state.unlocked;
      renderAll();
      $("#day-tabs").scrollIntoView({ block: "start" });
    } else if (e.target.closest("#reflect")) {
      state.reflected = true;
      renderAll();
      LearnAI.reveal("s3");
    }
  });

  /* ================= PART 3: scoreboard ================= */

  function renderScoreboard() {
    const max = Math.max(...DAYS.map((d) => d.msgs.length));
    let html = "";
    DAYS.forEach((day, d) => {
      const ft = state.firstTry[d];
      if (!ft) return;
      const now = scoreDay(d);
      html += `<div class="sb-row"><div class="sb-day">${day.name}</div><div class="sb-bars">
        <div class="sb-bar"><div class="sb-track"><div class="sb-fill first" style="width:${(ft.mistakes / max) * 100}%"></div></div><span class="sb-n">${ft.mistakes}</span></div>
        <div class="sb-bar"><div class="sb-track"><div class="sb-fill after" style="width:${(now.mistakes / max) * 100}%"></div></div><span class="sb-n">${now.mistakes}</span></div>
      </div></div>`;
    });
    html += `<div class="sb-legend"><span><i style="background:var(--bad)"></i>Mistakes on first try</span><span><i style="background:var(--ink-3)"></i>Mistakes with your rules now</span></div>`;
    $("#scoreboard").innerHTML = html;

    const n = state.totalAdded;
    $("#rule-count-line").textContent =
      `You wrote ${n} rule${n === 1 ? "" : "s"} to handle three days and ${DAYS.reduce((a, d) => a + d.msgs.length, 0)} messages. ` +
      `A popular game might see millions of messages every day, in dozens of languages, with new tricks every week.`;
  }

  $("#go-monday").addEventListener("click", () => {
    state.day = 0;
    renderAll();
    $("#day-tabs").scrollIntoView({ block: "start" });
  });

  function renderAll() {
    renderRules();
    renderTabs();
    renderDay();
    if (state.reflected) renderScoreboard();
  }

  renderAll();

  /* ================= PART 4: cat rules ================= */

  const FEATURES = [
    { id: "ears", label: "Pointy ears", short: "ears" },
    { id: "whiskers", label: "Whiskers", short: "whiskers" },
    { id: "fur", label: "Fur", short: "fur" },
    { id: "legs", label: "Four legs showing", short: "legs" },
    { id: "tail", label: "A tail showing", short: "tail" },
  ];
  // Hand-drawn so each picture shows exactly what its card describes.
  const shadow = (cx, rx) => `<ellipse cx="${cx}" cy="76" rx="${rx}" ry="3" fill="#000" opacity=".1"/>`;
  const svg = (label, body) => `<svg viewBox="0 0 120 80" role="img" aria-label="${label}">${body}</svg>`;
  const ART = {
    walking: svg("A tabby cat walking", `${shadow(62, 40)}
      <path d="M88 46 C104 44 108 26 100 16" fill="none" stroke="#e59a4b" stroke-width="6" stroke-linecap="round"/>
      <rect x="54" y="52" width="7" height="22" rx="3.5" fill="#c9823c"/><rect x="85" y="52" width="7" height="22" rx="3.5" fill="#c9823c"/>
      <rect x="44" y="52" width="7" height="22" rx="3.5" fill="#e59a4b"/><rect x="76" y="52" width="7" height="22" rx="3.5" fill="#e59a4b"/>
      <ellipse cx="66" cy="47" rx="27" ry="13" fill="#e59a4b"/>
      <path d="M60 36 q2 8 0 14 M70 35 q2 9 0 16 M80 37 q2 8 0 13" stroke="#b8672a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <polygon points="26,30 27,14 37,25" fill="#e59a4b"/><polygon points="37,24 45,13 48,28" fill="#e59a4b"/>
      <polygon points="28.5,26 29,19 33.5,24" fill="#f3b6a0"/>
      <circle cx="36" cy="36" r="13" fill="#e59a4b"/>
      <path d="M36 24 v5 M41 25 v5" stroke="#b8672a" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="30" cy="34" r="1.9" fill="#1d1b18"/><circle cx="24.5" cy="39" r="1.5" fill="#d9777a"/>
      <path d="M27 41 L12 39 M27 43 L13 46" stroke="#1d1b18" stroke-width=".9" opacity=".6"/>`),

    fox: svg("A red fox", `${shadow(64, 44)}
      <path d="M86 44 C104 36 118 46 116 60 C106 58 96 54 86 51 Z" fill="#e2622a"/>
      <path d="M109 49 C115 51 117 56 116 60 C111 59 107 57 104 55 Z" fill="#fbf3ea"/>
      <rect x="54" y="52" width="6" height="22" rx="3" fill="#2e211b"/><rect x="85" y="52" width="6" height="22" rx="3" fill="#2e211b"/>
      <rect x="44" y="52" width="6" height="22" rx="3" fill="#3a2a22"/><rect x="76" y="52" width="6" height="22" rx="3" fill="#3a2a22"/>
      <ellipse cx="66" cy="47" rx="27" ry="12" fill="#e2622a"/>
      <ellipse cx="46" cy="50" rx="8" ry="7" fill="#fbf3ea"/>
      <polygon points="27,30 28,11 39,25" fill="#e2622a"/><polygon points="38,24 47,10 49,29" fill="#e2622a"/>
      <polygon points="30,26 30.5,17 35,23" fill="#3a2a22"/>
      <circle cx="38" cy="36" r="12" fill="#e2622a"/>
      <path d="M29 31 L11 40 L29 46 Z" fill="#e2622a"/><path d="M28 40 L12 40.5 L29 46 Z" fill="#fbf3ea"/>
      <circle cx="12" cy="40" r="2.2" fill="#1d1b18"/><circle cx="32" cy="34" r="1.9" fill="#1d1b18"/>
      <path d="M20 43 L9 46 M21 44 L11 49" stroke="#1d1b18" stroke-width=".9" opacity=".6"/>`),

    husky: svg("A husky dog", `${shadow(64, 44)}
      <path d="M92 42 C108 36 106 18 94 20" fill="none" stroke="#7d8591" stroke-width="8" stroke-linecap="round"/>
      <rect x="54" y="52" width="8" height="22" rx="4" fill="#b4b9c1"/><rect x="86" y="52" width="8" height="22" rx="4" fill="#b4b9c1"/>
      <rect x="44" y="52" width="8" height="22" rx="4" fill="#cfd3d9"/><rect x="76" y="52" width="8" height="22" rx="4" fill="#cfd3d9"/>
      <ellipse cx="68" cy="46" rx="29" ry="14" fill="#7d8591"/>
      <ellipse cx="66" cy="54" rx="21" ry="5" fill="#eceef0"/>
      <polygon points="26,27 28,9 38,22" fill="#7d8591"/><polygon points="37,21 47,9 48,26" fill="#7d8591"/>
      <polygon points="29,23 29.5,15 34,21" fill="#eceef0"/>
      <circle cx="36" cy="34" r="13" fill="#7d8591"/>
      <path d="M24 36 C28 30 40 32 45 40 C40 48 28 48 24 42 Z" fill="#eceef0"/>
      <rect x="10" y="35" width="20" height="11" rx="5.5" fill="#eceef0"/>
      <path d="M17 46 q3 6 6 0 Z" fill="#e07a86"/>
      <circle cx="11.5" cy="38.5" r="2.6" fill="#1d1b18"/><circle cx="31" cy="31" r="1.9" fill="#1d1b18"/>
      <path d="M18 42 L8 44 M19 43 L9 47" stroke="#1d1b18" stroke-width=".8" opacity=".45"/>`),

    curled: svg("A grey cat curled up asleep", `${shadow(62, 46)}
      <ellipse cx="66" cy="54" rx="38" ry="20" fill="#6b6f7d"/>
      <path d="M58 40 q4 8 0 16 M72 37 q4 9 0 19 M86 40 q4 8 0 15" stroke="#575a67" stroke-width="3" fill="none" stroke-linecap="round"/>
      <polygon points="25,45 24,28 35,38" fill="#6b6f7d"/><polygon points="38,37 47,27 49,42" fill="#6b6f7d"/>
      <polygon points="27,41 26.5,33 31.5,38" fill="#d99a9a"/>
      <circle cx="38" cy="53" r="15" fill="#6b6f7d"/>
      <path d="M102 56 C102 76 54 78 30 70" stroke="#4b4e59" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M28 52 q3 3 6 0 M39 52 q3 3 6 0" stroke="#1d1b18" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <circle cx="30" cy="58" r="1.4" fill="#d9777a"/>
      <path d="M29 60 L15 58 M29 62 L16 65" stroke="#1d1b18" stroke-width=".9" opacity=".6"/>
      <text x="86" y="26" font-family="sans-serif" font-weight="700" font-size="13" fill="#8a8378">z</text>
      <text x="96" y="17" font-family="sans-serif" font-weight="700" font-size="9" fill="#8a8378">z</text>`),

    hairless: svg("A hairless cat with wrinkly pink skin", `${shadow(62, 40)}
      <path d="M88 46 C102 44 106 28 100 18" fill="none" stroke="#e8bda8" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="54" y="52" width="6" height="22" rx="3" fill="#d9aa94"/><rect x="85" y="52" width="6" height="22" rx="3" fill="#d9aa94"/>
      <rect x="44" y="52" width="6" height="22" rx="3" fill="#e8bda8"/><rect x="76" y="52" width="6" height="22" rx="3" fill="#e8bda8"/>
      <ellipse cx="66" cy="47" rx="26" ry="12" fill="#e8bda8"/>
      <path d="M50 42 q4 -3 8 0 M52 47 q4 -3 8 0 M76 41 q4 -3 8 0" stroke="#c98f7a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <polygon points="23,32 20,7 36,24" fill="#e8bda8"/><polygon points="37,23 50,5 50,29" fill="#e8bda8"/>
      <polygon points="25.5,28 24,13 32,24" fill="#d99a86"/><polygon points="40,23 47.5,11 47.5,26" fill="#d99a86"/>
      <circle cx="36" cy="36" r="12.5" fill="#e8bda8"/>
      <path d="M31 27 q4 -2 8 0 M32 30 q4 -2 8 0" stroke="#c98f7a" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <ellipse cx="30" cy="35" rx="2.2" ry="2.6" fill="#1d1b18"/><circle cx="25" cy="40" r="1.5" fill="#d9777a"/>`),

    away: svg("A tabby cat sitting with its back to you", `${shadow(62, 30)}
      <path d="M74 72 C94 74 98 58 90 50" stroke="#e59a4b" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M40 74 C36 50 46 36 60 36 C74 36 84 50 80 74 Z" fill="#e59a4b"/>
      <path d="M50 47 q10 4 20 0 M46 56 q14 5 28 0 M44 65 q16 5 32 0" stroke="#b8672a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <polygon points="46,22 47,5 57,15" fill="#e59a4b"/><polygon points="63,15 73,5 74,22" fill="#e59a4b"/>
      <circle cx="60" cy="25" r="14" fill="#e59a4b"/>
      <path d="M55 13 v8 M60 11 v10 M65 13 v8" stroke="#b8672a" stroke-width="2.5" stroke-linecap="round"/>`),

    rabbit: svg("A lop-eared rabbit with ears hanging down", `${shadow(62, 38)}
      <ellipse cx="80" cy="73" rx="13" ry="3.5" fill="#a8957f"/>
      <ellipse cx="76" cy="57" rx="23" ry="16" fill="#c9b8a6"/>
      <ellipse cx="70" cy="73" rx="14" ry="4" fill="#b9a794"/>
      <rect x="51" y="56" width="7" height="18" rx="3.5" fill="#b9a794"/>
      <ellipse cx="60" cy="53" rx="22" ry="14" fill="#c9b8a6"/>
      <rect x="42" y="56" width="7" height="18" rx="3.5" fill="#c9b8a6"/>
      <circle cx="40" cy="40" r="13" fill="#c9b8a6"/>
      <path d="M43 28 C55 29 58 50 52 60 C47 58 43 45 43 28 Z" fill="#b9a794"/>
      <path d="M45 32 C52 34 54 48 51 55 C48 52 46 44 45 32 Z" fill="#e4a7a0"/>
      <circle cx="35" cy="38" r="2.1" fill="#1d1b18"/><circle cx="28" cy="43" r="1.6" fill="#d9777a"/>
      <path d="M29 45 L17 44 M29 47 L18 50" stroke="#1d1b18" stroke-width=".9" opacity=".6"/>`),
  };

  const all = { ears: 1, whiskers: 1, fur: 1, legs: 1, tail: 1 };
  const ANIMALS = [
    { name: "Cat, walking", art: "walking", cat: true, f: { ...all } },
    { name: "Fox", art: "fox", cat: false, f: { ...all } },
    { name: "Husky", art: "husky", cat: false, f: { ...all } },
    { name: "Cat, curled up asleep", art: "curled", cat: true, f: { ...all, legs: 0 } },
    { name: "Hairless cat", art: "hairless", cat: true, f: { ...all, fur: 0, whiskers: 0 } },
    { name: "Cat, facing away", art: "away", cat: true, f: { ...all, whiskers: 0, legs: 0 } },
    { name: "Lop-eared rabbit", art: "rabbit", cat: false, f: { ...all, ears: 0, tail: 0 } },
  ];
  const chosen = new Set();
  let catTries = 0;

  const featBox = $("#features");
  featBox.innerHTML = FEATURES.map((f) => `<button class="feature" data-feat="${f.id}" aria-pressed="false">${f.label}</button>`).join("");
  featBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-feat]");
    if (!b) return;
    const id = b.dataset.feat;
    chosen.has(id) ? chosen.delete(id) : chosen.add(id);
    b.setAttribute("aria-pressed", chosen.has(id));
    catTries++;
    renderAnimals();
  });

  function renderAnimals() {
    let right = 0;
    $("#animals").innerHTML = ANIMALS.map((a) => {
      const saysCat = [...chosen].every((id) => a.f[id]);
      const ok = saysCat === a.cat;
      if (ok) right++;
      const feats = FEATURES.map((f) => `<span class="${a.f[f.id] ? "" : "no"}">${f.short}</span>`).join("");
      return `<div class="animal ${ok ? "good" : "bad"}">
        <div class="animal-pic">${ART[a.art]}</div>
        <div class="animal-name">${a.name}</div>
        <div class="animal-feats" aria-label="Visible features">${feats}</div>
        <div class="animal-says">Rule says: ${saysCat ? "CAT" : "NOT A CAT"} ${ok ? "✓" : "✗"}</div>
      </div>`;
    }).join("");
    $("#cat-score").textContent = `Your rule gets ${right} out of ${ANIMALS.length} right.` +
      (catTries >= 4 && right < ANIMALS.length ? " Keep trying… or is it even possible?" : "");
  }
  renderAnimals();

  $("#cat-possible").addEventListener("click", (e) => {
    $("#cat-explain").hidden = false;
    $("#cat-continue").hidden = false;
    e.currentTarget.hidden = true;
  });

  /* ================= PART 5: what the computer sees ================= */

  // Left half of a 16×16 cat face; each row is mirrored to make the right half.
  const HALF = [
    "........",
    "..#.....",
    "..#m....",
    "..#m#...",
    "..######",
    ".#######",
    ".###oo##",
    ".###oo##",
    ".#######",
    ".######n",
    "..######",
    "...#####",
    "....####",
    "........",
    "........",
    "........",
  ];
  const SHADE = { ".": 238, "#": 38, "m": 120, "o": 214, "n": 160 };
  const grid = $("#pixel-grid");
  const cells = [];
  HALF.forEach((row) => {
    const full = row + [...row].reverse().join("");
    [...full].forEach((ch) => {
      const v = SHADE[ch];
      const c = document.createElement("div");
      c.className = "px";
      c.style.backgroundColor = `rgb(${v},${v},${v})`;
      c.textContent = v;
      cells.push(c);
    });
  });
  grid.append(...cells);

  const toggle = $("#pixel-toggle");
  toggle.addEventListener("click", () => {
    const on = grid.classList.toggle("numbers");
    toggle.setAttribute("aria-pressed", on);
    toggle.textContent = on ? "Show the picture again" : "Show what the computer sees";
    $("#pixel-caption").textContent = on
      ? "The same picture, the way the computer receives it: 16 rows of 16 numbers."
      : "A tiny 16 × 16 picture of a cat's face.";
  });

  $("#s5").addEventListener("revealed", () => LearnAI.markComplete("01-rules-break"));
})();
