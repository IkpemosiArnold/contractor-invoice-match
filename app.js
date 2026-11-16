import { checkBatch, withPasted, parseCsv, summarize, ledgerEntries, ledgerCsv, gbp, colLetter } from "./check.js?v=4";
import { jobLogCsv, invoices as sampleInvoices, portfolio } from "./samples.js?v=4";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const icon = (name) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
};
const glyph = { pass: "check", fail: "cross", none: "none" };
const wide = window.matchMedia("(min-width: 960px)");
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const log = parseCsv(jobLogCsv);
let list = [...sampleInvoices];
let picks = {};
let approved = new Set();
let vatRecoverable = portfolio.vatRecoverable;
let results = [];
let open = null;

/** Text with the values the checks read underlined in place. */
function marked(text, marks) {
  const frag = document.createDocumentFragment();
  const ms = [...marks].sort((a, b) => a.start - b.start || b.end - a.end);
  let at = 0;
  for (const m of ms) {
    if (m.start < at) continue;
    frag.append(text.slice(at, m.start), el("span", `u ${m.kind || "pass"}`, text.slice(m.start, m.end)));
    at = m.end;
  }
  frag.append(text.slice(at));
  return frag;
}

function invoiceMarks(r) {
  const seen = new Map();
  for (const c of r.checks) {
    for (const m of c.marks) {
      const k = `${m.start}:${m.end}`;
      const prev = seen.get(k);
      if (!prev || m.kind === "fail") seen.set(k, m);
    }
  }
  return [...seen.values()];
}

/** The job's row in the log, laid out like the export, with the used cells outlined. */
function jobRow(r, cells) {
  const fig = el("figure", "grid-fig");
  const scroll = el("div", "grid-scroll");
  const t = el("table", "grid");
  const head = el("tr");
  head.append(el("th", "rn", ""));
  log.header.forEach((_, i) => head.append(el("th", "cl", colLetter(i))));
  const hdr = el("tr", "hdr");
  hdr.append(el("th", "rn", "1"));
  log.header.forEach((h) => hdr.append(el("td", null, h)));
  t.append(head, hdr);
  const rowsShown = r.job ? [r.job] : r.candidates;
  const hits = new Set(cells.map((c) => `${c.row}:${c.col}`));
  for (const row of rowsShown) {
    const tr = el("tr");
    tr.append(el("th", "rn", String(row._row)));
    log.header.forEach((h, i) => {
      const hit = hits.has(`${row._row}:${i}`);
      const td = el("td", hit ? "hit" : null);
      const v = row[h] === "" ? "(empty)" : row[h];
      if (hit) td.append(el("span", `u ${cells.find((c) => c.row === row._row && c.col === i)?.kind || "pass"}`, v));
      else td.append(v);
      tr.append(td);
    });
    t.append(tr);
  }
  scroll.append(t);
  const cap = r.job ? `Job log, row ${r.job._row}` : `Job log, rows ${rowsShown.map((x) => x._row).join(" and ")}: the candidates`;
  fig.append(scroll, el("figcaption", null, cap));
  return fig;
}

function cellsWithKind(r) {
  const out = [];
  for (const c of r.checks) for (const k of c.cells) out.push({ ...k, kind: k.kind || (c.state === "fail" ? "fail" : "pass") });
  // a failed reading of a cell wins over a passing one
  const m = new Map();
  for (const k of out) { const key = `${k.row}:${k.col}`; if (!m.has(key) || k.kind === "fail") m.set(key, k); }
  return [...m.values()];
}

