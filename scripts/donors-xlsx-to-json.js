// scripts/donors-xlsx-to-json.js
// Reads data/donors.xlsx and writes data/donors.json.
// Usage:
//   node scripts/donors-xlsx-to-json.js            # one-shot build
//   node scripts/donors-xlsx-to-json.js --watch    # rebuild on file change

'use strict';

const fs      = require('fs');
const path    = require('path');
const XLSX    = require('xlsx');

const XLSX_PATH = path.join(__dirname, '..', 'data', 'donors.xlsx');
const JSON_PATH = path.join(__dirname, '..', 'data', 'donors.json');

/* ── Required columns per sheet ─────────────────────────────────── */
const REQUIRED = {
  donors        : ['id'],
  institutions  : ['id', 'label', 'axis'],
  interventions : ['institution', 'donor', 'status', 'type', 'label'],
  dp_coordination: ['from', 'to', 'topic'],
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function sheetToRows(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  // Normalise header keys to lowercase-trimmed
  return rows.map(function (row) {
    const out = {};
    Object.keys(row).forEach(function (k) {
      out[k.trim().toLowerCase()] = row[k];
    });
    return out;
  });
}

function findSheet(wb, name) {
  const lower = name.toLowerCase();
  const found = wb.SheetNames.find(function (n) {
    return n.trim().toLowerCase() === lower;
  });
  if (!found) throw new Error('Missing sheet: "' + name + '" (case-insensitive). Found: ' + wb.SheetNames.join(', '));
  return wb.Sheets[found];
}

function validateCols(rows, sheet, required) {
  if (!rows.length) return; // empty sheet — columns can't be checked
  const keys = Object.keys(rows[0]);
  required.forEach(function (col) {
    if (!keys.includes(col)) {
      throw new Error(
        'Sheet "' + sheet + '" is missing required column "' + col +
        '". Found columns: ' + keys.join(', ')
      );
    }
  });
}

function parseBool(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') {
    return ['true', '1', 'yes', 'y'].includes(val.trim().toLowerCase());
  }
  return false;
}

/* ── Main conversion ─────────────────────────────────────────────── */
function convert() {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error('File not found: ' + XLSX_PATH + '. Run `npm run build:donors` only after creating the file.');
  }

  const wb = XLSX.readFile(XLSX_PATH);

  /* donors sheet → simple array of strings */
  const donorsWs = findSheet(wb, 'donors');
  const donorsRows = sheetToRows(donorsWs);
  validateCols(donorsRows, 'donors', REQUIRED.donors);
  const donors = donorsRows
    .map(function (r) { return String(r.id || '').trim(); })
    .filter(Boolean);

  /* institutions sheet */
  const instWs = findSheet(wb, 'institutions');
  const instRows = sheetToRows(instWs);
  validateCols(instRows, 'institutions', REQUIRED.institutions);
  const institutions = instRows
    .filter(function (r) { return r.id; })
    .map(function (r) {
      return { id: String(r.id).trim(), label: String(r.label).trim(), axis: String(r.axis).trim() };
    });

  /* interventions sheet */
  const ivWs = findSheet(wb, 'interventions');
  const ivRows = sheetToRows(ivWs);
  validateCols(ivRows, 'interventions', REQUIRED.interventions);
  const interventions = ivRows
    .filter(function (r) { return r.institution && r.donor; })
    .map(function (r) {
      var obj = {
        institution : String(r.institution).trim(),
        donor       : String(r.donor).trim(),
        status      : String(r.status || 'active').trim(),
        type        : String(r.type  || 'TA').trim(),
        label       : String(r.label || '').trim(),
      };
      // Only include tbc key when truthy (keeps JSON clean)
      var tbc = parseBool(r.tbc);
      if (tbc) obj.tbc = true;
      return obj;
    });

  /* dp_coordination sheet */
  const dpWs = findSheet(wb, 'dp_coordination');
  const dpRows = sheetToRows(dpWs);
  validateCols(dpRows, 'dp_coordination', REQUIRED.dp_coordination);
  const dp_coordination = dpRows
    .filter(function (r) { return r.from && r.to; })
    .map(function (r) {
      return {
        from  : String(r.from).trim(),
        to    : String(r.to).trim(),
        topic : String(r.topic || '').trim(),
      };
    });

  /* Write JSON (preserving key order) */
  const out = { donors, institutions, interventions, dp_coordination };
  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const stats = [
    donors.length + ' donors',
    institutions.length + ' institutions',
    interventions.length + ' interventions',
    dp_coordination.length + ' DP coordination flows',
  ].join(', ');

  console.log('[donors-xlsx-to-json] ' + new Date().toLocaleTimeString() + ' → donors.json (' + stats + ')');
}

/* ── Run ─────────────────────────────────────────────────────────── */
const watchMode = process.argv.includes('--watch');

try {
  convert();
} catch (err) {
  console.error('[donors-xlsx-to-json] ERROR:', err.message);
  if (!watchMode) process.exit(1);
}

if (watchMode) {
  const chokidar = require('chokidar');
  console.log('[donors-xlsx-to-json] Watching', XLSX_PATH, '...');

  let debounceTimer = null;
  chokidar.watch(XLSX_PATH, { awaitWriteFinish: { stabilityThreshold: 200 } }).on('change', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      try { convert(); } catch (err) { console.error('[donors-xlsx-to-json] ERROR:', err.message); }
    }, 200);
  });
}
