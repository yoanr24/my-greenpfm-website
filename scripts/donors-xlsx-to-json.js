// scripts/donors-xlsx-to-json.js
// Reads Updates/donors.xlsx and writes data/donors.json.
// Usage:
//   node scripts/donors-xlsx-to-json.js            # one-shot build
//   node scripts/donors-xlsx-to-json.js --watch    # rebuild on file change
//
// Schema (Updates/donors.xlsx):
//   Each sheet has row 0 = description text, row 1 = column headers, rows 2+ = data.
//   Donors:       "Donor name", "Family color"
//   Institutions: "id", "Label", "Axis (A/B)", "Pin X (0–1)", "Pin Y (0–1)"
//   Interventions:"institution_id", "Donor", "Status", "Type",
//                 "Label (shown in cell / panel)", "TBC"

'use strict';

const fs      = require('fs');
const path    = require('path');
const XLSX    = require('xlsx');

const XLSX_PATH = path.join(__dirname, '..', 'Updates', 'donors.xlsx');
const JSON_PATH = path.join(__dirname, '..', 'data', 'donors.json');

/* ── Helpers ─────────────────────────────────────────────────────── */

// Each sheet: row 0 = description, row 1 = actual headers, rows 2+ = data.
function readSheet(wb, name) {
  const lower = name.toLowerCase();
  const sheetName = wb.SheetNames.find(function (n) {
    return n.trim().toLowerCase() === lower;
  });
  if (!sheetName) throw new Error('Missing sheet "' + name + '". Found: ' + wb.SheetNames.join(', '));

  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  if (raw.length < 2) return [];

  const headers = raw[1].map(function (h) { return String(h || '').trim(); });
  const out = [];
  for (let i = 2; i < raw.length; i++) {
    const row = raw[i];
    // Skip fully-empty rows
    if (!row || row.every(function (v) { return v === '' || v === undefined || v === null; })) continue;
    const obj = {};
    headers.forEach(function (h, j) { obj[h] = row[j] !== undefined ? row[j] : ''; });
    out.push(obj);
  }
  return out;
}

function parseBool(val) {
  if (val === true || val === 1) return true;
  if (typeof val === 'string') {
    return ['true', '1', 'yes', 'y'].includes(val.trim().toLowerCase());
  }
  return false;
}

function str(v) { return String(v || '').trim(); }
function num(v) { return typeof v === 'number' ? v : parseFloat(v) || 0; }

/* ── Main conversion ─────────────────────────────────────────────── */
function convert() {
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error('File not found: ' + XLSX_PATH);
  }

  const wb = XLSX.readFile(XLSX_PATH);

  /* donors sheet → array of id strings */
  const donorRows = readSheet(wb, 'donors');
  const donors = donorRows
    .map(function (r) { return str(r['Donor name']); })
    .filter(Boolean);

  /* institutions sheet */
  const instRows = readSheet(wb, 'institutions');
  const institutions = instRows
    .filter(function (r) { return str(r['id']); })
    .map(function (r) {
      return {
        id    : str(r['id']),
        label : str(r['Label']),
        axis  : str(r['Axis (A/B)']),
        pin_x : num(r['Pin X (0–1)']),
        pin_y : num(r['Pin Y (0–1)']),
      };
    });

  /* interventions sheet */
  const ivRows = readSheet(wb, 'interventions');
  const interventions = ivRows
    .filter(function (r) { return str(r['institution_id']) && str(r['Donor']); })
    .map(function (r) {
      const obj = {
        institution : str(r['institution_id']),
        donor       : str(r['Donor']),
        status      : str(r['Status']) || 'active',
        type        : str(r['Type'])   || 'TA',
        label       : str(r['Label (shown in cell / panel)']),
      };
      if (parseBool(r['TBC'])) obj.tbc = true;
      return obj;
    });

  /* dp_coordination — not present in Updates schema; keep empty array */
  const dp_coordination = [];

  /* Write JSON */
  const out = { donors, institutions, interventions, dp_coordination };
  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const stats = [
    donors.length + ' donors',
    institutions.length + ' institutions',
    interventions.length + ' interventions',
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