function shortReason(r) {
  const h = r.holds[0];
  const { inv, job } = r;
  const s = {
    read: () => h.text,
    match: () => (r.candidates.length > 1 ? `No job ref, and ${r.candidates.length} jobs fit. A person picks.` : h.text.split(". ")[0] + "."),
    duplicate: () => (job.invoice_no ? `${job.job_id} already has ${job.invoice_no} posted.` : `${job.job_id} already has an invoice in this batch.`),
    completed: () => `Job is ${job.status}, not Completed.`,
    flat: () => (inv.flat ? `Invoice says ${inv.flat.value}; the job is ${job.flat}.` : "Flat not found on the invoice."),
    quote: () => {
      const over = (inv.netValue ?? 0) - Math.round(Number(job.quote_gbp) * 100);
      const hrs = inv.hours != null ? inv.hours - Number(job.quoted_hours) : 0;
      return [over > 0 && `${gbp(over)} over the quote`, hrs > 0 && `${hrs} hrs over`].filter(Boolean).join(", ") + ".";
    },
    sums: () => (inv.net && inv.chargesSum !== inv.net.value ? `Lines make ${gbp(inv.chargesSum)}; the net says ${gbp(inv.net.value)}.` : "The figures do not add up."),
    vat: () => (inv.vatNo ? "VAT rate needs a person." : "VAT charged, no VAT number."),
  }[h.id];
  const others = r.holds.filter((x) => x !== h && x.state === "fail").length;
  return s() + (others ? ` And ${others} more.` : "");
}

function title(r) {
  const c = r.inv.contractor?.value || "Unknown contractor";
  return `${c.replace(/\s+(Ltd|Limited)$/i, "")}, ${r.inv.number?.value || "no number"}`;
}

function where(r) {
  if (r.job) return `${r.job.job_id}, ${r.job.flat}, ${r.job.property}`;
  return [r.inv.flat?.value, r.inv.property?.value].filter(Boolean).join(", ") || "Address not found";
}

function ledgerBlock(r) {
  const box = el("div", "ledger");
  for (const e of ledgerEntries(r, log, { vatRecoverable })) {
    const p = el("p", "lg-row");
    const l = el("span");
    l.append(el("span", "lg-acc", e.account), el("span", "lg-sub", [e.property, e.ref, e.note].filter(Boolean).join(" · ")));
    const a = el("span", "lg-amt");
    a.append(e.debit ? `Dr ${gbp(e.debit)}` : `Cr ${gbp(e.credit)}`);
    const src = [e.fromLabel, ...e.cells.map((c) => c.ref)].filter(Boolean).join(", ");
    if (src) a.append(el("span", null, src));
    p.append(l, a);
    box.append(p);
  }
  return box;
}

function detail(r) {
  const box = el("div", "evidence");
  box.append(el("p", "side-h", `Received ${r.sample.received}`));
  box.append(el("p", `side-title st-${r.ready ? "pass" : "fail"}`, r.ready ? `Ready to post, ${gbp(r.inv.total.value)}` : "Held back"));

  if (!r.ready) {
    box.append(el("p", "ev-h", "Why it is held back"));
    const ul = el("ul", "reasons");
    for (const h of r.holds.filter((x) => x.state === "fail" || (x.state === "none" && !/^Not checked/.test(x.text)))) {
      const li = el("li");
      li.append(icon(h.state === "fail" ? "cross" : "none"), el("span", null, h.text));
      if (h.state === "none") li.querySelector("svg").style.color = "var(--none)";
      ul.append(li);
    }
    box.append(ul);
    if (r.candidates.length > 1) {
      const wrap = el("div", "picks");
      for (const c of r.candidates) {
        const b = el("button", "btn pick");
        b.type = "button";
        b.append(`This is ${c.job_id}`, el("small", null, `${c.flat}: ${c.issue}`));
        b.addEventListener("click", () => {
          picks = { ...picks, [r.id]: c.job_id };
          render({ fresh: true, focusId: r.id });
        });
        wrap.append(b);
      }
      box.append(wrap);
    }
  }
  if (r.picked) box.append(el("p", "picked", `Job picked by a person: ${r.job.job_id}.`));

  box.append(el("p", "ev-h", "The invoice"));
  const mail = el("div", "mail");
  const body = el("p", "mail-body");
  body.append(marked(r.inv.text, invoiceMarks(r)));
  mail.append(body);
  box.append(mail);

  if (r.job || r.candidates.length) {
    box.append(el("p", "ev-h", r.job ? "The job in the log" : "Jobs that fit"), jobRow(r, cellsWithKind(r)));
  }

  box.append(el("p", "ev-h", "Checks"));
  const ul = el("ul", "checks");
  for (const c of r.checks) {
    const li = el("li", `st-${c.state}`);
    const t = el("span", "ck-t");
    t.append(el("span", "ck-n", c.name), el("span", "ck-d", c.text + (c.cells.length ? ` (${c.cells.map((k) => k.ref).join(", ")})` : "")));
    li.append(icon(glyph[c.state]), t);
    ul.append(li);
  }
  box.append(ul);

  if (r.ready) {
    box.append(el("p", "ev-h", vatRecoverable ? "Would post, VAT apart" : "Would post, VAT as cost (residential block)"), ledgerBlock(r));
    const act = el("div", "actions");
    if (approved.has(r.id)) act.append(el("p", "ok-line st-pass", "Approved. Added to the export; nothing is posted from this page."));
    else {
      const btn = el("button", "btn primary", "Approve for posting");
      btn.type = "button";
      btn.addEventListener("click", () => {
        approved.add(r.id);
        btn.replaceWith(el("p", "ok-line st-pass", "Approved. Added to the export; nothing is posted from this page."));
        updateExport();
      });
      act.append(btn);
    }
    box.append(act);
  }
  return box;
}

