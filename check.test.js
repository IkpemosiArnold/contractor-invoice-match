import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBatch, withPasted, checkInvoice, parseCsv, parseInvoice, summarize, ledgerEntries, ledgerCsv, pence, gbp, CHECKS } from "./check.js";
import { jobLogCsv, invoices } from "./samples.js";

const log = parseCsv(jobLogCsv);
const batch = checkBatch(invoices, log);
const res = Object.fromEntries(batch.map((r) => [r.id, r]));
const held = (r) => r.holds.filter((h) => h.state === "fail" || h.state === "none").map((h) => h.id);
const one = (text, ctx) => checkInvoice({ id: "t", text }, log, ctx);
const base = (over = {}) => {
  const o = {
    head: "Kessingdale Plumbing & Heating Ltd\nVAT reg no: GB 284 7731 06",
    no: "INVOICE INV-9001", date: "Date: 13 Nov 2026", ref: "Your ref: J-1042",
    site: "Site: Flat 7, Elmore House, London E8",
    lines: "Labour, 2 hrs @ £55.00  £110.00\nValve  £40.00",
    net: "Net  £150.00", vat: "VAT @ 20%  £30.00", total: "Total due  £180.00", ...over,
  };
  return [o.head, o.no, o.date, o.ref, o.site, o.lines, o.net, o.vat, o.total].filter(Boolean).join("\n");
};

test("the sample: 4 ready, 7 held, each held for one check", () => {
  assert.deepEqual(summarize(batch), { total: 11, ready: 4, held: 7 });
  for (const id of ["kessingdale-2291", "brindlow-0817", "okafor-114", "coldfen-5530"]) assert.ok(res[id].ready, id);
  assert.deepEqual(held(res["hallowby-3310"]), ["flat"]);
  assert.deepEqual(held(res["marrowby-077"]), ["vat"]);
  assert.deepEqual(held(res["kessingdale-2264"]), ["duplicate"]);
  assert.deepEqual(held(res["kessingdale-2296"]), ["completed"]);
  assert.deepEqual(held(res["brindlow-0822"]), ["quote"]);
  assert.deepEqual(held(res["coldfen-5541"]), ["sums"]);
  assert.equal(res["brindlow-0826"].holds[0].id, "match");
});

test("the job log: 30 jobs, rows numbered as in a spreadsheet", () => {
  assert.equal(log.rows.length, 30);
  assert.equal(log.rows[0]._row, 2);
  assert.equal(log.rows.find((r) => r.job_id === "J-1042")._row, 10);
});

test("every underlined value sits at its exact place in the invoice", () => {
  for (const r of batch) {
    for (const c of r.checks) {
      for (const m of c.marks) assert.equal(r.inv.text.slice(m.start, m.end), m.text, `${r.id} ${c.id}`);
    }
  }
});

test("every cell a check points at holds the value it shows", () => {
  for (const r of batch) {
    for (const c of r.checks) {
      for (const k of c.cells) {
        const row = log.rows.find((x) => x._row === k.row);
        assert.equal(row[log.header[k.col]], k.value, `${r.id} ${c.id} ${k.ref}`);
      }
    }
  }
});

test("reads a full invoice: number, date, ref, site, lines, totals", () => {
  const inv = parseInvoice(invoices[0].text, log);
  assert.equal(inv.contractor.value, "Kessingdale Plumbing & Heating Ltd");
  assert.equal(inv.vatNo.value, "GB 284 7731 06");
  assert.equal(inv.number.value, "INV-2291");
  assert.equal(inv.jobRef.value, "J-1042");
  assert.equal(inv.property.value, "Elmore House");
  assert.equal(inv.flat.value, "Flat 7");
  assert.equal(inv.charges.length, 3);
  assert.equal(inv.hours, 2.5);
  assert.equal(inv.net.value, 24670);
  assert.equal(inv.vat.value, 4934);
  assert.equal(inv.total.value, 29604);
});

test("no net line: the lines are the net; no VAT line: no VAT", () => {
  const r = res["okafor-114"];
  assert.equal(r.inv.net, null);
  assert.equal(r.inv.netValue, 10300);
  assert.equal(r.inv.vatValue, 0);
  assert.equal(r.checks.find((c) => c.id === "vat").state, "pass");
});

test("no job ref: matched only when exactly one job fits contractor and address", () => {
  const r = res["coldfen-5530"];
  assert.equal(r.inv.jobRef, null);
  assert.equal(r.job.job_id, "J-1053");
  const two = res["brindlow-0826"];
  assert.equal(two.job, null);
  assert.deepEqual(two.candidates.map((c) => c.job_id), ["J-1044", "J-1061"]);
});

test("a person picks the job, and the invoice is checked again", () => {
  const again = checkBatch(invoices, log, { picks: { "brindlow-0826": "J-1061" } });
  const r = again.find((x) => x.id === "brindlow-0826");
  assert.ok(r.ready);
  assert.ok(r.picked);
  assert.deepEqual(summarize(again), { total: 11, ready: 5, held: 6 });
});

