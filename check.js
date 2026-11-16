// Contractor invoices matched to the job log, in plain code.
// Every value it reads keeps its place in the invoice text (start, end) or
// its cell in the job log (row, col), so the page can point at it.
// Nothing is guessed: what the invoice does not say is "not found".

export const CHECKS = [
  { id: "read", name: "Invoice read: contractor, number, date, charges, total" },
  { id: "match", name: "Matched to one job in the log" },
  { id: "duplicate", name: "Not invoiced already" },
  { id: "completed", name: "Job marked Completed" },
  { id: "flat", name: "Same block and flat as the job" },
  { id: "quote", name: "Within the quote: net and hours" },
  { id: "sums", name: "Lines add up: lines, net, VAT, total" },
  { id: "vat", name: "VAT charged only with a VAT number" },
];

const STANDARD_RATE = 20;

/** "£1,234.56" or "1234.5" to pence. */
export function pence(s) {
  const n = Number(String(s).replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function gbp(p) {
  if (p == null) return "not found";
  const neg = p < 0;
  const v = Math.abs(p);
  const pounds = Math.floor(v / 100).toLocaleString("en-GB");
  return `${neg ? "-" : ""}£${pounds}.${String(v % 100).padStart(2, "0")}`;
}

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(ltd|limited|plc|llp)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// ---------- The job log ----------

export function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  const split = (line) => {
    const out = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line, i) => {
    const vals = split(line);
    const row = { _row: i + 2 }; // spreadsheet row number, header is row 1
    header.forEach((h, j) => (row[h] = (vals[j] ?? "").trim()));
    return row;
  });
  return { header, rows };
}

export const colLetter = (i) => String.fromCharCode(65 + i);

/** A cell reference into the job log, e.g. "I10". */
export function cell(log, row, name) {
  const col = log.header.indexOf(name);
  return { row: row._row, col, name, ref: `${colLetter(col)}${row._row}`, value: row[name] };
}

// ---------- The invoice ----------

const MONEY = /£\s?([\d,]+\.\d{2})\s*$/;
const TOTALS = /^(net|sub-?total|vat\b|total|amount due|balance due)/i;