function rowItem(key, cells, renderFn) {
  const li = el("div", "row-item");
  const btn = el("button", "row verdict");
  btn.type = "button";
  btn.setAttribute("aria-expanded", "false");
  btn.append(...cells);
  const chev = icon("chev");
  chev.classList.add("chev");
  btn.append(chev);
  const entry = { key, li, btn, render: renderFn };
  btn.addEventListener("click", () => toggle(entry));
  li.append(btn);
  li._entry = entry;
  return li;
}

function closeOpen() {
  if (!open) return;
  open.btn.setAttribute("aria-expanded", "false");
  open.li.querySelector(".evidence")?.remove();
  open = null;
  $("side").replaceChildren();
}

function show(entry, animate = true) {
  const box = entry.render();
  if (animate) box.classList.add("enter");
  entry.btn.setAttribute("aria-expanded", "true");
  if (wide.matches) $("side").replaceChildren(box);
  else entry.li.append(box);
  open = entry;
  for (const sc of box.querySelectorAll(".grid-scroll")) {
    const hit = sc.querySelector("td.hit:has(.u.fail)") || sc.querySelector("td.hit");
    if (hit) sc.scrollLeft = Math.max(0, hit.offsetLeft - 56);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("drawn")));
}

function toggle(entry) {
  const same = open && open.key === entry.key;
  closeOpen();
  if (!same) show(entry);
}

wide.addEventListener("change", () => {
  if (!open) return;
  const entry = open;
  closeOpen();
  show(entry, false);
});

function updateExport() {
  const n = results.filter((r) => r.ready && approved.has(r.id)).length;
  $("export").textContent = n ? `Download approved entries (${n})` : "Download approved entries";
}

function render({ fresh = false, focusId = null } = {}) {
  closeOpen();
  results = checkBatch(list, log, { picks });
  const { total, ready, held } = summarize(results);
  const sum = $("summary");
  if (held) sum.replaceChildren(el("span", "sum-main st-fail", `${held} of ${total} held back`), el("span", "sum-side muted", `${ready} ready to post`));
  else sum.replaceChildren(el("span", "sum-main", `${ready} of ${total} ready to post`));

  const rows = el("div", "rows");
  const order = results.map((_, i) => i).sort((a, b) => (results[a].ready === results[b].ready ? a - b : results[a].ready ? 1 : -1));
  rows.append(...order.map((i) => {
    const r = results[i];
    const st = el("span", `status ${r.ready ? "st-pass" : "st-fail"}`);
    st.append(icon(r.ready ? "check" : "cross"), r.ready ? "Ready" : "Held");
    const val = el("span", "val");
    val.append(el("b", null, title(r)), `${where(r)}${r.inv.total ? `, ${gbp(r.inv.total.value)}` : ""}`);
    if (!r.ready) val.append(el("span", "meta st-fail", shortReason(r)));
    else if (r.picked) val.append(el("span", "meta", "Job picked by a person."));
    return rowItem(`r-${r.id}`, [st, val], () => detail(r));
  }));
  if (fresh) rows.classList.add("fresh");
  const g = el("section", "group");
  g.append(el("h2", "group-h", held ? "A week of invoices, held back first" : "A week of invoices"), rows);
  $("groups").replaceChildren(g);
  updateExport();

  let k = 0;
  if (focusId) k = Math.max(0, order.findIndex((i) => results[i].id === focusId));
  const li = rows.children[k];
  if (li && (wide.matches || focusId)) {
    show(li._entry, false);
    if (focusId) li.scrollIntoView({ block: "start", behavior: calm() ? "auto" : "smooth" });
  }
}