test("a job ref that is not in the log is held, not guessed", () => {
  const r = one(base({ ref: "Your ref: J-9999" }));
  assert.equal(r.checks.find((c) => c.id === "match").state, "fail");
  assert.ok(!r.ready);
});

test("a job ref assigned to another contractor is held", () => {
  const r = one(base({ ref: "Your ref: J-1047" }));
  assert.match(r.checks.find((c) => c.id === "match").text, /assigned to Brindlow/);
});

test("the same job invoiced twice in one batch: the second is held", () => {
  const twice = checkBatch([{ id: "a", text: base() }, { id: "b", text: base({ no: "INVOICE INV-9002" }) }], log);
  assert.ok(twice[0].ready);
  assert.deepEqual(held(twice[1]), ["duplicate"]);
});

test("hours over the quote are held even when the net is inside it", () => {
  const r = one(base({ lines: "Labour, 4 hrs @ £30.00  £120.00\nValve  £30.00" }));
  const q = r.checks.find((c) => c.id === "quote");
  assert.equal(q.state, "fail");
  assert.match(q.text, /4 hrs of labour against 3 hrs quoted/);
});

test("line maths: hours times rate, quantity times unit, VAT and total", () => {
  assert.equal(one(base({ lines: "Labour, 2 hrs @ £55.00  £120.00\nValve  £30.00" })).checks.find((c) => c.id === "sums").state, "fail");
  assert.equal(one(base({ lines: "Labour, 2 hrs @ £55.00  £110.00\nValve 2 x £20.00  £45.00", net: "Net  £155.00", vat: "VAT @ 20%  £31.00", total: "Total due  £186.00" })).checks.find((c) => c.id === "sums").state, "fail");
  assert.equal(one(base({ vat: "VAT @ 20%  £33.00", total: "Total due  £183.00" })).checks.find((c) => c.id === "sums").state, "fail");
  assert.equal(one(base({ total: "Total due  £190.00" })).checks.find((c) => c.id === "sums").state, "fail");
  assert.ok(one(base()).ready);
});

test("VAT without a VAT number is held; a non-standard rate goes to a person", () => {
  assert.equal(one(base({ head: "Kessingdale Plumbing & Heating Ltd" })).checks.find((c) => c.id === "vat").state, "fail");
  const r = one(base({ vat: "VAT @ 5%  £7.50", total: "Total due  £157.50" }));
  assert.equal(r.checks.find((c) => c.id === "vat").state, "fail");
});

test("anything missing is not found, never filled in", () => {
  const r = one(base({ no: null, total: null }));
  const read = r.checks.find((c) => c.id === "read");
  assert.equal(read.state, "none");
  assert.match(read.text, /invoice number, total/);
  const nf = one(base({ site: "Site: Elmore House, London E8" }));
  assert.equal(nf.checks.find((c) => c.id === "flat").state, "none");
});

test("ledger: residential block posts the gross cost; a VAT-registered client posts VAT apart", () => {
  const r = res["kessingdale-2291"];
  const gross = ledgerEntries(r, log);
  assert.equal(gross.length, 2);
  assert.equal(gross[0].debit, 29604);
  assert.equal(gross[0].account, "Repairs and maintenance: Reactive repairs");
  assert.equal(gross[1].credit, 29604);
  const split = ledgerEntries(r, log, { vatRecoverable: true });
  assert.deepEqual(split.map((e) => [e.debit, e.credit]), [[24670, 0], [4934, 0], [0, 29604]]);
  for (const set of [gross, split]) assert.equal(set.reduce((s, e) => s + e.debit - e.credit, 0), 0);
  assert.deepEqual(ledgerEntries(res["marrowby-077"], log), []);
});

test("CSV export: only ready invoices, balanced", () => {
  const csv = ledgerCsv(batch, log).trim().split("\n");
  assert.equal(csv[0], "date,reference,job_id,property,account,debit,credit");
  assert.equal(csv.length, 1 + 4 * 2);
  assert.ok(csv.every((l) => !/INV-2264|MPS-077/.test(l)));
});

test("money: pence in, pounds out", () => {
  assert.equal(pence("£1,234.56"), 123456);
  assert.equal(gbp(123456), "£1,234.56");
  assert.equal(gbp(5), "£0.05");
  assert.equal(CHECKS.length, 8);
});

test("a pasted copy of a sample invoice is the one held as a duplicate; the original stays ready", () => {
  const original = invoices.find((i) => i.id === "kessingdale-2291");
  const copy = { id: "own-1", received: "just now, pasted", text: original.text };
  const out = Object.fromEntries(checkBatch(withPasted(invoices, copy), log).map((r) => [r.id, r]));
  assert.ok(out["kessingdale-2291"].ready, "original stays ready");
  assert.deepEqual(held(out["own-1"]), ["duplicate"]);
});
