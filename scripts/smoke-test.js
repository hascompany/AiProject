// Headless smoke test for index.html (no browser, no dependencies).
//   node scripts/smoke-test.js [count]
// Runs the page's own <script> in Node with a tiny fake DOM/localStorage,
// generates `count` IDs (default 20000) for each gender filter and prints stats.
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = html.split("<script>")[1].split("</script>")[0];
const count = process.argv[2] || "20000";

const store = {};
global.localStorage = {
  getItem: k => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: k => { delete store[k]; },
};
const els = {};
global.document = {
  getElementById: id => els[id] ?? (els[id] = { textContent: "", innerHTML: "", disabled: false, value: count, style: {} }),
  querySelectorAll: () => [],
};

const pct = (n, d) => (n / d * 100).toFixed(1) + "%";

(async () => {
  eval(js + ";globalThis.T={generateBatch,setGender:g=>{genderFilter=g},get batch(){return currentBatch},isValidId,STORAGE_KEY}");
  let failed = 0;
  for (const g of ["all", "f", "m"]) {
    T.setGender(g);
    delete store[T.STORAGE_KEY];
    document.getElementById("count").value = count;
    const t0 = Date.now();
    await T.generateBatch();
    const b = T.batch, n = b.length;
    const ids = new Set(b.map(e => e.id));
    const invalid = b.filter(e => !T.isValidId(e.id)).length;
    const meanLen = b.reduce((a, e) => a + e.id.length, 0) / n;
    const withBio = b.filter(e => e.bio).length;
    const emojiRe = /\p{Extended_Pictographic}/u;
    const withEmoji = b.filter(e => emojiRe.test(e.bio) || emojiRe.test(e.label)).length;
    const roman = b.filter(e => /^[A-Z][a-z]+( [A-Z][a-z]+)?/.test(e.label)).length;
    const bad = [
      !(ids.size === n) && "duplicate ids",
      invalid && `${invalid} invalid ids`,
      g === "m" && b.some(e => /^(공주|소녀|요정|예쁜이)$/.test(e.label)) && "female-only word in male filter",
      g === "f" && b.some(e => e.label === "소년") && "male-only word in female filter",
    ].filter(Boolean);
    failed += bad.length;
    console.log(
      `[${g}] ${n} ids in ${Date.now() - t0}ms | mean length ${meanLen.toFixed(2)} | ` +
      `bio ${pct(withBio, n)} | emoji ${pct(withEmoji, n)} | romanized names ${pct(roman, n)} | ` +
      (bad.length ? "PROBLEMS: " + bad.join(", ") : "ok")
    );
  }
  process.exit(failed ? 1 : 0);
})();
