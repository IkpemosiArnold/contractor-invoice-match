// Sample data. Everything here is made up: the blocks,
// the contractors, the VAT numbers and the jobs. Not real people or firms.

export const portfolio = {
  // Residential rents and service charges are exempt, so the landlord cannot
  // reclaim the contractor's VAT and it is posted as part of the cost. See README.
  vatRecoverable: false,
};

// The job log, as a property manager's CSV export. One row per repair job.
export const jobLogCsv = `job_id,property,flat,issue,budget_head,contractor,quote_gbp,quoted_hours,status,completed,invoice_no
J-1031,Elmore House,Flat 2,Smoke alarm chirping,Fire safety,Brindlow Electrical Ltd,85.00,1,Completed,2026-10-21,BE-0791
J-1033,Wren Court,Communal,Lift alarm line test,Lift,Aldersby Lift Services Ltd,120.00,1,Completed,2026-10-22,ALS-1187
J-1034,Haddon Mansions,Flat 8,Damp patch in bathroom ceiling,Reactive repairs,Kessingdale Plumbing & Heating Ltd,140.00,2,Completed,2026-10-23,INV-2251
J-1036,Wren Court,Flat 5,Front door lock sticking,Reactive repairs,R. Okafor Locksmiths,70.00,1,Completed,2026-10-26,109
J-1038,Elmore House,Flat 5,Leaking cylinder valve,Reactive repairs,Kessingdale Plumbing & Heating Ltd,180.00,2,Completed,2026-10-29,INV-2264
J-1039,Haddon Mansions,Communal,Gutter clear front elevation,Roof and gutters,Hallowby Roofing Ltd,320.00,4,Completed,2026-10-30,HR-3297
J-1040,Elmore House,Communal,Communal cleaning deep clean,Cleaning,Marrowby Property Services,160.00,4,Completed,2026-10-31,MPS-071
J-1041,Wren Court,Flat 9,Window restrictor broken,Reactive repairs,Marrowby Property Services,60.00,1,Open,,
J-1042,Elmore House,Flat 7,No hot water,Reactive repairs,Kessingdale Plumbing & Heating Ltd,260.00,3,Completed,2026-11-06,
J-1043,Elmore House,Flat 11,Bathroom extractor noisy,Reactive repairs,Brindlow Electrical Ltd,110.00,1.5,Open,,
J-1044,Haddon Mansions,Communal,Emergency light failed test 2nd floor,Fire safety,Brindlow Electrical Ltd,150.00,2,Completed,2026-11-03,
J-1045,Wren Court,Communal,Bike store gate latch,Reactive repairs,Marrowby Property Services,55.00,1,Booked,,
J-1046,Haddon Mansions,Flat 1,Leak from flat above,Reactive repairs,Kessingdale Plumbing & Heating Ltd,200.00,2.5,Open,,
J-1047,Wren Court,Communal,Stair lighting out floors 2 to 4,Communal electrics,Brindlow Electrical Ltd,280.00,3,Completed,2026-11-05,
J-1048,Elmore House,Communal,Fire door closer adjustment,Fire safety,Marrowby Property Services,75.00,1,Booked,,
J-1049,Elmore House,Flat 14,Roof leak over bedroom,Roof and gutters,Hallowby Roofing Ltd,450.00,5,Completed,2026-11-04,
J-1050,Wren Court,Flat 3,Radiator valve weeping,Reactive repairs,Kessingdale Plumbing & Heating Ltd,95.00,1,Booked,,
J-1051,Haddon Mansions,Flat 2,Lock change after lost keys,Reactive repairs,R. Okafor Locksmiths,110.00,1,Completed,2026-11-07,
J-1052,Elmore House,Flat 4,Kitchen tap loose,Reactive repairs,Marrowby Property Services,45.00,0.5,Open,,
J-1053,Wren Court,Flat 11,Blocked kitchen sink,Drainage,Coldfen Drainage Ltd,150.00,1.5,Completed,2026-11-09,
J-1054,Haddon Mansions,Communal,Entrance mat replacement,Reactive repairs,Marrowby Property Services,90.00,1,Open,,
J-1055,Haddon Mansions,Flat 3,Dripping bath tap,Reactive repairs,Kessingdale Plumbing & Heating Ltd,120.00,1.5,Booked,,
J-1056,Wren Court,Communal,Quarterly fire alarm test,Fire safety,Brindlow Electrical Ltd,95.00,1,Booked,,
J-1057,Elmore House,Flat 9,Shower tray seal,Reactive repairs,Kessingdale Plumbing & Heating Ltd,85.00,1,Open,,
J-1058,Wren Court,Communal,Door entry panel fault,Communal electrics,Brindlow Electrical Ltd,300.00,4,Completed,2026-11-10,
J-1059,Haddon Mansions,Flat 5,Loft hatch will not close,Reactive repairs,Marrowby Property Services,50.00,1,Open,,
J-1060,Elmore House,Communal,Bin store door rehang,Reactive repairs,Marrowby Property Services,140.00,2,Completed,2026-11-06,
J-1061,Haddon Mansions,Flat 6,Extractor fan not working,Reactive repairs,Brindlow Electrical Ltd,160.00,2,Completed,2026-11-08,
J-1062,Elmore House,Communal,Roof access hatch seal,Roof and gutters,Hallowby Roofing Ltd,180.00,2,Open,,
J-1063,Haddon Mansions,Communal,Gully blocked at rear,Drainage,Coldfen Drainage Ltd,200.00,2,Completed,2026-11-11,`;