export function parseInvoice(text, log) {
  const src = text.replace(/\r/g, "");
  const lines = src.split("\n");
  const starts = [];
  let at = 0;
  for (const l of lines) { starts.push(at); at += l.length + 1; }
  const span = (li, idx, str) => ({ line: li, start: starts[li] + idx, end: starts[li] + idx + str.length, text: str });

  const inv = { text: src, contractor: null, vatNo: null, notVat: null, number: null, date: null, jobRef: null,
    site: null, property: null, flat: null, charges: [], net: null, vat: null, vatRate: null, total: null };
  const properties = [...new Set((log?.rows || []).map((r) => r.property))];

  lines.forEach((raw, li) => {
    const line = raw.trim();
    const lead = raw.length - raw.trimStart().length;
    if (!line) return;
    if (!inv.contractor) { inv.contractor = { ...span(li, lead, line), value: line }; return; }

    let m;
    if (!inv.vatNo && (m = /VAT\s*(?:reg(?:istration)?\.?\s*)?(?:no\.?|number)\s*:?\s*((?:GB\s?)?\d{3}\s?\d{4}\s?\d{2})\b/i.exec(raw))) {
      inv.vatNo = { ...span(li, m.index + m[0].indexOf(m[1]), m[1]), value: m[1].replace(/\s+/g, " ") };
      return;
    }
    if (!inv.notVat && (m = /not (?:vat registered|registered for vat)/i.exec(raw))) {
      inv.notVat = span(li, m.index, m[0]);
      return;
    }
    if (!inv.number && (m = /^(\s*(?:tax\s+)?invoice\s*(?:no\.?|number|#)?\s*:?\s+)([A-Z0-9][A-Z0-9\/-]*)\s*$/i.exec(raw))) {
      inv.number = { ...span(li, m[1].length, m[2]), value: m[2] };
      return;
    }
    if (!inv.date && (m = /^(\s*(?:invoice\s+)?date\s*:?\s*)(.+?)\s*$/i.exec(raw))) {
      inv.date = { ...span(li, m[1].length, m[2]), value: m[2] };
      return;
    }
    if ((m = /^(\s*(?:site|address|property|job address)\s*:\s*)(.+?)\s*$/i.exec(raw))) {
      inv.site = { ...span(li, m[1].length, m[2]), value: m[2] };
      const f = /\bflat\s+(\d+[a-z]?)\b/i.exec(m[2]);
      const c = /\b(communal|common parts)\b/i.exec(m[2]);
      if (f) inv.flat = { ...span(li, m[1].length + f.index, f[0]), value: `Flat ${f[1].toUpperCase()}` };
      else if (c) inv.flat = { ...span(li, m[1].length + c.index, c[0]), value: "Communal" };
      for (const p of properties) {
        const k = m[2].toLowerCase().indexOf(p.toLowerCase());
        if (k >= 0) { inv.property = { ...span(li, m[1].length + k, m[2].slice(k, k + p.length)), value: p }; break; }
      }
      return;
    }
    if (!inv.jobRef && (m = /\b(?:your ref|job ref|job no\.?|ref|po)\s*:?\s*(J-\d{3,5})\b/i.exec(raw))) {
      inv.jobRef = { ...span(li, m.index + m[0].lastIndexOf(m[1]), m[1]), value: m[1].toUpperCase() };
      return;
    }

    const money = MONEY.exec(raw);
    if (!money) return;
    const amt = { ...span(li, money.index + money[0].indexOf("£"), money[0].trim()), value: pence(money[1]) };
    if (TOTALS.test(line)) {
      if (/^vat\b/i.test(line)) {
        inv.vat = amt;
        const r = /(\d+(?:\.\d+)?)\s*%/.exec(raw);
        if (r) inv.vatRate = { ...span(li, r.index, r[0]), value: Number(r[1]) };
      } else if (/^(net|sub-?total)/i.test(line)) inv.net = amt;
      else inv.total = amt;
      return;
    }
    const desc = raw.slice(0, money.index).trim();
    const ch = { line: li, desc, descSpan: span(li, lead, desc), amount: amt };
    const lab = /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)\s*@\s*£\s?([\d,]+\.\d{2})/i.exec(raw);
    const qty = /(\d+)\s*x\s*£\s?([\d,]+\.\d{2})/i.exec(raw);
    if (lab) ch.labour = { hours: Number(lab[1]), rate: pence(lab[2]), span: span(li, lab.index, lab[0]) };
    else if (qty) ch.qty = { n: Number(qty[1]), unit: pence(qty[2]), span: span(li, qty.index, qty[0]) };
    inv.charges.push(ch);
  });

  inv.chargesSum = inv.charges.reduce((s, c) => s + c.amount.value, 0);
  inv.hours = inv.charges.some((c) => c.labour) ? inv.charges.reduce((s, c) => s + (c.labour?.hours || 0), 0) : null;
  // Net as stated, or the sum of the lines when the invoice gives no net line.
  inv.netValue = inv.net ? inv.net.value : inv.charges.length ? inv.chargesSum : null;
  inv.vatValue = inv.vat ? inv.vat.value : 0;
  return inv;
}

// ---------- The checks ----------

function hours(n) {
  return `${n} ${n === 1 ? "hr" : "hrs"}`;
}

/**
 * Check one invoice against the log. `ctx` carries what earlier invoices in
 * the batch already claimed, and any job a person picked for this invoice.
 */
export function checkInvoice(sample, log, ctx = {}) {
  const inv = parseInvoice(sample.text, log);
  const checks = [];
  const add = (id, state, text, marks = [], cells = []) => checks.push({ id, name: CHECKS.find((c) => c.id === id).name, state, text, marks, cells });

  // 1. Read
  const missing = [];
  if (!inv.number) missing.push("invoice number");
  if (!inv.date) missing.push("date");
  if (!inv.charges.length) missing.push("charge lines");
  if (!inv.total) missing.push("total");
  if (missing.length) add("read", "none", `Not found on the invoice: ${missing.join(", ")}.`);
  else add("read", "pass", `${inv.contractor.value}, invoice ${inv.number.value}, ${inv.date.value}, ${inv.charges.length} charge ${inv.charges.length === 1 ? "line" : "lines"}, total ${gbp(inv.total.value)}.`,
    [inv.contractor, inv.number, inv.date, inv.total]);

  // 2. Match
  let job = null;
  let candidates = [];
  const fromC = norm(inv.contractor?.value);
  const pick = ctx.picks?.[sample.id];
  if (pick) {
    job = log.rows.find((r) => r.job_id === pick) || null;
    if (job) add("match", "pass", `${job.job_id}, picked by a person from the candidates.`, [], [cell(log, job, "job_id")]);
  } else if (inv.jobRef) {
    job = log.rows.find((r) => r.job_id === inv.jobRef.value) || null;
    if (!job) add("match", "fail", `The invoice gives job ref ${inv.jobRef.value}. There is no such job in the log.`, [{ ...inv.jobRef, kind: "fail" }]);
    else if (norm(job.contractor) !== fromC) {
      add("match", "fail", `${job.job_id} is assigned to ${job.contractor}, but the invoice is from ${inv.contractor.value}.`,
        [inv.jobRef, { ...inv.contractor, kind: "fail" }], [cell(log, job, "job_id"), cell(log, job, "contractor")]);
      job = null;
    } else add("match", "pass", `By the job ref on the invoice, ${job.job_id}, and the contractor is the one assigned.`,
      [inv.jobRef, inv.contractor], [cell(log, job, "job_id"), cell(log, job, "contractor")]);
  } else {
    candidates = log.rows.filter((r) => norm(r.contractor) === fromC
      && (!inv.property || r.property === inv.property.value)
      && (!inv.flat || r.flat === inv.flat.value));
    const where = [inv.property?.value, inv.flat?.value].filter(Boolean).join(", ") || "an address it cannot read";
    if (!inv.property) {
      candidates = [];
      add("match", "none", "No job ref, and no block from the job log found on the invoice. Not matched.", inv.site ? [{ ...inv.site, kind: "fail" }] : []);
    } else if (candidates.length === 1) {
      job = candidates[0];
      add("match", "pass", `No job ref on the invoice. One job in the log fits this contractor at ${where}: ${job.job_id}.`,
        [inv.contractor, inv.property, ...(inv.flat ? [inv.flat] : [])], [cell(log, job, "job_id"), cell(log, job, "property"), cell(log, job, "flat"), cell(log, job, "contractor")]);
    } else if (candidates.length === 0) {
      add("match", "fail", `No job ref on the invoice, and no job in the log for this contractor at ${where}.`, [{ ...inv.contractor, kind: "fail" }, { ...inv.property, kind: "fail" }]);
    } else {
      add("match", "fail", `No job ref, and ${candidates.length} jobs fit this contractor at ${where}: ${candidates.map((c) => c.job_id).join(" and ")}. A person picks; the code does not.`,
        [{ ...inv.property, kind: "fail" }, ...(inv.flat ? [{ ...inv.flat, kind: "fail" }] : [])],
        candidates.map((c) => cell(log, c, "job_id")));
    }
  }

  const noJob = (id) => add(id, "none", "Not checked: no job matched.");

  // 3. Duplicate
  if (!job) noJob("duplicate");
  else {
    const key = `${fromC}|${inv.number?.value}`;
    if (job.invoice_no) {
      add("duplicate", "fail", `${job.job_id} already has invoice ${job.invoice_no} posted in the log.${inv.number?.value === job.invoice_no ? " This is the same invoice number, sent again." : ""}`,
        inv.number ? [{ ...inv.number, kind: "fail" }] : [], [cell(log, job, "invoice_no")]);
    } else if (ctx.seenNumbers?.has(key)) {
      add("duplicate", "fail", `Invoice ${inv.number.value} from this contractor is already in this batch.`, [{ ...inv.number, kind: "fail" }]);
    } else if (ctx.claimedJobs?.has(job.job_id)) {
      add("duplicate", "fail", `${job.job_id} already has invoice ${ctx.claimedJobs.get(job.job_id)} in this batch.`, inv.number ? [{ ...inv.number, kind: "fail" }] : [], [cell(log, job, "job_id")]);
    } else add("duplicate", "pass", `No invoice posted against ${job.job_id} yet, and none earlier in this batch.`, [], [cell(log, job, "invoice_no")]);
  }

  // 4. Completed
  if (!job) noJob("completed");
  else if (job.status === "Completed") add("completed", "pass", `Marked Completed on ${job.completed}.`, [], [cell(log, job, "status"), cell(log, job, "completed")]);
  else add("completed", "fail", `The log has ${job.job_id} as ${job.status}, not Completed.`, [], [cell(log, job, "status")]);

  // 5. Flat
  if (!job) noJob("flat");
  else if (pick && inv.property?.value === job.property && !inv.flat) {
    add("flat", "pass", `The invoice names the block only. A person picked ${job.job_id}, ${job.flat}, ${job.property}.`, [inv.property], [cell(log, job, "property"), cell(log, job, "flat")]);
  } else if (!inv.property || !inv.flat) {
    add("flat", "none", `Not found on the invoice: ${[!inv.property && "the block", !inv.flat && "a flat or communal area"].filter(Boolean).join(" and ")}.`,
      inv.site ? [{ ...inv.site, kind: "fail" }] : [], [cell(log, job, "property"), cell(log, job, "flat")]);
  } else if (inv.property.value !== job.property || inv.flat.value !== job.flat) {
    add("flat", "fail", `The invoice says ${inv.flat.value}, ${inv.property.value}. ${job.job_id} is ${job.flat}, ${job.property}.`,
      [{ ...inv.flat, kind: inv.flat.value !== job.flat ? "fail" : "pass" }, { ...inv.property, kind: inv.property.value !== job.property ? "fail" : "pass" }],
      [{ ...cell(log, job, "property"), kind: inv.property.value !== job.property ? "fail" : "pass" }, { ...cell(log, job, "flat"), kind: inv.flat.value !== job.flat ? "fail" : "pass" }]);
  } else add("flat", "pass", `${inv.flat.value}, ${inv.property.value}, as in the log.`, [inv.flat, inv.property], [cell(log, job, "property"), cell(log, job, "flat")]);

  // 6. Quote
  if (!job) noJob("quote");
  else {
    const q = pence(job.quote_gbp);
    const qh = Number(job.quoted_hours);
    const net = inv.netValue;
    const over = [];
    if (net == null) over.push("net not found");
    else if (net > q) over.push(`net ${gbp(net)} is ${gbp(net - q)} over the ${gbp(q)} quote`);
    if (inv.hours != null && inv.hours > qh) over.push(`${hours(inv.hours)} of labour against ${hours(qh)} quoted`);
    const netMark = inv.net || null;
    const hourMarks = inv.charges.filter((c) => c.labour).map((c) => c.labour.span);
    const cells = [cell(log, job, "quote_gbp"), cell(log, job, "quoted_hours")];
    if (over.length) {
      add("quote", net == null ? "none" : "fail", `${over[0][0].toUpperCase()}${over[0].slice(1)}${over[1] ? `, and ${over[1]}` : ""}.`,
        [...(netMark ? [{ ...netMark, kind: net > q ? "fail" : "pass" }] : []), ...hourMarks.map((s) => ({ ...s, kind: inv.hours > qh ? "fail" : "pass" }))], cells);
    } else {
      const h = inv.hours != null ? `; ${hours(inv.hours)} of ${hours(qh)} quoted` : "; no labour hours on the invoice";
      add("quote", "pass", `Net ${gbp(net)} within the ${gbp(q)} quote${h}.`, [...(netMark ? [netMark] : []), ...hourMarks], cells);
    }
  }

  // 7. Sums
  {
    const bad = [];
    const marks = [];
    for (const c of inv.charges) {
      if (c.labour) {
        const want = Math.round(c.labour.hours * c.labour.rate);
        if (want !== c.amount.value) { bad.push(`${c.labour.span.text} is ${gbp(want)}, the line says ${gbp(c.amount.value)}`); marks.push({ ...c.amount, kind: "fail" }); }
      } else if (c.qty) {
        const want = c.qty.n * c.qty.unit;
        if (want !== c.amount.value) { bad.push(`${c.qty.span.text} is ${gbp(want)}, the line says ${gbp(c.amount.value)}`); marks.push({ ...c.amount, kind: "fail" }); }
      }
    }
    if (inv.net && inv.chargesSum !== inv.net.value) { bad.push(`the lines add up to ${gbp(inv.chargesSum)}, the net says ${gbp(inv.net.value)}`); marks.push({ ...inv.net, kind: "fail" }); }
    const net = inv.netValue ?? 0;
    if (inv.vat) {
      const rate = inv.vatRate?.value ?? STANDARD_RATE;
      const want = Math.round((net * rate) / 100);
      if (Math.abs(want - inv.vat.value) > 1) { bad.push(`VAT at ${rate}% on ${gbp(net)} is ${gbp(want)}, the invoice says ${gbp(inv.vat.value)}`); marks.push({ ...inv.vat, kind: "fail" }); }
    }
    if (inv.total && net + inv.vatValue !== inv.total.value) { bad.push(`net plus VAT is ${gbp(net + inv.vatValue)}, the total says ${gbp(inv.total.value)}`); marks.push({ ...inv.total, kind: "fail" }); }
    if (!inv.charges.length || !inv.total) add("sums", "none", "Not checked: charge lines or total not found.");
    else if (bad.length) add("sums", "fail", `${bad.map((b, i) => (i ? b : b[0].toUpperCase() + b.slice(1))).join("; ")}.`,
      [...inv.charges.map((c) => c.amount).filter((a) => !marks.some((m) => m.start === a.start)), ...marks]);
    else add("sums", "pass", `${inv.charges.length} ${inv.charges.length === 1 ? "line makes" : "lines make"} ${gbp(inv.chargesSum)}${inv.net ? ", as the net says" : " (no net line, so this is the net)"}; ${inv.vat ? `VAT ${gbp(inv.vat.value)}` : "no VAT"}; total ${gbp(inv.total.value)}.`,
      [...inv.charges.map((c) => c.amount), ...(inv.net ? [inv.net] : []), ...(inv.vat ? [inv.vat] : []), inv.total]);
  }

  // 8. VAT
  if (inv.vatValue > 0) {
    const rate = inv.vatRate?.value;
    if (!inv.vatNo) add("vat", "fail", `${gbp(inv.vatValue)} VAT charged, and no VAT registration number on the invoice. Only a VAT-registered business can issue a VAT invoice.`, [{ ...inv.vat, kind: "fail" }]);
    else if (rate != null && rate !== STANDARD_RATE) add("vat", "fail", `VAT at ${rate}%. This sample only knows the standard ${STANDARD_RATE}% rate, so a person checks it.`, [{ ...inv.vatRate, kind: "fail" }, inv.vatNo]);
    else add("vat", "pass", `${gbp(inv.vatValue)} VAT${rate ? ` at ${rate}%` : ""}, with VAT registration number ${inv.vatNo.value} on the invoice.`, [inv.vatNo, inv.vat, ...(inv.vatRate ? [inv.vatRate] : [])]);
  } else {
    add("vat", "pass", inv.vatNo ? "No VAT charged." : `No VAT charged and no VAT number${inv.notVat ? "; the invoice says the contractor is not VAT registered" : ""}.`, inv.notVat ? [inv.notVat] : []);
  }

  const ready = checks.every((c) => c.state === "pass");
  const holds = checks.filter((c) => c.state !== "pass");
  return { id: sample.id, sample, inv, job, candidates, checks, holds, ready, picked: !!pick };
}

/** Check a batch in order. Earlier invoices claim their job and number. */
/** A pasted invoice joins the batch last, so earlier invoices keep their claim on a job and a copy is the one held. */
export function withPasted(list, mine) {
  return [...list, mine];
}

export function checkBatch(samples, log, { picks = {} } = {}) {
  const seenNumbers = new Set();
  const claimedJobs = new Map();
  return samples.map((s) => {
    const r = checkInvoice(s, log, { picks, seenNumbers, claimedJobs });
    if (r.inv.number) seenNumbers.add(`${norm(r.inv.contractor?.value)}|${r.inv.number.value}`);
    if (r.job && r.checks.find((c) => c.id === "duplicate")?.state === "pass") claimedJobs.set(r.job.job_id, r.inv.number?.value);
    return r;
  });
}

export function summarize(results) {
  const ready = results.filter((r) => r.ready).length;
  return { total: results.length, ready, held: results.length - ready };
}

/** The entries a ready invoice would post. */
export function ledgerEntries(r, log, { vatRecoverable = false } = {}) {
  if (!r.ready) return [];
  const { inv, job } = r;
  const total = inv.total.value;
  const net = inv.netValue;
  const vat = inv.vatValue;
  const ref = `${inv.number.value} ${job.job_id}`;
  const head = cell(log, job, "budget_head");
  const prop = cell(log, job, "property");
  const out = [];
  if (vatRecoverable && vat > 0) {
    out.push({ account: `Repairs and maintenance: ${job.budget_head}`, property: job.property, debit: net, credit: 0, ref, from: inv.net || null, fromLabel: inv.net ? "invoice net" : "invoice lines", cells: [head, prop] });
    out.push({ account: "VAT input", property: job.property, debit: vat, credit: 0, ref, from: inv.vat, fromLabel: "invoice VAT", cells: [] });
  } else {
    out.push({ account: `Repairs and maintenance: ${job.budget_head}`, property: job.property, debit: total, credit: 0, ref, from: inv.total, fromLabel: "invoice total", cells: [head, prop],
      note: vat > 0 ? `Includes ${gbp(vat)} VAT, treated as cost` : null });
  }
  out.push({ account: `Creditors: ${inv.contractor.value}`, property: job.property, debit: 0, credit: total, ref, from: inv.total, fromLabel: "invoice total", cells: [] });
  return out;
}

export function ledgerCsv(results, log, opts) {
  const rows = [["date", "reference", "job_id", "property", "account", "debit", "credit"]];
  for (const r of results) {
    for (const e of ledgerEntries(r, log, opts)) {
      rows.push([r.inv.date.value, r.inv.number.value, r.job.job_id, e.property, e.account, e.debit ? (e.debit / 100).toFixed(2) : "", e.credit ? (e.credit / 100).toFixed(2) : ""]);
    }
  }
  const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return rows.map((r) => r.map(q).join(",")).join("\n") + "\n";
}
