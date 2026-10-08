// Render every $...$ segment in data/*.json and data/af/*.json with KaTeX in
// strict mode, so a broken formula fails here instead of on a learner's screen.
//   KATEX=<path to katex package> node tools/katex_check.js
const fs = require("fs");
const path = require("path");
const katex = require(process.env.KATEX || "katex");

const root = path.join(__dirname, "..", "data");
const files = [
  ...fs.readdirSync(root).filter(f => f.endsWith(".json")).map(f => path.join(root, f)),
  ...fs.readdirSync(path.join(root, "af")).filter(f => f.endsWith(".json")).map(f => path.join(root, "af", f)),
];

let bad = 0, n = 0;
function visit(x, where) {
  if (typeof x === "string") {
    if (where.endsWith(".svg")) return;
    for (const m of x.matchAll(/\$([^$]*)\$/g)) {
      n++;
      try {
        katex.renderToString(m[1], { throwOnError: true, strict: "error" });
      } catch (e) {
        bad++;
        console.log(`FAIL ${where}: ${e.message.split("\n")[0]}  in  $${m[1]}$`);
      }
    }
  } else if (Array.isArray(x)) x.forEach((v, i) => visit(v, `${where}[${i}]`));
  else if (x && typeof x === "object") for (const k in x) visit(x[k], `${where}.${k}`);
}
for (const f of files) visit(JSON.parse(fs.readFileSync(f, "utf8")), path.relative(root, f));
console.log(`${n} formulas rendered, ${bad} failed`);
process.exit(bad ? 1 : 0);
