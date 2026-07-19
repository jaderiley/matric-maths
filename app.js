/* Matric Maths — app engine (vanilla JS, hash routing, localStorage) */
(() => {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const view = $("#view");

  /* ── state ─────────────────────────────────────────────── */
  const KEY = "mm1";
  const state = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  state.attempts = state.attempts || {};   // qid -> {earned,total,ts}
  state.exams = state.exams || [];         // [{paper,date,earned,total,perTopic}]
  state.streak = state.streak || { last: "", days: 0 };

  function bumpStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.streak.last === today) return;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    state.streak.days = state.streak.last === yest ? state.streak.days + 1 : 1;
    state.streak.last = today;
  }

  /* ── data ──────────────────────────────────────────────── */
  let manifest = null;
  const topics = {};   // id -> topic data
  async function getManifest() {
    if (!manifest) {
      const r = await fetch("data/index.json");
      if (!r.ok) throw new Error("manifest " + r.status);
      manifest = await r.json();
    }
    return manifest;
  }
  async function getTopic(id) {
    if (!topics[id]) {
      const r = await fetch(`data/${id}.json`);
      if (!r.ok) throw new Error(id + " " + r.status);
      topics[id] = await r.json();
    }
    return topics[id];
  }
  /* resolves to the topics that loaded; a missing bank never blanks a view */
  async function getPaperTopics(p) {
    const m = await getManifest();
    const results = await Promise.allSettled(m.papers[p].topics.map(getTopic));
    return results.filter(r => r.status === "fulfilled").map(r => r.value);
  }

  const qMarks = (q) => q.parts.reduce((s, p) => s + p.marks, 0);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ── rendering helpers ─────────────────────────────────── */
  function renderMath(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [{ left: "$", right: "$", display: false }],
        throwOnError: false,
      });
    }
  }
  function setView(html, navKey) {
    view.innerHTML = html;
    renderMath(view);
    document.querySelectorAll(".site-nav a").forEach(a =>
      a.classList.toggle("active", a.dataset.nav === navKey));
    window.scrollTo(0, 0);
  }
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }
  const paperCol = (p) => p === "2" || p === 2 ? "var(--p2)" : "var(--p1)";
  const nscLevel = (pct) =>
    pct >= 80 ? 7 : pct >= 70 ? 6 : pct >= 60 ? 5 : pct >= 50 ? 4 : pct >= 40 ? 3 : pct >= 30 ? 2 : 1;

  /* question card body: parts, memo toggles, self-marking */
  function questionHTML(q, num, opts = {}) {
    const letters = "abcdefgh";
    const dots = "●".repeat(q.difficulty) + "○".repeat(3 - q.difficulty);
    return `
    <article class="card question" data-qid="${q.id}">
      <div class="qhead">
        <span>Question ${num}</span>
        <span class="diff" title="Difficulty ${q.difficulty}/3" aria-label="Difficulty ${q.difficulty} of 3">${dots}</span>
        <span class="marks">[${qMarks(q)}]</span>
      </div>
      ${q.context ? `<p class="qcontext">${esc(q.context)}</p>` : ""}
      ${q.svg ? `<div class="qsvg">${q.svg}</div>` : ""}
      ${q.parts.map((p, i) => `
        <div class="part" data-part="${i}">
          <span class="part__label">${num}.${i + 1}</span>
          <div class="part__body">
            <p class="part__q">${esc(p.q)} <span class="allot">(${p.marks})</span></p>
            <div class="memo" hidden>
              <p class="memo__title">Memo — ${letters[i] ? num + "." + (i + 1) : ""}</p>
              <ol>${p.solution.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
              <p class="answer">${esc(p.answer)}</p>
              ${opts.marking !== false ? `
              <div class="marker" role="group" aria-label="Marks you earned for ${num}.${i + 1}">
                <span class="marker__hint">Your marks:</span>
                ${Array.from({ length: p.marks + 1 }, (_, m) =>
                  `<button class="markchip" data-m="${m}">${m}</button>`).join("")}
              </div>` : ""}
            </div>
          </div>
        </div>`).join("")}
      <div class="btnrow">
        <button class="btn btn--red toggle-memo">Show memo</button>
      </div>
    </article>`;
  }

  /* wire up memo toggles + mark chips inside a container.
     onMark(qid, partIdx, marks, totalForPart) */
  function wireQuestions(container, onMark) {
    container.querySelectorAll(".question").forEach(card => {
      const btn = card.querySelector(".toggle-memo");
      btn.addEventListener("click", () => {
        const memos = card.querySelectorAll(".memo");
        const show = memos[0].hidden;
        memos.forEach(m => { m.hidden = !show; });
        btn.textContent = show ? "Hide memo" : "Show memo";
        if (show) renderMath(card);
      });
      card.querySelectorAll(".part").forEach(partEl => {
        partEl.querySelectorAll(".markchip").forEach(chip => {
          chip.addEventListener("click", () => {
            partEl.querySelectorAll(".markchip").forEach(c => c.classList.remove("sel"));
            chip.classList.add("sel");
            partEl.querySelector(".tick")?.remove();
            const m = +chip.dataset.m;
            const max = partEl.querySelectorAll(".markchip").length - 1;
            const t = document.createElement("span");
            t.className = "tick";
            t.textContent = m === max ? "✓" : m === 0 ? "✗" : "✓·";
            partEl.appendChild(t);
            onMark(card.dataset.qid, +partEl.dataset.part, m, max);
          });
        });
      });
    });
  }

  /* ── views ─────────────────────────────────────────────── */

  async function homeView() {
    const m = await getManifest();
    const cards = await Promise.all(Object.entries(m.papers).map(async ([p, info]) => {
      const ts = await getPaperTopics(p);
      const nq = ts.reduce((s, t) => s + t.questions.length, 0);
      const marks = ts.reduce((s, t) => s + t.questions.reduce((a, q) => a + qMarks(q), 0), 0);
      return `
        <a class="card paper-card ${p === "2" ? "paper-card--2" : ""}" href="#/paper/${p}">
          <h2>${info.title}</h2>
          <span class="sub">${info.subtitle}</span>
          <div class="meta"><span>${ts.length} topics</span><span>${nq} questions</span><span>${marks} marks banked</span></div>
        </a>`;
    }));
    const s = state.streak.days;
    setView(`
      <p class="exam-rule">National Senior Certificate — practice</p>
      <h1 class="display">Practice like it's<br>the <em>real paper</em>.</h1>
      <p class="lede">Exam-style Grade 12 maths questions with full memo solutions. Work a topic, mark yourself like a marker would, or sit a timed mock. Free, offline, no sign-up.</p>
      ${cards.join("")}
      <div class="btnrow">
        <a class="btn btn--red" href="#/exam/1">Sit a timed mock</a>
        <a class="btn btn--quiet" href="#/progress">My progress${s > 1 ? ` · ${s}-day streak` : ""}</a>
      </div>`, null);
  }

  async function paperView(p) {
    const m = await getManifest();
    const info = m.papers[p];
    if (!info) return homeView();
    const ts = await getPaperTopics(p);
    const rows = ts.map(t => {
      const { pct, tried } = topicMastery(t);
      return `
      <a class="card topic-row" href="#/topic/${t.id}">
        <div class="ring" style="--pct:${pct};--ring-col:${paperCol(p)}"><span>${tried ? pct + "%" : "–"}</span></div>
        <div class="grow">
          <h3>${esc(t.title)}</h3>
          <p class="blurb">${esc(t.blurb)} · ${t.questions.length} questions</p>
        </div>
      </a>`;
    });
    setView(`
      <p class="exam-rule">Mathematics ${info.title} — 150 marks · 3 hours</p>
      <h1 class="display">${info.title}</h1>
      <p class="lede">${info.subtitle}. Tap a topic to practise, or sit a full timed mock assembled to the real paper's mark weighting.</p>
      <div class="btnrow"><a class="btn btn--red" href="#/exam/${p}">Timed mock ${info.title}</a></div>
      ${rows.join("")}`, "p" + p);
  }

  function topicMastery(t) {
    let earned = 0, total = 0, tried = 0;
    t.questions.forEach(q => {
      const a = state.attempts[q.id];
      if (a) { earned += a.earned; total += a.total; tried++; }
    });
    return { pct: total ? Math.round(100 * earned / total) : 0, tried, coverage: Math.round(100 * tried / t.questions.length) };
  }

  async function topicView(id) {
    let t;
    try { t = await getTopic(id); } catch { return homeView(); }
    const partsState = {}; // qid -> [marks per part]
    const html = t.questions.map((q, i) => questionHTML(q, i + 1)).join("");
    const { pct, tried } = topicMastery(t);
    setView(`
      <p class="exam-rule">Paper ${t.paper} — topic practice</p>
      <h1 class="display">${esc(t.title)}</h1>
      <p class="lede">${esc(t.blurb)}. Work each part on paper first, then open the memo and award yourself marks honestly — like a marker with a red pen.</p>
      ${html}
      <div class="tally"><span>Topic record: <span id="tally-note">${tried ? pct + "% on " + tried + " tried" : "nothing marked yet"}</span></span>
      <span class="score" id="tally-score"></span></div>`, "p" + t.paper);

    wireQuestions(view, (qid, part, m) => {
      const q = t.questions.find(x => x.id === qid);
      partsState[qid] = partsState[qid] || Array(q.parts.length).fill(null);
      partsState[qid][part] = m;
      if (partsState[qid].every(v => v !== null)) {
        state.attempts[qid] = {
          earned: partsState[qid].reduce((a, b) => a + b, 0),
          total: qMarks(q), ts: Date.now(),
        };
        bumpStreak(); save();
        toast(`Question saved: ${state.attempts[qid].earned}/${state.attempts[qid].total}`);
        const ms = topicMastery(t);
        $("#tally-note").textContent = `${ms.pct}% on ${ms.tried} tried`;
      }
      const sessEarned = Object.values(partsState).flat().reduce((a, b) => a + (b || 0), 0);
      $("#tally-score").textContent = `this session: ${sessEarned}`;
    });
  }

  /* ── exam mode ─────────────────────────────────────────── */

  function buildExam(paperTopics, blueprint, scale) {
    const picked = [];
    for (const t of paperTopics) {
      const target = Math.round(blueprint[t.id] * scale);
      const pool = [...t.questions].sort(() => Math.random() - 0.5);
      let got = 0;
      for (const q of pool) {
        if (got >= target) break;
        // only take a question if it brings the topic total closer to target
        const qm = qMarks(q);
        if (Math.abs(got + qm - target) <= Math.abs(got - target)) {
          picked.push({ topic: t.id, q });
          got += qm;
        }
      }
    }
    return picked;
  }

  async function examSetupView(p) {
    const m = await getManifest();
    const info = m.papers[p];
    if (!info) return homeView();
    const sess = state.examSession;
    const resume = sess && sess.paper === p ? `
      <div class="card"><p>You have an unfinished mock (${sess.qids.length} questions, started ${new Date(sess.started).toLocaleString()}).</p>
      <div class="btnrow"><a class="btn btn--red" href="#/exam/${p}/run">Resume it</a>
      <button class="btn btn--quiet" id="discard">Discard</button></div></div>` : "";
    setView(`
      <p class="exam-rule">Mock examination — ${info.title}</p>
      <h1 class="display">Sit ${info.title}</h1>
      <p class="lede">A fresh paper is assembled from the question bank using the real ${info.title} mark weighting. Answer everything on paper — memos stay sealed until you finish. Then you mark yourself, and the app records it.</p>
      ${resume}
      <div class="card">
        <div class="btnrow">
          <button class="btn btn--red" data-len="full">Full paper · ±150 marks · 3 h</button>
          <button class="btn" data-len="half">Half paper · ±75 marks · 90 min</button>
        </div>
        <p class="site-foot__fine">The timer is a guide — it keeps running quietly and warns you at 15 minutes left. Leaving the page won't lose your paper.</p>
      </div>`, "p" + p);
    $("#discard")?.addEventListener("click", () => { delete state.examSession; save(); examSetupView(p); });
    view.querySelectorAll("[data-len]").forEach(b => b.addEventListener("click", async () => {
      const scale = b.dataset.len === "half" ? 0.5 : 1;
      const ts = await getPaperTopics(p);
      const picked = buildExam(ts, info.blueprint, scale);
      state.examSession = {
        paper: p, started: Date.now(),
        duration: (scale === 1 ? 180 : 90) * 60,
        qids: picked.map(x => x.q.id),
        topicOf: Object.fromEntries(picked.map(x => [x.q.id, x.topic])),
        marks: {}, phase: "write",
      };
      save();
      location.hash = `#/exam/${p}/run`;
    }));
  }

  let timerInt;
  async function examRunView(p) {
    const sess = state.examSession;
    if (!sess || sess.paper !== p) return examSetupView(p);
    const ts = await getPaperTopics(p);
    const all = ts.flatMap(t => t.questions);
    const qs = sess.qids.map(id => all.find(q => q.id === id)).filter(Boolean);
    const totalMarks = qs.reduce((s, q) => s + qMarks(q), 0);
    const marking = sess.phase === "mark";

    setView(`
      <div class="exam-timer">
        <span>${marking ? "MARKING" : "PAPER " + p} · ${totalMarks} marks</span>
        <span class="time" id="clock">--:--</span>
        ${marking ? `<button id="finish-marking">Finish marking</button>` : `<button id="finish-exam">Finish &amp; mark</button>`}
      </div>
      <div class="qnav" id="qnav">${qs.map((q, i) => `<button data-i="${i}">${i + 1}</button>`).join("")}</div>
      <div id="exam-qs">${qs.map((q, i) => questionHTML(q, i + 1, { marking })).join("")}</div>
      <div class="tally"><span>${marking ? "Marked so far" : "Answer on paper — memos open after you finish"}</span>
      <span class="score" id="exam-score">${marking ? "0 / " + totalMarks : ""}</span></div>`, "p" + p);

    // during writing phase, hide memo buttons entirely
    if (!marking) {
      view.querySelectorAll(".toggle-memo").forEach(b => { b.style.display = "none"; });
    } else {
      view.querySelectorAll(".memo").forEach(m => { m.hidden = false; });
      view.querySelectorAll(".toggle-memo").forEach(b => { b.style.display = "none"; });
      renderMath(view);
      // restore chips
      view.querySelectorAll(".question").forEach(card => {
        card.querySelectorAll(".part").forEach(partEl => {
          const k = card.dataset.qid + ":" + partEl.dataset.part;
          if (sess.marks[k] != null) {
            const chip = partEl.querySelector(`.markchip[data-m="${sess.marks[k]}"]`);
            chip?.classList.add("sel");
          }
        });
      });
      updateExamScore();
    }

    $("#qnav").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      view.querySelectorAll("#exam-qs .question")[+b.dataset.i]
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function updateExamScore() {
      const earned = Object.values(sess.marks).reduce((a, b) => a + b, 0);
      const el = $("#exam-score");
      if (el) el.textContent = `${earned} / ${totalMarks}`;
      // qnav done states
      qs.forEach((q, i) => {
        const done = q.parts.every((_, pi) => sess.marks[q.id + ":" + pi] != null);
        $("#qnav").children[i].classList.toggle("done", done);
      });
    }

    wireQuestions(view, (qid, part, m) => {
      sess.marks[qid + ":" + part] = m;
      save();
      updateExamScore();
    });

    // timer
    clearInterval(timerInt);
    const clock = $("#clock");
    function tick() {
      const left = Math.max(0, sess.started + sess.duration * 1000 - Date.now());
      const mm = Math.floor(left / 60000), ss = Math.floor(left % 60000 / 1000);
      clock.textContent = `${String(Math.floor(mm / 60))}:${String(mm % 60).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
      clock.classList.toggle("low", left < 15 * 60 * 1000 && left > 0);
      if (left === 0 && sess.phase === "write") { clock.textContent = "TIME"; }
    }
    if (!marking) { tick(); timerInt = setInterval(tick, 1000); } else { clock.textContent = "—"; }

    $("#finish-exam")?.addEventListener("click", () => {
      sess.phase = "mark"; save(); clearInterval(timerInt);
      examRunView(p);
      toast("Memos unsealed — award your marks honestly.");
    });
    $("#finish-marking")?.addEventListener("click", () => {
      const earned = Object.values(sess.marks).reduce((a, b) => a + b, 0);
      const perTopic = {};
      qs.forEach(q => {
        const tId = sess.topicOf[q.id];
        perTopic[tId] = perTopic[tId] || { earned: 0, total: 0 };
        perTopic[tId].total += qMarks(q);
        q.parts.forEach((_, pi) => { perTopic[tId].earned += sess.marks[q.id + ":" + pi] || 0; });
        // also feed practice records
        const qEarned = q.parts.reduce((s, _, pi) => s + (sess.marks[q.id + ":" + pi] || 0), 0);
        state.attempts[q.id] = { earned: qEarned, total: qMarks(q), ts: Date.now() };
      });
      state.exams.push({ paper: p, date: Date.now(), earned, total: totalMarks, perTopic });
      delete state.examSession;
      bumpStreak(); save();
      location.hash = "#/results/" + (state.exams.length - 1);
    });
  }

  async function resultsView(idx) {
    const ex = state.exams[+idx];
    if (!ex) return homeView();
    const pct = Math.round(100 * ex.earned / ex.total);
    const lvl = nscLevel(pct);
    const m = await getManifest();
    const rows = Object.entries(ex.perTopic).map(([tid, r]) => {
      const tpct = Math.round(100 * r.earned / r.total);
      return `<div style="margin:.7rem 0">
        <div style="display:flex;justify-content:space-between;font-size:.9rem">
          <span>${esc(topics[tid]?.title || tid)}</span>
          <span class="pct" style="font-family:var(--mono)">${r.earned}/${r.total}</span></div>
        <div class="bar" style="--bar-col:${paperCol(ex.paper)}"><span style="width:${tpct}%"></span></div>
      </div>`;
    }).join("");
    setView(`
      <p class="exam-rule">Result — ${m.papers[ex.paper].title} mock · ${new Date(ex.date).toLocaleDateString()}</p>
      <h1 class="display">${ex.earned}/${ex.total} — <em>${pct}%</em></h1>
      <p class="lede">That's an NSC <strong>Level ${lvl}</strong>${pct >= 50 ? " — solid. Now attack the weakest bar below." : " — the bars below show exactly where the marks leaked."}</p>
      <div class="card">${rows}</div>
      <div class="btnrow">
        <a class="btn btn--red" href="#/exam/${ex.paper}">Another mock</a>
        <a class="btn btn--quiet" href="#/progress">All results</a>
      </div>`, "progress");
  }

  async function progressView() {
    const m = await getManifest();
    const sections = await Promise.all(Object.entries(m.papers).map(async ([p, info]) => {
      const ts = await getPaperTopics(p);
      const rows = ts.map(t => {
        const { pct, tried, coverage } = topicMastery(t);
        return `<div style="margin:.7rem 0">
          <div style="display:flex;justify-content:space-between;font-size:.9rem">
            <span>${esc(t.title)}</span>
            <span style="font-family:var(--mono)">${tried ? pct + "% · " + coverage + "% covered" : "not started"}</span></div>
          <div class="bar" style="--bar-col:${paperCol(p)}"><span style="width:${tried ? pct : 0}%"></span></div>
        </div>`;
      }).join("");
      return `<p class="exam-rule">${info.title}</p><div class="card">${rows}</div>`;
    }));
    const tried = Object.keys(state.attempts).length;
    const earned = Object.values(state.attempts).reduce((s, a) => s + a.earned, 0);
    const total = Object.values(state.attempts).reduce((s, a) => s + a.total, 0);
    const exams = state.exams.map((e, i) => `
      <tr><td>${new Date(e.date).toLocaleDateString()}</td><td>P${e.paper}</td>
      <td>${e.earned}/${e.total}</td><td class="pct">${Math.round(100 * e.earned / e.total)}%</td>
      <td><a href="#/results/${i}">view</a></td></tr>`).reverse().join("");
    setView(`
      <p class="exam-rule">Your marking record</p>
      <h1 class="display">Progress</h1>
      <div class="stat-strip">
        <div class="stat"><span class="n">${tried}</span><span class="l">questions marked</span></div>
        <div class="stat"><span class="n">${total ? Math.round(100 * earned / total) + "%" : "–"}</span><span class="l">overall accuracy</span></div>
        <div class="stat"><span class="n">${state.streak.days || 0}</span><span class="l">day streak</span></div>
        <div class="stat"><span class="n">${state.exams.length}</span><span class="l">mocks written</span></div>
      </div>
      ${sections.join("")}
      <p class="exam-rule">Mock exams</p>
      <div class="card">${exams ? `<table class="exam-log"><thead><tr><th>Date</th><th>Paper</th><th>Marks</th><th>%</th><th></th></tr></thead><tbody>${exams}</tbody></table>` : `<p class="empty">No mocks written yet — <a href="#/exam/1">sit one now</a>.</p>`}</div>
      <div class="btnrow"><button class="btn btn--quiet" id="reset-all">Reset all progress</button></div>`, "progress");
    $("#reset-all").addEventListener("click", () => {
      if (confirm("Delete all saved progress on this device? This can't be undone.")) {
        localStorage.removeItem(KEY); location.reload();
      }
    });
  }

  function formulasView() {
    const F = (title, items) => `
      <p class="exam-rule">${title}</p>
      <div class="card formula-block">${items.map(i => `<p>${i}</p>`).join("")}</div>`;
    setView(`
      <p class="exam-rule">Information sheet</p>
      <h1 class="display">Formula sheet</h1>
      <p class="lede">The standard formulae you get in the exam — learn what each one is <em>for</em>, not just its shape.</p>
      ${F("Algebra", [
        "$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$ — roots of $ax^2+bx+c=0$",
        "$\\Delta=b^2-4ac$ — nature of roots: $\\Delta<0$ non-real; $\\Delta=0$ equal; $\\Delta>0$ real, and rational iff $\\Delta$ is a perfect square",
      ])}
      ${F("Sequences & series", [
        "$T_n=a+(n-1)d$ and $S_n=\\frac{n}{2}[2a+(n-1)d]$ — arithmetic",
        "$T_n=ar^{n-1}$ and $S_n=\\frac{a(r^n-1)}{r-1}$ — geometric",
        "$S_\\infty=\\frac{a}{1-r}$ for $-1<r<1$",
      ])}
      ${F("Finance", [
        "$A=P(1+i)^n$ growth · $A=P(1-i)^n$ decay (reducing balance)",
        "$F=\\frac{x[(1+i)^n-1]}{i}$ — future value of an annuity",
        "$P=\\frac{x[1-(1+i)^{-n}]}{i}$ — present value (loans)",
        "$1+i_{eff}=(1+\\frac{i_{nom}}{m})^m$ — nominal vs effective",
      ])}
      ${F("Calculus", [
        "$f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}$ — first principles",
        "$\\frac{d}{dx}[ax^n]=anx^{n-1}$ — rewrite surds and fractions as powers first",
      ])}
      ${F("Analytical geometry", [
        "$d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$ · midpoint $(\\frac{x_1+x_2}{2};\\frac{y_1+y_2}{2})$",
        "$m=\\frac{y_2-y_1}{x_2-x_1}$ · $\\tan\\theta=m$ · parallel: $m_1=m_2$ · perpendicular: $m_1m_2=-1$",
        "$(x-a)^2+(y-b)^2=r^2$ — circle centre $(a;b)$; tangent $\\perp$ radius at the point of contact",
      ])}
      ${F("Trigonometry", [
        "$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}$ (sine rule) · $a^2=b^2+c^2-2bc\\cos A$ (cosine rule) · Area $=\\frac{1}{2}ab\\sin C$",
        "$\\sin(\\alpha\\pm\\beta)=\\sin\\alpha\\cos\\beta\\pm\\cos\\alpha\\sin\\beta$ · $\\cos(\\alpha\\pm\\beta)=\\cos\\alpha\\cos\\beta\\mp\\sin\\alpha\\sin\\beta$",
        "$\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha$ · $\\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha=1-2\\sin^2\\alpha=2\\cos^2\\alpha-1$",
      ])}
      ${F("Statistics", [
        "$\\bar{x}=\\frac{\\sum x}{n}$ · $\\sigma^2=\\frac{\\sum(x_i-\\bar{x})^2}{n}$",
        "$\\hat{y}=a+bx$ with $b=\\frac{\\sum(x-\\bar{x})(y-\\bar{y})}{\\sum(x-\\bar{x})^2}$ and $a=\\bar{y}-b\\bar{x}$",
      ])}
      ${F("Probability", [
        "$P(A\\text{ or }B)=P(A)+P(B)-P(A\\text{ and }B)$",
        "Independent: $P(A\\text{ and }B)=P(A)\\times P(B)$ · Mutually exclusive: $P(A\\text{ and }B)=0$",
      ])}`, "formulas");
  }

  function aboutView() {
    setView(`
      <p class="exam-rule">About</p>
      <h1 class="display">About &amp; privacy</h1>
      <div class="card">
        <p><strong>Matric Maths</strong> is a free practice tool for the South African NSC Grade 12 Mathematics exams (Paper 1 and Paper 2). Every question is original, written in the style and mark-allocation of the real papers and aligned to the CAPS curriculum. They are not official past papers — for those, use the
        <a href="https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx" rel="noopener" target="_blank">Department of Basic Education's past-paper library</a>.</p>
        <p><strong>Privacy:</strong> there are no accounts and no tracking of who you are. Your marks, streak, and exam history are stored only in this browser on this device (localStorage). "Reset all progress" on the Progress page deletes everything.</p>
        <p><strong>Offline:</strong> after your first visit the app works without data — install it from your browser menu ("Add to Home screen") and practise anywhere.</p>
        <p><strong>Found a mistake in a memo?</strong> Mathematics memos are checked, but if something looks wrong, trust your teacher — and treat the disagreement as revision gold: proving the memo wrong is the deepest kind of practice.</p>
      </div>`, null);
  }

  /* ── router ────────────────────────────────────────────── */
  function route() {
    clearInterval(timerInt);
    const h = location.hash.replace(/^#\/?/, "");
    const [a, b, c] = h.split("/");
    if (a === "paper" && b) return paperView(b);
    if (a === "topic" && b) return topicView(b);
    if (a === "exam" && b && c === "run") return examRunView(b);
    if (a === "exam" && b) return examSetupView(b);
    if (a === "results" && b != null) return resultsView(b);
    if (a === "progress") return progressView();
    if (a === "formulas") return formulasView();
    if (a === "about") return aboutView();
    return homeView();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", () => {
    route();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  });
})();
