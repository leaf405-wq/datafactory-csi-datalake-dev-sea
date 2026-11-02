const BASES = [
  "http://127.0.0.1:3780",
  "http://localhost:3780",
];

function candidateBases(saved, extras) {
  const list = [];
  function add(url) {
    const next = String(url || "").trim().replace(/\/$/, "");
    if (next && list.indexOf(next) < 0) list.push(next);
  }
  add(saved);
  const extra = extras || BASES;
  for (let i = 0; i < extra.length; i += 1) add(extra[i]);
  return list;
}

module.exports = {
  bases: BASES,
  candidateBases,
};
