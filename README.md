# Matric Maths

Free practice app for the South African **NSC Grade 12 Mathematics** exams (Paper 1 & Paper 2).
Live: https://jaderiley.github.io/matric-maths/

- **Original, CAPS-aligned questions** in real NSC style (mark allocations, memo-style solutions, statement-reason geometry). Not past papers — the app links to the official DBE library for those.
- **Topic practice** — work a question on paper, open the memo, award yourself marks; progress per topic is tracked on-device (localStorage, no accounts).
- **Timed mocks** — a fresh ±150-mark paper assembled from the bank using the real paper's topic weighting, with a 3-hour timer, sealed memos until you finish, then a marking pass and an NSC-level result.
- **Formula sheet**, offline PWA (installable), dark mode.

## Stack

Vanilla HTML/CSS/JS + KaTeX (CDN, cached by the service worker). No build step. GitHub Pages serves `main` as-is.

## Content

Question banks live in `data/*.json`, one file per topic; `data/index.json` maps topics to papers and holds the mock-exam mark blueprint. Schema per question: `{id, difficulty 1-3, context, svg|null, parts:[{q, marks, solution[], answer}]}`. LaTeX is inline `$...$` with backslashes doubled in the JSON source.

To add questions: append to the topic file, keep marks realistic (≈1 per method step), verify every answer independently, then bump `VERSION` in `sw.js` so installed clients refresh.