function renderLog() {
  const t = el("table", "grid");
  const head = el("tr");
  head.append(el("th", "rn", ""));
  log.header.forEach((_, i) => head.append(el("th", "cl", colLetter(i))));
  t.append(head);
  const hdr = el("tr", "hdr");
  hdr.append(el("th", "rn", "1"));
  log.header.forEach((h) => hdr.append(el("td", null, h)));
  t.append(hdr);
  for (const row of log.rows) {
    const tr = el("tr");
    tr.append(el("th", "rn", String(row._row)));
    log.header.forEach((h) => tr.append(el("td", null, row[h])));
    t.append(tr);
  }
  $("log-grid").replaceChildren(t);
}

$("own-check").addEventListener("click", () => {
  const text = $("own-in").value.trim();
  const err = $("own-error");
  if (!text) {
    err.textContent = "Paste an invoice first. The first line is read as the contractor.";
    err.hidden = false;
    return;
  }
  err.hidden = true;
  const mine = { id: `own-${Date.now()}`, received: "just now, pasted", text };
  list = withPasted(list, mine);
  render({ fresh: true, focusId: mine.id });
});
$("own-sample").addEventListener("click", () => {
  $("own-in").value = `Kessingdale Plumbing & Heating Ltd
VAT reg no: GB 284 7731 06
INVOICE INV-2310
Date: 13 Nov 2026
Your ref: J-1046
Site: Flat 1, Haddon Mansions, London SE15
Labour, 2 hrs @ £55.00  £110.00
Isolation valve  £18.40
Net  £128.40
VAT @ 20%  £25.68
Total due  £154.08`;
});
$("vat-mode").addEventListener("click", () => {
  vatRecoverable = !vatRecoverable;
  $("vat-mode").setAttribute("aria-pressed", String(vatRecoverable));
  $("vat-mode").textContent = vatRecoverable ? "Post VAT as cost instead" : "Post VAT separately instead";
  const id = open?.key?.slice(2);
  render({ focusId: wide.matches ? id : null });
  const note = $("export-note");
  note.textContent = vatRecoverable ? "Ready invoices now post VAT on its own line. Open one to see the entries." : "Ready invoices now post VAT as part of the cost. Open one to see the entries.";
  note.hidden = false;
});
$("export").addEventListener("click", () => {
  const chosen = results.filter((r) => r.ready && approved.has(r.id));
  const note = $("export-note");
  if (!chosen.length) {
    note.textContent = "Approve at least one ready invoice first. Open one and press Approve for posting.";
    note.hidden = false;
    return;
  }
  note.hidden = true;
  const blob = new Blob([ledgerCsv(chosen, log, { vatRecoverable })], { type: "text/csv" });
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ledger-import-sample.csv";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("reset").addEventListener("click", () => {
  list = [...sampleInvoices];
  picks = {};
  approved = new Set();
  vatRecoverable = portfolio.vatRecoverable;
  $("vat-mode").setAttribute("aria-pressed", "false");
  $("vat-mode").textContent = "Post VAT separately instead";
  $("own-in").value = "";
  $("own-error").hidden = true;
  $("export-note").hidden = true;
  render({ fresh: true });
  $("summary").scrollIntoView({ block: "start", behavior: calm() ? "auto" : "smooth" });
});
$("why-btn").addEventListener("click", () => {
  const t = $("chain");
  t.hidden = !t.hidden;
  $("why-btn").setAttribute("aria-expanded", String(!t.hidden));
});

renderLog();
render();
