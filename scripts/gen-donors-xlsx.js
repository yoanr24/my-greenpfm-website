// scripts/gen-donors-xlsx.js
// One-shot: create data/donors.xlsx from the current data/donors.json
// Run once to bootstrap; then edit the xlsx and use npm run build:donors.

'use strict';

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SRC = path.join(__dirname, '..', 'data', 'donors.json');
const DST = path.join(__dirname, '..', 'data', 'donors.xlsx');

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const wb = XLSX.utils.book_new();

/* Sheet: donors — single column "id" */
const donorsSheet = XLSX.utils.json_to_sheet(
  data.donors.map(function (id) { return { id: id }; })
);
XLSX.utils.book_append_sheet(wb, donorsSheet, 'donors');

/* Sheet: institutions — id, label, axis */
const instSheet = XLSX.utils.json_to_sheet(
  data.institutions.map(function (r) {
    return { id: r.id, label: r.label, axis: r.axis };
  })
);
XLSX.utils.book_append_sheet(wb, instSheet, 'institutions');

/* Sheet: interventions — institution, donor, status, type, label, tbc */
const ivSheet = XLSX.utils.json_to_sheet(
  data.interventions.map(function (r) {
    return {
      institution : r.institution,
      donor       : r.donor,
      status      : r.status,
      type        : r.type,
      label       : r.label,
      tbc         : r.tbc ? true : '',
    };
  })
);
XLSX.utils.book_append_sheet(wb, ivSheet, 'interventions');

/* Sheet: dp_coordination — from, to, topic */
const dpSheet = XLSX.utils.json_to_sheet(
  data.dp_coordination.map(function (r) {
    return { from: r.from, to: r.to, topic: r.topic };
  })
);
XLSX.utils.book_append_sheet(wb, dpSheet, 'dp_coordination');

XLSX.writeFile(wb, DST);
console.log('Generated data/donors.xlsx from donors.json');
