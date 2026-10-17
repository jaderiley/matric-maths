/* Matric Maths — app engine (vanilla JS, hash routing, localStorage) */
(() => {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const view = $("#view");

  /* ── state ─────────────────────────────────────────────── */
  const KEY = "mm2";
  localStorage.removeItem("mm1"); // pre-launch test data lived under the old key
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

  /* ── language ──────────────────────────────────────────────
     English and Afrikaans. ?lang=af or ?lang=en in the URL picks one and
     remembers it; otherwise the saved choice, otherwise the browser language.
     Afrikaans question banks live in data/af/ with the same shape as data/. */
  const LANG_KEY = "mm-lang";
  let lang = (() => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "af" || q === "en") { try { localStorage.setItem(LANG_KEY, q); } catch {} return q; }
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch {}
    if (saved === "af" || saved === "en") return saved;
    return (navigator.language || "").toLowerCase().startsWith("af") ? "af" : "en";
  })();
  const dataDir = () => (lang === "af" ? "data/af/" : "data/");
  const locale = () => (lang === "af" ? "af-ZA" : "en-ZA");

  const T = {
    en: {
      docTitle: "Matric Maths — NSC Paper 1 & 2 Practice",
      skip: "Skip to content",
      home: "Matric Maths home",
      nav: { p1: "Paper 1", p2: "Paper 2", map: "Exam map", papers: "Papers", progress: "Progress", formulas: "Formulas" },
      switchTo: "Afrikaans", switchLabel: "Skakel oor na Afrikaans",
      foot1: "<strong>Matric Maths</strong> — free NSC Grade 12 practice. All questions are original and CAPS-aligned; they are not past papers.",
      foot2: `For the real thing, download official papers from the <a href="https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx" rel="noopener" target="_blank">Department of Basic Education</a>.`,
      foot3: `No sign-up. Your progress is saved on this device only. <a href="#/about">About &amp; privacy</a>`,
      paper: (p) => `Paper ${p}`,
      question: (n) => `Question ${n}`,
      examPattern: "Exam pattern",
      difficulty: (d) => `Difficulty ${d}/3`,
      difficultyAria: (d) => `Difficulty ${d} of 3`,
      memo: "Memo",
      marksFor: (n) => `Marks you earned for ${n}`,
      yourMarks: "Your marks:",
      showMemo: "Show memo", hideMemo: "Hide memo",
      today: "TODAY",
      days: (n) => `<strong>${n}</strong> day${n === 1 ? "" : "s"}`,
      finals: "Final NSC exams — Fri 23 Oct &amp; Mon 26 Oct 2026",
      nscPractice: "National Senior Certificate — practice",
      heroTitle: "Practice like it's<br>the <em>real paper</em>.",
      heroLede: "Exam-style Grade 12 maths questions with full memo solutions. Work a topic, mark yourself like a marker would, or sit a timed mock. Free, offline, no sign-up.",
      topicsN: (n) => `${n} topics`, questionsN: (n) => `${n} questions`, banked: (n) => `${n} marks banked`,
      sitMock: "Sit a timed mock", examMap: "Exam map", pastPapers: "Past papers",
      myProgress: "My progress", streakSuffix: (s) => ` · ${s}-day streak`,
      paperRule: (t) => `Mathematics ${t} — 150 marks · 3 hours`,
      paperLede: (sub) => `${sub}. Tap a topic to practise, or sit a full timed mock assembled to the real paper's mark weighting.`,
      timedMock: (t) => `Timed mock ${t}`,
      topicRule: (p) => `Paper ${p} — topic practice`,
      topicLede: (b) => `${b}. Work each part on paper first, then open the memo and award yourself marks honestly — like a marker with a red pen.`,
      learnFirst: "Learn this topic first",
      topicRecord: "Topic record:",
      triedPct: (pct, n) => `${pct}% on ${n} tried`,
      nothingMarked: "nothing marked yet",
      saved: (e, t) => `Question saved: ${e}/${t}`,
      session: (n) => `this session: ${n}`,
      unfinished: (n, d) => `You have an unfinished mock (${n} questions, started ${d}).`,
      resume: "Resume it", discard: "Discard",
      packRule: "Printable pack",
      packTitle: (t) => `${t}: every way each question was asked`,
      packLede: "One mock paper in the real question order with every way each question was asked in the November papers 2016–2025, a tick-per-mark memo, and the official information sheet. Print it or work from the screen.",
      packExam: "Mock exam (PDF)", packMemo: "Memo (PDF)", packSheet: "Information sheet (PDF)",
      mockRule: (t) => `Mock examination — ${t}`,
      sit: (t) => `Sit ${t}`,
      mockLede: (t) => `A fresh paper is assembled from the question bank using the real ${t} mark weighting. Answer everything on paper — memos stay sealed until you finish. Then you mark yourself, and the app records it.`,
      full: "Full paper · ±150 marks · 3 h", half: "Half paper · ±75 marks · 90 min",
      timerNote: "The timer is a guide — it keeps running quietly and warns you at 15 minutes left. Leaving the page won't lose your paper.",
      marking: "MARKING", paperCaps: (p) => `PAPER ${p}`, marks: (n) => `${n} marks`,
      finishMarking: "Finish marking", finishExam: "Finish &amp; mark",
      markedSoFar: "Marked so far", answerOnPaper: "Answer on paper — memos open after you finish",
      fifteen: "15 minutes left — wrap up your working.", time: "TIME",
      unsealed: "Memos unsealed — award your marks honestly.",
      resultRule: (t, d) => `Result — ${t} mock · ${d}`,
      level: (l, pass) => `That's an NSC <strong>Level ${l}</strong>${pass ? " — solid. Now attack the weakest bar below." : " — the bars below show exactly where the marks leaked."}`,
      anotherMock: "Another mock", allResults: "All results",
      recordRule: "Your marking record", progress: "Progress",
      covered: (pct, c) => `${pct}% · ${c}% covered`, notStarted: "not started",
      statMarked: "questions marked", statAccuracy: "overall accuracy", statStreak: "day streak", statMocks: "mocks written",
      mockExams: "Mock exams",
      th: ["Date", "Paper", "Marks", "%"], pShort: (p) => `P${p}`, viewLink: "view",
      noMocks: `No mocks written yet — <a href="#/exam/1">sit one now</a>.`,
      reset: "Reset all progress",
      resetConfirm: "Delete all saved progress on this device? This can't be undone.",
      infoSheet: "Information sheet", formulaSheet: "Formula sheet",
      formulaLede: "The standard formulae you get in the exam — learn what each one is <em>for</em>, not just its shape.",
      learn: "Learn", notesMissing: "Notes for this topic aren't loaded yet.", practiseTopic: "Practise the topic",
      learnRule: (p) => `Learn — Paper ${p}`, nowPractise: "Now practise it",
      mapMissing: "The exam map isn't loaded yet.",
      topicMarks: (t, n) => `${t} — ${n} marks`, archMarks: (m, f) => `${m} marks · ${f}`,
      practise: (t) => `Practise ${t}`,
      mapPaper: (p) => `Paper ${p} — how it's built`,
      mapRule: "Intelligence — what the DBE actually asks",
      mapTitle: "The exam, <em>mapped</em>.",
      mapLede: "Built from real recent NSC papers: the question shapes that come up year after year, what they're worth, and how they're phrased. If you can do everything on this page, you can do the paper.",
      papersMissing: "The paper index isn't loaded yet.",
      memoOf: (n) => `${n} memo`,
      realThing: "The real thing", officialPapers: "Official past papers",
      papersLede: "Every link below opens the official paper or memo straight from the national Department of Basic Education (the ZIPs are mirrors of the same papers). The winning routine: learn a topic here, practise it here, then sit the real paper under time — and mark yourself with the official memo.",
      about: "About", aboutTitle: "About &amp; privacy",
      aboutBody: `
        <p><strong>Matric Maths</strong> is a free practice tool for the South African NSC Grade 12 Mathematics exams (Paper 1 and Paper 2). Every question is original, written in the style and mark-allocation of the real papers and aligned to the CAPS curriculum. They are not official past papers — for those, use the
        <a href="https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx" rel="noopener" target="_blank">Department of Basic Education's past-paper library</a>.</p>
        <p><strong>Privacy:</strong> there are no accounts and no tracking of who you are. Your marks, streak, and exam history are stored only in this browser on this device (localStorage). "Reset all progress" on the Progress page deletes everything.</p>
        <p><strong>Offline:</strong> after your first visit the app works without data — install it from your browser menu ("Add to Home screen") and practise anywhere.</p>
        <p><strong>Language:</strong> the whole app is also available in Afrikaans — use the language button at the top.</p>
        <p><strong>Found a mistake in a memo?</strong> Mathematics memos are checked, but if something looks wrong, trust your teacher — and treat the disagreement as revision gold: proving the memo wrong is the deepest kind of practice.</p>`,
      F: {
        algebra: "Algebra", sequences: "Sequences &amp; series", finance: "Finance", calculus: "Calculus",
        analytical: "Analytical geometry", trig: "Trigonometry", stats: "Statistics", prob: "Probability",
        items: {
          algebra: [
            "$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$ — roots of $ax^2+bx+c=0$",
            "$\\Delta=b^2-4ac$ — nature of roots: $\\Delta<0$ non-real; $\\Delta=0$ equal; $\\Delta>0$ real, and rational iff $\\Delta$ is a perfect square",
          ],
          sequences: [
            "$T_n=a+(n-1)d$ and $S_n=\\frac{n}{2}[2a+(n-1)d]$ — arithmetic",
            "$T_n=ar^{n-1}$ and $S_n=\\frac{a(r^n-1)}{r-1}$ — geometric",
            "$S_\\infty=\\frac{a}{1-r}$ for $-1<r<1$",
          ],
          finance: [
            "$A=P(1+i)^n$ growth · $A=P(1-i)^n$ decay (reducing balance)",
            "$F=\\frac{x[(1+i)^n-1]}{i}$ — future value of an annuity",
            "$P=\\frac{x[1-(1+i)^{-n}]}{i}$ — present value (loans)",
            "$1+i_{eff}=(1+\\frac{i_{nom}}{m})^m$ — nominal vs effective",
          ],
          calculus: [
            "$f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}$ — first principles",
            "$\\frac{d}{dx}[ax^n]=anx^{n-1}$ — rewrite surds and fractions as powers first",
          ],
          analytical: [
            "$d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$ · midpoint $(\\frac{x_1+x_2}{2};\\frac{y_1+y_2}{2})$",
            "$m=\\frac{y_2-y_1}{x_2-x_1}$ · $\\tan\\theta=m$ · parallel: $m_1=m_2$ · perpendicular: $m_1m_2=-1$",
            "$(x-a)^2+(y-b)^2=r^2$ — circle centre $(a;b)$; tangent $\\perp$ radius at the point of contact",
          ],
          trig: [
            "$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}$ (sine rule) · $a^2=b^2+c^2-2bc\\cos A$ (cosine rule) · Area $=\\frac{1}{2}ab\\sin C$",
            "$\\sin(\\alpha\\pm\\beta)=\\sin\\alpha\\cos\\beta\\pm\\cos\\alpha\\sin\\beta$ · $\\cos(\\alpha\\pm\\beta)=\\cos\\alpha\\cos\\beta\\mp\\sin\\alpha\\sin\\beta$",
            "$\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha$ · $\\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha=1-2\\sin^2\\alpha=2\\cos^2\\alpha-1$",
          ],
          stats: [
            "$\\bar{x}=\\frac{\\sum x}{n}$ · $\\sigma^2=\\frac{\\sum(x_i-\\bar{x})^2}{n}$",
            "$\\hat{y}=a+bx$ with $b=\\frac{\\sum(x-\\bar{x})(y-\\bar{y})}{\\sum(x-\\bar{x})^2}$ and $a=\\bar{y}-b\\bar{x}$",
          ],
          prob: [
            "$P(A\\text{ or }B)=P(A)+P(B)-P(A\\text{ and }B)$",
            "Independent: $P(A\\text{ and }B)=P(A)\\times P(B)$ · Mutually exclusive: $P(A\\text{ and }B)=0$",
          ],
        },
      },
    },

    af: {
      docTitle: "Matriek Wiskunde — NSS Vraestel 1 & 2 Oefening",
      skip: "Gaan na inhoud",
      home: "Matriek Wiskunde tuisblad",
      nav: { p1: "Vraestel 1", p2: "Vraestel 2", map: "Eksamenkaart", papers: "Vraestelle", progress: "Vordering", formulas: "Formules" },
      switchTo: "English", switchLabel: "Switch to English",
      foot1: "<strong>Matriek Wiskunde</strong> — gratis NSS Graad 12-oefening. Al die vrae is oorspronklik en in lyn met die KABV; dit is nie vorige vraestelle nie.",
      foot2: `Laai die amptelike vraestelle by die <a href="https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx" rel="noopener" target="_blank">Departement van Basiese Onderwys</a> af.`,
      foot3: `Geen registrasie nie. Jou vordering word net op hierdie toestel gestoor. <a href="#/about">Oor die toep &amp; privaatheid</a>`,
      paper: (p) => `Vraestel ${p}`,
      question: (n) => `Vraag ${n}`,
      examPattern: "Eksamenpatroon",
      difficulty: (d) => `Moeilikheidsgraad ${d}/3`,
      difficultyAria: (d) => `Moeilikheidsgraad ${d} uit 3`,
      memo: "Memo",
      marksFor: (n) => `Punte wat jy vir ${n} verdien het`,
      yourMarks: "Jou punte:",
      showMemo: "Wys memo", hideMemo: "Versteek memo",
      today: "VANDAG",
      days: (n) => `<strong>${n}</strong> ${n === 1 ? "dag" : "dae"}`,
      finals: "Finale NSS-eksamens — Vr. 23 Okt. &amp; Ma. 26 Okt. 2026",
      nscPractice: "Nasionale Senior Sertifikaat — oefening",
      heroTitle: "Oefen asof dit<br>die <em>regte vraestel</em> is.",
      heroLede: "Graad 12-wiskundevrae in eksamenstyl met volledige memo-oplossings. Werk deur 'n onderwerp, sien jouself na soos 'n nasiener sou, of skryf 'n getimede proefeksamen. Gratis, werk sonder internet, geen registrasie nie.",
      topicsN: (n) => `${n} onderwerpe`, questionsN: (n) => `${n} vrae`, banked: (n) => `${n} punte in die vraebank`,
      sitMock: "Skryf 'n getimede proefeksamen", examMap: "Eksamenkaart", pastPapers: "Vorige vraestelle",
      myProgress: "My vordering", streakSuffix: (s) => ` · ${s} dae aaneen`,
      paperRule: (t) => `Wiskunde ${t} — 150 punte · 3 uur`,
      paperLede: (sub) => `${sub}. Tik op 'n onderwerp om te oefen, of skryf 'n volledige getimede proefeksamen wat volgens die regte vraestel se puntetoekenning saamgestel is.`,
      timedMock: (t) => `Getimede proefeksamen: ${t}`,
      topicRule: (p) => `Vraestel ${p} — onderwerpoefening`,
      topicLede: (b) => `${b}. Werk elke deel eers op papier uit, maak dan die memo oop en gee jouself eerlik punte — soos 'n nasiener met 'n rooi pen.`,
      learnFirst: "Leer eers hierdie onderwerp",
      topicRecord: "Onderwerprekord:",
      triedPct: (pct, n) => `${pct}% oor ${n} vrae gedoen`,
      nothingMarked: "nog niks nagesien nie",
      saved: (e, t) => `Vraag gestoor: ${e}/${t}`,
      session: (n) => `hierdie sessie: ${n}`,
      unfinished: (n, d) => `Jy het 'n onvoltooide proefeksamen (${n} vrae, begin op ${d}).`,
      resume: "Gaan voort", discard: "Gooi weg",
      packRule: "Drukbare pakket",
      packTitle: (t) => `${t}: elke manier waarop elke vraag gevra is`,
      packLede: "Een proefvraestel in die regte vraagvolgorde met elke manier waarop elke vraag in die November-vraestelle van 2016–2025 gevra is, 'n memo met 'n regmerkie per punt, en die amptelike inligtingsblad. Druk dit of werk van die skerm af. (Die pakket is in Engels.)",
      packExam: "Proefvraestel (PDF)", packMemo: "Memo (PDF)", packSheet: "Inligtingsblad (PDF)",
      mockRule: (t) => `Proefeksamen — ${t}`,
      sit: (t) => `Skryf ${t}`,
      mockLede: (t) => `'n Nuwe vraestel word uit die vraebank saamgestel volgens die regte puntetoekenning van ${t}. Beantwoord alles op papier — die memo's bly verseël totdat jy klaar is. Dan sien jy jouself na, en jou punte word gestoor.`,
      full: "Volle vraestel · ±150 punte · 3 h", half: "Halwe vraestel · ±75 punte · 90 min",
      timerNote: "Die tydhouer is 'n riglyn — dit loop stil voort en waarsku jou wanneer daar nog 15 minute oor is. As jy die bladsy verlaat, verloor jy nie jou vraestel nie.",
      marking: "NASIEN", paperCaps: (p) => `VRAESTEL ${p}`, marks: (n) => `${n} punte`,
      finishMarking: "Klaar nagesien", finishExam: "Klaar — sien na",
      markedSoFar: "Tot dusver nagesien", answerOnPaper: "Antwoord op papier — die memo's gaan oop wanneer jy klaar is",
      fifteen: "Nog 15 minute — rond jou bewerkings af.", time: "TYD",
      unsealed: "Die memo's is oop — gee jouself eerlik punte.",
      resultRule: (t, d) => `Uitslag — proefeksamen ${t} · ${d}`,
      level: (l, pass) => `Dit is 'n NSS-<strong>vlak ${l}</strong>${pass ? " — goed so. Pak nou die swakste staaf hieronder aan." : " — die stawe hieronder wys presies waar die punte verlore gegaan het."}`,
      anotherMock: "Nog 'n proefeksamen", allResults: "Alle uitslae",
      recordRule: "Jou nasienrekord", progress: "Vordering",
      covered: (pct, c) => `${pct}% · ${c}% gedek`, notStarted: "nog nie begin nie",
      statMarked: "vrae nagesien", statAccuracy: "algehele akkuraatheid", statStreak: "dae aaneen", statMocks: "proefeksamens geskryf",
      mockExams: "Proefeksamens",
      th: ["Datum", "Vraestel", "Punte", "%"], pShort: (p) => `V${p}`, viewLink: "bekyk",
      noMocks: `Nog geen proefeksamens geskryf nie — <a href="#/exam/1">skryf nou een</a>.`,
      reset: "Vee alle vordering uit",
      resetConfirm: "Vee alle gestoorde vordering op hierdie toestel uit? Dit kan nie ongedaan gemaak word nie.",
      infoSheet: "Inligtingsblad", formulaSheet: "Formuleblad",
      formulaLede: "Die standaardformules wat jy in die eksamen kry — leer <em>waarvoor</em> elkeen gebruik word, nie net hoe dit lyk nie.",
      learn: "Leer", notesMissing: "Die notas vir hierdie onderwerp is nog nie gelaai nie.", practiseTopic: "Oefen die onderwerp",
      learnRule: (p) => `Leer — Vraestel ${p}`, nowPractise: "Oefen dit nou",
      mapMissing: "Die eksamenkaart is nog nie gelaai nie.",
      topicMarks: (t, n) => `${t} — ${n} punte`, archMarks: (m, f) => `${m} punte · ${f}`,
      practise: (t) => `Oefen ${t}`,
      mapPaper: (p) => `Vraestel ${p} — hoe dit saamgestel is`,
      mapRule: "Insig — wat die DBO werklik vra",
      mapTitle: "Die eksamen, <em>in kaart gebring</em>.",
      mapLede: "Saamgestel uit regte onlangse NSS-vraestelle: die soort vrae wat jaar na jaar voorkom, hoeveel punte hulle tel en hoe hulle gevra word. As jy alles op hierdie bladsy kan doen, kan jy die vraestel doen.",
      papersMissing: "Die vraestelindeks is nog nie gelaai nie.",
      memoOf: (n) => `${n} memo`,
      realThing: "Die regte ding", officialPapers: "Amptelike vorige vraestelle",
      papersLede: "Elke skakel hieronder maak die amptelike vraestel of memo direk van die nasionale Departement van Basiese Onderwys oop (die ZIP-lêers is spieëlkopieë van dieselfde vraestelle). Die wenroetine: leer 'n onderwerp hier, oefen dit hier, skryf dan die regte vraestel binne die eksamentyd — en sien jouself na met die amptelike memo.",
      about: "Oor", aboutTitle: "Oor die toep &amp; privaatheid",
      aboutBody: `
        <p><strong>Matriek Wiskunde</strong> is 'n gratis oefenhulpmiddel vir die Suid-Afrikaanse NSS Graad 12 Wiskunde-eksamens (Vraestel 1 en Vraestel 2). Elke vraag is oorspronklik, geskryf in die styl en puntetoekenning van die regte vraestelle en in lyn met die KABV-kurrikulum. Dit is nie amptelike vorige vraestelle nie — gebruik daarvoor die
        <a href="https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx" rel="noopener" target="_blank">Departement van Basiese Onderwys se biblioteek van vorige vraestelle</a>.</p>
        <p><strong>Privaatheid:</strong> daar is geen rekeninge nie en niemand hou dop wie jy is nie. Jou punte, aaneenlopende dae en eksamengeskiedenis word net in hierdie blaaier op hierdie toestel gestoor (localStorage). "Vee alle vordering uit" op die Vordering-bladsy vee alles uit.</p>
        <p><strong>Sonder internet:</strong> ná jou eerste besoek werk die toep sonder data — installeer dit vanuit jou blaaier se kieslys ("Voeg by tuisskerm") en oefen enige plek.</p>
        <p><strong>Taal:</strong> die hele toep is ook in Engels beskikbaar — gebruik die taalknoppie bo-aan.</p>
        <p><strong>'n Fout in 'n memo gevind?</strong> Die memo's is nagegaan, maar as iets verkeerd lyk, vertrou jou onderwyser — en beskou die meningsverskil as goud werd vir hersiening: om die memo verkeerd te bewys, is die diepste soort oefening.</p>`,
      F: {
        algebra: "Algebra", sequences: "Rye en reekse", finance: "Finansiële wiskunde", calculus: "Differensiaalrekening",
        analytical: "Analitiese meetkunde", trig: "Trigonometrie", stats: "Statistiek", prob: "Waarskynlikheid",
        items: {
          algebra: [
            "$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$ — wortels van $ax^2+bx+c=0$",
            "$\\Delta=b^2-4ac$ — aard van die wortels: $\\Delta<0$ nie-reëel; $\\Delta=0$ gelyk; $\\Delta>0$ reëel, en rasionaal as en slegs as $\\Delta$ 'n volkome vierkant is",
          ],
          sequences: [
            "$T_n=a+(n-1)d$ en $S_n=\\frac{n}{2}[2a+(n-1)d]$ — rekenkundig",
            "$T_n=ar^{n-1}$ en $S_n=\\frac{a(r^n-1)}{r-1}$ — meetkundig",
            "$S_\\infty=\\frac{a}{1-r}$ vir $-1<r<1$",
          ],
          finance: [
            "$A=P(1+i)^n$ groei · $A=P(1-i)^n$ waardevermindering (verminderdesaldo-metode)",
            "$F=\\frac{x[(1+i)^n-1]}{i}$ — toekomstige waarde van 'n annuïteit",
            "$P=\\frac{x[1-(1+i)^{-n}]}{i}$ — huidige waarde (lenings)",
            "$1+i_{eff}=(1+\\frac{i_{nom}}{m})^m$ — nominale teenoor effektiewe rente",
          ],
          calculus: [
            "$f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}$ — eerste beginsels",
            "$\\frac{d}{dx}[ax^n]=anx^{n-1}$ — skryf wortelvorme en breuke eers as magte",
          ],
          analytical: [
            "$d=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$ · middelpunt $(\\frac{x_1+x_2}{2};\\frac{y_1+y_2}{2})$",
            "$m=\\frac{y_2-y_1}{x_2-x_1}$ · $\\tan\\theta=m$ · ewewydig: $m_1=m_2$ · loodreg: $m_1m_2=-1$",
            "$(x-a)^2+(y-b)^2=r^2$ — sirkel met middelpunt $(a;b)$; raaklyn $\\perp$ radius by die raakpunt",
          ],
          trig: [
            "$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}$ (sinusreël) · $a^2=b^2+c^2-2bc\\cos A$ (cosinusreël) · Oppervlakte $=\\frac{1}{2}ab\\sin C$",
            "$\\sin(\\alpha\\pm\\beta)=\\sin\\alpha\\cos\\beta\\pm\\cos\\alpha\\sin\\beta$ · $\\cos(\\alpha\\pm\\beta)=\\cos\\alpha\\cos\\beta\\mp\\sin\\alpha\\sin\\beta$",
            "$\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha$ · $\\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha=1-2\\sin^2\\alpha=2\\cos^2\\alpha-1$",
          ],
          stats: [
            "$\\bar{x}=\\frac{\\sum x}{n}$ · $\\sigma^2=\\frac{\\sum(x_i-\\bar{x})^2}{n}$",
            "$\\hat{y}=a+bx$ met $b=\\frac{\\sum(x-\\bar{x})(y-\\bar{y})}{\\sum(x-\\bar{x})^2}$ en $a=\\bar{y}-b\\bar{x}$",
          ],
          prob: [
            "$P(A\\text{ of }B)=P(A)+P(B)-P(A\\text{ en }B)$",
            "Onafhanklik: $P(A\\text{ en }B)=P(A)\\times P(B)$ · Onderling uitsluitend: $P(A\\text{ en }B)=0$",
          ],
        },
      },
    },
  };
  const t = () => T[lang];

  /* the parts of the page outside #view: nav, footer, title, switch button */
  function applyChrome() {
    const L = t();
    document.documentElement.lang = lang === "af" ? "af" : "en";
    document.title = L.docTitle;
    $(".skip-link").textContent = L.skip;
    $(".wordmark").setAttribute("aria-label", L.home);
    $(".wordmark__text").innerHTML = lang === "af" ? "Matriek<br>Wiskunde" : "Matric<br>Maths";
    document.querySelectorAll(".site-nav a[data-nav]").forEach(a => { a.textContent = L.nav[a.dataset.nav]; });
    let btn = $("#lang-toggle");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "lang-toggle";
      btn.type = "button";
      btn.className = "lang-toggle";
      btn.addEventListener("click", () => setLang(lang === "af" ? "en" : "af"));
      $(".site-nav").appendChild(btn);
    }
    btn.textContent = L.switchTo;
    btn.setAttribute("aria-label", L.switchLabel);
    btn.lang = lang === "af" ? "en" : "af";
    const foot = document.querySelectorAll(".site-foot p");
    if (foot.length >= 3) { foot[0].innerHTML = L.foot1; foot[1].innerHTML = L.foot2; foot[2].innerHTML = L.foot3; }
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch {}
    manifest = null;
    for (const k in topics) delete topics[k];
    applyChrome();
    route();
  }

  /* ── data ──────────────────────────────────────────────── */
  let manifest = null;
  const topics = {};   // id -> topic data (in the current language)
  async function getManifest() {
    if (!manifest) {
      const r = await fetch(dataDir() + "index.json");
      if (!r.ok) throw new Error("manifest " + r.status);
      manifest = await r.json();
    }
    return manifest;
  }
  async function getTopic(id) {
    if (!topics[id]) {
      const r = await fetch(`${dataDir()}${id}.json`);
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
  async function getJSON(name) {
    const r = await fetch(dataDir() + name);
    return r.ok ? r.json() : null;
  }

  const qMarks = (q) => q.parts.reduce((s, p) => s + p.marks, 0);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const noStop = (s) => String(s).replace(/\.\s*$/, ""); // blurbs end in "." and get a sentence appended

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
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("show"), 2600);
  }
  const paperCol = (p) => p === "2" || p === 2 ? "var(--p2)" : "var(--p1)";
  const nscLevel = (pct) =>
    pct >= 80 ? 7 : pct >= 70 ? 6 : pct >= 60 ? 5 : pct >= 50 ? 4 : pct >= 40 ? 3 : pct >= 30 ? 2 : 1;

  /* question card body: parts, memo toggles, self-marking */
  function questionHTML(q, num, opts = {}) {
    const L = t();
    const dots = "●".repeat(q.difficulty) + "○".repeat(3 - q.difficulty);
    return `
    <article class="card question" data-qid="${q.id}">
      <div class="qhead">
        <span>${L.question(num)}</span>
        ${q.archetype ? `<span class="arch" title="${L.examPattern}">${esc(q.archetype)}</span>` : ""}
        <span class="diff" title="${L.difficulty(q.difficulty)}" aria-label="${L.difficultyAria(q.difficulty)}">${dots}</span>
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
              <p class="memo__title">${L.memo} — ${num}.${i + 1}</p>
              <ol>${p.solution.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
              <p class="answer">${esc(p.answer)}</p>
              ${opts.marking !== false ? `
              <div class="marker" role="group" aria-label="${L.marksFor(num + "." + (i + 1))}">
                <span class="marker__hint">${L.yourMarks}</span>
                ${Array.from({ length: p.marks + 1 }, (_, m) =>
                  `<button class="markchip" data-m="${m}">${m}</button>`).join("")}
              </div>` : ""}
            </div>
          </div>
        </div>`).join("")}
      <div class="btnrow">
        <button class="btn btn--red toggle-memo">${L.showMemo}</button>
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
        btn.textContent = show ? t().hideMemo : t().showMemo;
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
            const tk = document.createElement("span");
            tk.className = "tick";
            tk.textContent = m === max ? "✓" : m === 0 ? "✗" : "✓·";
            partEl.appendChild(tk);
            onMark(card.dataset.qid, +partEl.dataset.part, m, max);
          });
        });
      });
    });
  }

  /* ── views ─────────────────────────────────────────────── */

  /* 2026 final NSC timetable (CEM-approved, Feb 2026): Maths P1 Fri 23 Oct,
     P2 Mon 26 Oct, both 09:00. Hidden automatically once the dates pass. */
  function examCountdown() {
    const L = t();
    const papers = [[L.paper(1), new Date(2026, 9, 23)], [L.paper(2), new Date(2026, 9, 26)]];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const chips = papers.map(([name, d]) => {
      const days = Math.round((d - today) / 864e5);
      if (days < 0) return null;
      return `${name}: ${days === 0 ? `<strong>${L.today}</strong>` : L.days(days)}`;
    }).filter(Boolean);
    if (!chips.length) return "";
    return `<p class="exam-dates">${L.finals} · ${chips.join(" · ")}</p>`;
  }

  async function homeView() {
    const L = t();
    const m = await getManifest();
    const cards = await Promise.all(Object.entries(m.papers).map(async ([p, info]) => {
      const ts = await getPaperTopics(p);
      const nq = ts.reduce((s, tp) => s + tp.questions.length, 0);
      const marks = ts.reduce((s, tp) => s + tp.questions.reduce((a, q) => a + qMarks(q), 0), 0);
      return `
        <a class="card paper-card ${p === "2" ? "paper-card--2" : ""}" href="#/paper/${p}">
          <h2>${info.title}</h2>
          <span class="sub">${info.subtitle}</span>
          <div class="meta"><span>${L.topicsN(ts.length)}</span><span>${L.questionsN(nq)}</span><span>${L.banked(marks)}</span></div>
        </a>`;
    }));
    const s = state.streak.days;
    setView(`
      <p class="exam-rule">${L.nscPractice}</p>
      <h1 class="display">${L.heroTitle}</h1>
      <p class="lede">${L.heroLede}</p>
      ${examCountdown()}
      ${cards.join("")}
      <div class="btnrow">
        <a class="btn btn--red" href="#/exam/1">${L.sitMock}</a>
        <a class="btn" href="#/map">${L.examMap}</a>
        <a class="btn btn--quiet" href="#/papers">${L.pastPapers}</a>
        <a class="btn btn--quiet" href="#/progress">${L.myProgress}${s > 1 ? L.streakSuffix(s) : ""}</a>
      </div>`, null);
  }

  async function paperView(p) {
    const L = t();
    const m = await getManifest();
    const info = m.papers[p];
    if (!info) return homeView();
    const ts = await getPaperTopics(p);
    const rows = ts.map(tp => {
      const { pct, tried } = topicMastery(tp);
      return `
      <a class="card topic-row" href="#/topic/${tp.id}">
        <div class="ring" style="--pct:${pct};--ring-col:${paperCol(p)}"><span>${tried ? pct + "%" : "–"}</span></div>
        <div class="grow">
          <h3>${esc(tp.title)}</h3>
          <p class="blurb">${esc(noStop(tp.blurb))} · ${L.questionsN(tp.questions.length)}</p>
        </div>
      </a>`;
    });
    setView(`
      <p class="exam-rule">${L.paperRule(info.title)}</p>
      <h1 class="display">${info.title}</h1>
      <p class="lede">${L.paperLede(info.subtitle)}</p>
      <div class="btnrow"><a class="btn btn--red" href="#/exam/${p}">${L.timedMock(info.title)}</a></div>
      ${rows.join("")}`, "p" + p);
  }

  function topicMastery(tp) {
    let earned = 0, total = 0, tried = 0;
    tp.questions.forEach(q => {
      const a = state.attempts[q.id];
      if (a) { earned += a.earned; total += a.total; tried++; }
    });
    return { pct: total ? Math.round(100 * earned / total) : 0, tried, coverage: Math.round(100 * tried / tp.questions.length) };
  }

  async function topicView(id) {
    const L = t();
    let tp;
    try { tp = await getTopic(id); } catch { return homeView(); }
    const partsState = {}; // qid -> [marks per part]
    const html = tp.questions.map((q, i) => questionHTML(q, i + 1)).join("");
    const { pct, tried } = topicMastery(tp);
    setView(`
      <p class="exam-rule">${L.topicRule(tp.paper)}</p>
      <h1 class="display">${esc(tp.title)}</h1>
      <p class="lede">${L.topicLede(esc(noStop(tp.blurb)))}</p>
      <div class="btnrow"><a class="btn" href="#/learn/${tp.id}">${L.learnFirst}</a></div>
      ${html}
      <div class="tally"><span>${L.topicRecord} <span id="tally-note">${tried ? L.triedPct(pct, tried) : L.nothingMarked}</span></span>
      <span class="score" id="tally-score"></span></div>`, "p" + tp.paper);

    wireQuestions(view, (qid, part, m) => {
      const q = tp.questions.find(x => x.id === qid);
      partsState[qid] = partsState[qid] || Array(q.parts.length).fill(null);
      partsState[qid][part] = m;
      if (partsState[qid].every(v => v !== null)) {
        state.attempts[qid] = {
          earned: partsState[qid].reduce((a, b) => a + b, 0),
          total: qMarks(q), ts: Date.now(),
        };
        bumpStreak(); save();
        toast(L.saved(state.attempts[qid].earned, state.attempts[qid].total));
        const ms = topicMastery(tp);
        $("#tally-note").textContent = L.triedPct(ms.pct, ms.tried);
      }
      const sessEarned = Object.values(partsState).flat().reduce((a, b) => a + (b || 0), 0);
      $("#tally-score").textContent = L.session(sessEarned);
    });
  }

  /* ── exam mode ─────────────────────────────────────────── */

  function buildExam(paperTopics, blueprint, scale) {
    const picked = [];
    for (const tp of paperTopics) {
      const target = Math.round(blueprint[tp.id] * scale);
      const pool = [...tp.questions].sort(() => Math.random() - 0.5);
      let got = 0;
      for (const q of pool) {
        if (got >= target) break;
        // only take a question if it brings the topic total closer to target
        const qm = qMarks(q);
        if (Math.abs(got + qm - target) <= Math.abs(got - target)) {
          picked.push({ topic: tp.id, q });
          got += qm;
        }
      }
    }
    return picked;
  }

  async function examSetupView(p) {
    const L = t();
    const m = await getManifest();
    const info = m.papers[p];
    if (!info) return homeView();
    const sess = state.examSession;
    const resume = sess && sess.paper === p ? `
      <div class="card"><p>${L.unfinished(sess.qids.length, new Date(sess.started).toLocaleString(locale()))}</p>
      <div class="btnrow"><a class="btn btn--red" href="#/exam/${p}/run">${L.resume}</a>
      <button class="btn btn--quiet" id="discard">${L.discard}</button></div></div>` : "";
    const pack = `packs/p${p}`;
    setView(`
      <section class="card pack-card">
        <p class="exam-rule">${L.packRule}</p>
        <h2 class="pack-card__title">${L.packTitle(info.title)}</h2>
        <p class="site-foot__fine">${L.packLede}</p>
        <div class="btnrow">
          <a class="btn btn--red" href="${pack}-mock-exam.pdf" target="_blank" rel="noopener">${L.packExam}</a>
          <a class="btn" href="${pack}-mock-memo.pdf" target="_blank" rel="noopener">${L.packMemo}</a>
          <a class="btn btn--quiet" href="${pack}-information-sheet.pdf" target="_blank" rel="noopener">${L.packSheet}</a>
        </div>
      </section>
      <p class="exam-rule">${L.mockRule(info.title)}</p>
      <h1 class="display">${L.sit(info.title)}</h1>
      <p class="lede">${L.mockLede(info.title)}</p>
      ${resume}
      <div class="card">
        <div class="btnrow">
          <button class="btn btn--red" data-len="full">${L.full}</button>
          <button class="btn" data-len="half">${L.half}</button>
        </div>
        <p class="site-foot__fine">${L.timerNote}</p>
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
    const L = t();
    const sess = state.examSession;
    if (!sess || sess.paper !== p) return examSetupView(p);
    const ts = await getPaperTopics(p);
    const all = ts.flatMap(tp => tp.questions);
    const qs = sess.qids.map(id => all.find(q => q.id === id)).filter(Boolean);
    const totalMarks = qs.reduce((s, q) => s + qMarks(q), 0);
    const marking = sess.phase === "mark";

    setView(`
      <div class="exam-timer">
        <span>${marking ? L.marking : L.paperCaps(p)} · ${L.marks(totalMarks)}</span>
        <span class="time" id="clock">--:--</span>
        ${marking ? `<button id="finish-marking">${L.finishMarking}</button>` : `<button id="finish-exam">${L.finishExam}</button>`}
      </div>
      <div class="qnav" id="qnav">${qs.map((q, i) => `<button data-i="${i}">${i + 1}</button>`).join("")}</div>
      <div id="exam-qs">${qs.map((q, i) => questionHTML(q, i + 1, { marking })).join("")}</div>
      <div class="tally"><span>${marking ? L.markedSoFar : L.answerOnPaper}</span>
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
      if (left < 15 * 60 * 1000 && left > 0 && !sess.warned) {
        sess.warned = true; save();
        toast(t().fifteen);
      }
      if (left === 0 && sess.phase === "write") { clock.textContent = t().time; }
    }
    if (!marking) { tick(); timerInt = setInterval(tick, 1000); } else { clock.textContent = "—"; }

    $("#finish-exam")?.addEventListener("click", () => {
      sess.phase = "mark"; save(); clearInterval(timerInt);
      examRunView(p);
      toast(L.unsealed);
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
    const L = t();
    const ex = state.exams[+idx];
    if (!ex) return homeView();
    const pct = Math.round(100 * ex.earned / ex.total);
    const lvl = nscLevel(pct);
    const m = await getManifest();
    await Promise.allSettled(Object.keys(ex.perTopic).map(getTopic)); // titles in the current language
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
      <p class="exam-rule">${L.resultRule(m.papers[ex.paper].title, new Date(ex.date).toLocaleDateString(locale()))}</p>
      <h1 class="display">${ex.earned}/${ex.total} — <em>${pct}%</em></h1>
      <p class="lede">${L.level(lvl, pct >= 50)}</p>
      <div class="card">${rows}</div>
      <div class="btnrow">
        <a class="btn btn--red" href="#/exam/${ex.paper}">${L.anotherMock}</a>
        <a class="btn btn--quiet" href="#/progress">${L.allResults}</a>
      </div>`, "progress");
  }

  async function progressView() {
    const L = t();
    const m = await getManifest();
    const sections = await Promise.all(Object.entries(m.papers).map(async ([p, info]) => {
      const ts = await getPaperTopics(p);
      const rows = ts.map(tp => {
        const { pct, tried, coverage } = topicMastery(tp);
        return `<div style="margin:.7rem 0">
          <div style="display:flex;justify-content:space-between;font-size:.9rem">
            <span>${esc(tp.title)}</span>
            <span style="font-family:var(--mono)">${tried ? L.covered(pct, coverage) : L.notStarted}</span></div>
          <div class="bar" style="--bar-col:${paperCol(p)}"><span style="width:${tried ? pct : 0}%"></span></div>
        </div>`;
      }).join("");
      return `<p class="exam-rule">${info.title}</p><div class="card">${rows}</div>`;
    }));
    const tried = Object.keys(state.attempts).length;
    const earned = Object.values(state.attempts).reduce((s, a) => s + a.earned, 0);
    const total = Object.values(state.attempts).reduce((s, a) => s + a.total, 0);
    const exams = state.exams.map((e, i) => `
      <tr><td>${new Date(e.date).toLocaleDateString(locale())}</td><td>${L.pShort(e.paper)}</td>
      <td>${e.earned}/${e.total}</td><td class="pct">${Math.round(100 * e.earned / e.total)}%</td>
      <td><a href="#/results/${i}">${L.viewLink}</a></td></tr>`).reverse().join("");
    setView(`
      <p class="exam-rule">${L.recordRule}</p>
      <h1 class="display">${L.progress}</h1>
      <div class="stat-strip">
        <div class="stat"><span class="n">${tried}</span><span class="l">${L.statMarked}</span></div>
        <div class="stat"><span class="n">${total ? Math.round(100 * earned / total) + "%" : "–"}</span><span class="l">${L.statAccuracy}</span></div>
        <div class="stat"><span class="n">${state.streak.days || 0}</span><span class="l">${L.statStreak}</span></div>
        <div class="stat"><span class="n">${state.exams.length}</span><span class="l">${L.statMocks}</span></div>
      </div>
      ${sections.join("")}
      <p class="exam-rule">${L.mockExams}</p>
      <div class="card">${exams ? `<table class="exam-log"><thead><tr>${L.th.map(h => `<th>${h}</th>`).join("")}<th></th></tr></thead><tbody>${exams}</tbody></table>` : `<p class="empty">${L.noMocks}</p>`}</div>
      <div class="btnrow"><button class="btn btn--quiet" id="reset-all">${L.reset}</button></div>`, "progress");
    $("#reset-all").addEventListener("click", () => {
      if (confirm(L.resetConfirm)) {
        localStorage.removeItem(KEY); location.reload();
      }
    });
  }

  function formulasView() {
    const L = t();
    const F = (key) => `
      <p class="exam-rule">${L.F[key]}</p>
      <div class="card formula-block">${L.F.items[key].map(i => `<p>${esc(i)}</p>`).join("")}</div>`;
    setView(`
      <p class="exam-rule">${L.infoSheet}</p>
      <h1 class="display">${L.formulaSheet}</h1>
      <p class="lede">${L.formulaLede}</p>
      ${["algebra", "sequences", "finance", "calculus", "analytical", "trig", "stats", "prob"].map(F).join("")}`, "formulas");
  }

  /* ── learn / exam map / past papers ────────────────────── */

  async function learnView(id) {
    const L = t();
    let notes = null, tp = null;
    try { tp = await getTopic(id); } catch {}
    try { notes = (await getJSON("notes.json"))?.[id] || null; } catch {}
    if (!notes) {
      setView(`
        <p class="exam-rule">${L.learn}</p>
        <h1 class="display">${esc(tp ? tp.title : id)}</h1>
        <p class="empty">${L.notesMissing}</p>
        <div class="btnrow"><a class="btn btn--red" href="#/topic/${id}">${L.practiseTopic}</a></div>`, tp ? "p" + tp.paper : null);
      return;
    }
    const secs = notes.sections.map(s => `
      <p class="exam-rule">${esc(s.h)}</p>
      <div class="card learn-card"><ul>${s.points.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("");
    setView(`
      <p class="exam-rule">${L.learnRule(tp ? tp.paper : "")}</p>
      <h1 class="display">${esc(notes.title)}</h1>
      ${secs}
      <div class="btnrow"><a class="btn btn--red" href="#/topic/${id}">${L.nowPractise}</a></div>`, tp ? "p" + tp.paper : null);
  }

  async function mapView() {
    const L = t();
    const maps = [];
    for (const p of ["1", "2"]) {
      try {
        const mp = await getJSON(`map-${p}.json`);
        if (mp) maps.push(mp);
      } catch {}
    }
    if (!maps.length) {
      setView(`<p class="exam-rule">${L.examMap}</p><h1 class="display">${L.examMap}</h1>
        <p class="empty">${L.mapMissing}</p>`, "map");
      return;
    }
    const m = await getManifest();
    // preload topic titles for headers
    await Promise.allSettled([...m.papers["1"].topics, ...m.papers["2"].topics].map(getTopic));
    const sections = maps.map(map => {
      const byTopic = {};
      map.archetypes.forEach(a => (byTopic[a.topic] = byTopic[a.topic] || []).push(a));
      const topicBlocks = m.papers[map.paper].topics.map(tid => {
        const list = byTopic[tid] || [];
        if (!list.length) return "";
        const title = topics[tid]?.title || tid;
        return `
        <p class="exam-rule">${L.topicMarks(esc(title), m.papers[map.paper].blueprint[tid])}</p>
        ${list.map(a => `
          <div class="card arch-card">
            <div class="arch-card__head">
              <strong>${esc(a.name)}</strong>
              <span class="arch-card__meta">${L.archMarks(esc(a.typical_marks), esc(a.frequency))}</span>
            </div>
            <p class="arch-card__how">${esc(a.how_asked)}</p>
            ${a.notes ? `<p class="arch-card__notes">${esc(a.notes)}</p>` : ""}
            <a class="btn btn--quiet" href="#/topic/${a.topic}">${L.practise(esc(title))}</a>
          </div>`).join("")}`;
      }).join("");
      return `
        <h2 class="display" style="font-size:1.6rem;margin-top:2rem">${L.mapPaper(map.paper)}</h2>
        <div class="card"><ul>${(map.structure_notes || []).map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>
        ${topicBlocks}`;
    }).join("");
    setView(`
      <p class="exam-rule">${L.mapRule}</p>
      <h1 class="display">${L.mapTitle}</h1>
      <p class="lede">${L.mapLede}</p>
      ${sections}`, "map");
  }

  async function papersView() {
    const L = t();
    let data = null;
    try { data = await getJSON("papers.json"); } catch {}
    if (!data) {
      setView(`<p class="exam-rule">${L.pastPapers}</p><h1 class="display">${L.pastPapers}</h1>
        <p class="empty">${L.papersMissing}</p>`, "papers");
      return;
    }
    const years = data.years.map(y => `
      <p class="exam-rule">${y.year}</p>
      ${y.sessions.map(s => `
        <div class="card">
          <strong style="font-family:var(--mono);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em">${esc(s.session)}</strong>
          <div class="paper-links">
            ${s.items.map(it => `
              <span class="paper-links__row">
                <a class="btn btn--quiet" href="${it.url}" target="_blank" rel="noopener">${esc(it.name)}</a>
                ${it.memo ? `<a class="btn btn--quiet" href="${it.memo}" target="_blank" rel="noopener">${esc(L.memoOf(it.name))}</a>` : ""}
              </span>`).join("")}
          </div>
        </div>`).join("")}`).join("");
    setView(`
      <p class="exam-rule">${L.realThing}</p>
      <h1 class="display">${L.officialPapers}</h1>
      <p class="lede">${L.papersLede}</p>
      ${data.guidelines?.url ? `<div class="btnrow"><a class="btn" href="${data.guidelines.url}" target="_blank" rel="noopener">${esc(data.guidelines.name)}</a></div>` : ""}
      ${years}`, "papers");
  }

  function aboutView() {
    const L = t();
    setView(`
      <p class="exam-rule">${L.about}</p>
      <h1 class="display">${L.aboutTitle}</h1>
      <div class="card">${L.aboutBody}</div>`, null);
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
    if (a === "learn" && b) return learnView(b);
    if (a === "map") return mapView();
    if (a === "papers") return papersView();
    if (a === "about") return aboutView();
    return homeView();
  }
  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", () => {
    applyChrome();
    route();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  });
})();