// Contractor invoices, as the text a PDF gives when you copy it out.
export const invoices = [
  {
    id: "kessingdale-2291",
    received: "Mon 9 Nov, 08:14",
    text: `Kessingdale Plumbing & Heating Ltd
Unit 4, Mill Yard, London E9
VAT reg no: GB 284 7731 06

INVOICE INV-2291
Date: 9 Nov 2026
Your ref: J-1042
Site: Flat 7, Elmore House, 12 Calder Road, London E8

Labour, 2.5 hrs @ £55.00  £137.50
Diverter valve  £64.20
Call-out  £45.00

Net  £246.70
VAT @ 20%  £49.34
Total due  £296.04`,
  },
  {
    id: "brindlow-0817",
    received: "Mon 9 Nov, 10:02",
    text: `Brindlow Electrical Ltd
VAT Registration No. 318 5520 47

Tax invoice no: BE-0817
Date: 9 Nov 2026
Job ref: J-1047
Site: Communal stairs, Wren Court, 40 Partridge Lane, London N16

Labour 3 hrs @ £60.00  £180.00
LED bulkhead fittings 4 x £18.50  £74.00

Subtotal  £254.00
VAT 20%  £50.80
Total  £304.80`,
  },
  {
    id: "hallowby-3310",
    received: "Mon 9 Nov, 13:40",
    text: `Hallowby Roofing Ltd
VAT reg no: GB 402 1189 73

Invoice no: HR-3310
Date: 9 Nov 2026
Your ref: J-1049
To: The landlord of Elmore House, c/o the managing agent
Site: Flat 4, Elmore House, 12 Calder Road, London E8

Labour 4 hrs @ £62.50  £250.00
Lead flashing and sealant  £96.00
Scaffold tower hire  £75.00

Net  £421.00
VAT @ 20%  £84.20
Total due  £505.20`,
  },
  {
    id: "okafor-114",
    received: "Tue 10 Nov, 07:55",
    text: `R. Okafor Locksmiths
Invoice no: 114
Date: 10 Nov 2026
Ref: J-1051
Site: Flat 2, Haddon Mansions, 3 Byers Street, London SE15

Labour 1 hr @ £65.00  £65.00
Euro cylinder lock  £38.00

Total due  £103.00
Not VAT registered.`,
  },
  {
    id: "marrowby-077",
    received: "Tue 10 Nov, 09:31",
    text: `Marrowby Property Services
Invoice no: MPS-077
Date: 10 Nov 2026
Job ref: J-1060
Site: Communal bin store, Elmore House, London E8

Labour 2 hrs @ £40.00  £80.00
Hinges and door closer  £36.00

Subtotal  £116.00
VAT 20%  £23.20
Total  £139.20`,
  },
  {
    id: "kessingdale-2264",
    received: "Tue 10 Nov, 11:18",
    text: `Kessingdale Plumbing & Heating Ltd
VAT reg no: GB 284 7731 06

COPY INVOICE, payment reminder
INVOICE INV-2264
Date: 30 Oct 2026
Your ref: J-1038
Site: Flat 5, Elmore House, 12 Calder Road, London E8

Labour, 2 hrs @ £55.00  £110.00
Cylinder valve  £38.50

Net  £148.50
VAT @ 20%  £29.70
Total due  £178.20`,
  },
  {
    id: "coldfen-5530",
    received: "Tue 10 Nov, 15:06",
    text: `Coldfen Drainage Ltd
VAT reg no: GB 377 6402 18

Invoice no: CF-5530
Date: 10 Nov 2026
Site: Flat 11, Wren Court, 40 Partridge Lane, London N16

Kitchen sink waste unblock, fixed price  £120.00

Net  £120.00
VAT @ 20%  £24.00
Total  £144.00`,
  },
  {
    id: "kessingdale-2296",
    received: "Wed 11 Nov, 08:47",
    text: `Kessingdale Plumbing & Heating Ltd
VAT reg no: GB 284 7731 06

INVOICE INV-2296
Date: 11 Nov 2026
Your ref: J-1055
Site: Flat 3, Haddon Mansions, 3 Byers Street, London SE15

Labour, 1 hr @ £55.00  £55.00
Tap cartridge and washers  £22.40

Net  £77.40
VAT @ 20%  £15.48
Total due  £92.88`,
  },
  {
    id: "brindlow-0822",
    received: "Wed 11 Nov, 12:20",
    text: `Brindlow Electrical Ltd
VAT Registration No. 318 5520 47

Tax invoice no: BE-0822
Date: 11 Nov 2026
Job ref: J-1058
Site: Communal entrance, Wren Court, 40 Partridge Lane, London N16

Labour 6 hrs @ £60.00  £360.00
Door entry power supply unit  £48.00

Subtotal  £408.00
VAT 20%  £81.60
Total  £489.60`,
  },
  {
    id: "coldfen-5541",
    received: "Thu 12 Nov, 09:12",
    text: `Coldfen Drainage Ltd
VAT reg no: GB 377 6402 18

Invoice no: CF-5541
Date: 12 Nov 2026
Job ref: J-1063
Site: Communal rear yard, Haddon Mansions, London SE15

Labour 2 hrs @ £50.00  £100.00
High-pressure jetting  £85.00

Net  £195.00
VAT @ 20%  £39.00
Total  £234.00`,
  },
  {
    id: "brindlow-0826",
    received: "Thu 12 Nov, 14:35",
    text: `Brindlow Electrical Ltd
VAT Registration No. 318 5520 47

Tax invoice no: BE-0826
Date: 12 Nov 2026
Site: Haddon Mansions, 3 Byers Street, London SE15

Labour 1.5 hrs @ £60.00  £90.00
Extractor fan  £42.00

Subtotal  £132.00
VAT 20%  £26.40
Total  £158.40`,
  },
];
