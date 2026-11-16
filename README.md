# Invoice Match

Contractor invoices come in for repair jobs. Plain code reads each one, matches it to a job in the property manager's job log, and links every figure to the invoice line or the log cell it came from. An invoice that does not fit its job is held back with the reason. Nothing posts until a person approves it.

The sample is a made-up managing agent with three London blocks of flats: a job log of 30 repairs as a CSV export, and 11 contractor invoices as the text a PDF gives when you copy it out. Four are ready to post. Seven are held back on purpose, one for each check after the first.

## The checks

An invoice is ready only when all of these hold:

1. **Read.** Contractor, invoice number, date, at least one charge line and a total are on the invoice.
2. **Matched to one job.** By the job ref on the invoice, and the contractor is the one assigned to that job. With no job ref, it matches only when exactly one job in the log fits the contractor and the address. Two or more candidates go to a person, who picks one.
3. **Not invoiced already.** The job has no invoice number posted in the log, and no earlier invoice in the batch has the same number or the same job.
4. **Job marked Completed.** Not Booked or Open.
5. **Same block and flat.** The block and the flat (or communal area) on the invoice are the job's.
6. **Within the quote.** The net is at or under the quoted price, and the labour hours at or under the quoted hours.
7. **Lines add up.** Hours times rate, quantity times unit price, lines to net, VAT at the stated rate, net plus VAT to total.
8. **VAT only with a VAT number.** VAT is charged only when the invoice shows a VAT registration number, and at the standard 20%.

The seven held back in the sample:

- A roofer's invoice for Flat 4 against a job for Flat 14.
- A handyman charging £23.20 VAT with no VAT number on the invoice.
- A plumber's payment reminder that resends an invoice already posted against its job.
- A plumber's invoice for a job the log still has as Booked.
- An electrician's invoice at £408.00 net and 6 hours against a £300.00, 4-hour quote.
- A drainage invoice whose lines make £185.00 while its net says £195.00.
- An electrician's invoice with no job ref and no flat, where two jobs at the block fit. Pick one and it is checked again.

Ready invoices show the entries they would post, a person approves them, and the approved ones download as a generic ledger CSV.

## VAT on residential lettings

Letting a home is normally exempt from VAT, and service charges under a residential lease or tenancy follow the same treatment. So in this sample the landlord cannot reclaim the VAT a contractor charges, and it is posted as part of the repair cost. The button "Post VAT separately instead" shows the entries for a client that can reclaim it. Which applies is a question for the client's accountant; the page does not decide it.

## Where a model would go

The invoice reader here is plain rules: a first line for the contractor, `VAT reg no`, `Invoice no`, `Date`, `Your ref` or `Job ref`, a `Site` line, charge lines ending in a £ amount, `2.5 hrs @ £55.00` and `4 x £18.50`, and `Net`, `VAT` and `Total` lines. Real invoices are PDFs, photos and emails in every layout. A model would read those, and its output would pass through the same checks, so a person only sees invoices whose figures already trace back to the invoice and the job log. The person still approves before anything posts.

## Sources

Checked on 16 Nov 2026.

- Only VAT-registered businesses can issue VAT invoices, and a full VAT invoice shows the supplier's VAT registration number: HMRC, Record keeping (VAT Notice 700/21), sections 3.1 and 4, last updated 18 March 2024, https://www.gov.uk/guidance/record-keeping-for-vat-notice-70021
- The standard rate has been 20% since 4 January 2011: HMRC, VAT guide (VAT Notice 700), last updated 25 June 2026, https://www.gov.uk/guidance/vat-guide-notice-700
- Letting land is normally exempt from VAT, and service charges under a residential lease or tenancy are further payment for that exempt supply: HMRC, Land and property (VAT Notice 742), sections 3.1 and 12.1, last updated 31 December 2020, https://www.gov.uk/guidance/vat-on-land-and-property-notice-742
- The VAT reverse charge for construction applies between businesses that are VAT registered and in the Construction Industry Scheme, and not when the customer is an end user: HMRC, VAT domestic reverse charge technical guide, last updated 18 September 2024, https://www.gov.uk/guidance/vat-reverse-charge-technical-guide
- CIS deduction rates and who counts as a contractor: HMRC, Construction Industry Scheme: a guide for contractors and subcontractors (CIS 340), last updated 27 August 2026, https://www.gov.uk/government/publications/construction-industry-scheme-cis-340
- What any invoice must include (a unique number, the supplier, the date, the amounts): GOV.UK, Invoicing and taking payment from customers, https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include

## Run the tests

```
node --test
```

Needs Node 20 or later. No dependencies. 19 tests cover the sample results, reading an invoice, the no-net and no-VAT cases, matching with and without a job ref, a person picking the job, each hold, the "not found" rule, the ledger entries in both VAT modes, the CSV export, that a pasted copy of a sample invoice is the one held as a duplicate, and that every underlined value and every outlined cell is exactly where it says.

## Open the page locally

```
python3 -m http.server 8792
```

Then open http://localhost:8792. The page makes no network calls beyond its own files.

## Limits

- One job per invoice. Invoices covering several jobs, part payments, credit notes and retentions are not handled.
- The VAT number is checked for its shape (nine digits, with or without GB), not against HMRC's register.
- Only the standard 20% rate is known. Any other rate goes to a person.
- The Construction Industry Scheme (CIS) is not handled. Whether deductions apply depends on the client.
- Quote tolerance is zero. A real team might allow a set amount or percentage, or an approved variation.
- Addresses are matched by block name and flat number, not by postcode.
- Approving only adds an invoice to the export in this page. Nothing is posted or sent.
- UK only. The reader takes pounds and UK wording (flat, communal, VAT), and check 8 is a UK VAT rule. The other seven checks do not depend on the country.
- Quotes in the job log are read as before VAT and compared with the invoice net. A team that approves spend including VAT would compare the total.
- The VAT reverse charge for construction services is not handled. It does not apply to these blocks, which are end users and not VAT registered. An invoice with a £0.00 VAT line and a reverse charge note is held on the sums check; one with no VAT line at all reads as "No VAT charged".
- A held invoice has no next step on the page. A real tool would let a person approve it with a note or send it back to the contractor.

## Design

It follows the shared direction for these demos: the result first, rows split by hairlines, and an underline that draws under what the invoice said and under the log cells a check used. Geist for the tool, Newsreader for the contractor's invoice, a warm off-white ground, a near-black primary button and a deep teal for links. The detail has the shape of the work: the invoice, the job's row in the log, the checks and the ledger entries.

Fonts: Geist and Newsreader (SIL Open Font License), in `fonts/`.

## Provenance

Built on 16 Nov 2026 with AI coding agents, directed by Arnold Ikpemosi Adeyemi. Made-up blocks, contractors, VAT numbers and jobs. Contractor names were checked against the Companies House register on 16 Nov 2026 and none is a registered company. The four VAT numbers fail the check-digit test, so none is a real number.

## Licence

MIT. See `LICENSE`.
