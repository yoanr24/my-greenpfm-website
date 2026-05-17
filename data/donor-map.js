// data/donor-map.js
// Donor-map interactive SVG — loaded lazily on first "Donor Map" tab activation.
// Depends on window.__RWANDA_PATH (data/rwanda-path.js loaded before this file).
// Exposes: window.__initDonorMap(donorsJson)

(function () {
  'use strict';

  /* ─── Institution sub-ID → display entity ─────────────────────── */
  const CONSOLIDATE = {
    'bnr-strategy'    : 'BNR',
    'bnr-monpol'      : 'BNR',
    'bnr-fm'          : 'BNR',
    'minecofin'       : 'MINECOFIN',
    'minecofin-debt'  : 'MINECOFIN',
    'minecofin-cfd'   : 'MINECOFIN',
    'minecofin-mfad'  : 'MINECOFIN',
    'cma'             : 'CMA',
    'rse'             : 'RSE',
    'brd'             : 'BRD',
    'bok'             : 'BoK',
    'nisr'            : 'NISR',
  };

  /* ─── Fixed visual layout  (SVG viewBox 0 0 900 540) ──────────── */
  // Donor chips: centers sit on Rwanda's border (radius 28 px, offset 30 px beyond border).
  // Border intersection computed by scripts/compute-donor-positions.js.
  const DONORS = [
    { id: 'AFD',        x: 243, y: 255, color: '#2563EB' },  // left
    { id: 'AfDB',       x: 339, y: 132, color: '#9333EA' },  // top-left
    { id: 'EIB',        x: 410, y: 113, color: '#0284C7' },  // top-center
    { id: 'GIZ',        x: 500, y: 103, color: '#16A34A' },  // top-right
    { id: 'LuxDev',     x: 623, y: 169, color: '#DC2626' },  // right-upper
    { id: 'GGGI',       x: 638, y: 269, color: '#0891B2' },  // right-middle
    { id: 'World Bank', x: 620, y: 363, color: '#1D4ED8' },  // right-lower
    { id: 'IMF',        x: 429, y: 412, color: '#0D9488' },  // bottom-center
    { id: 'EU',         x: 294, y: 452, color: '#7C3AED' },  // bottom-left
  ];

  // Beneficiary chips — spread across Rwanda's interior, verified inside polygon.
  // big:true → taller chip with larger font for primary beneficiaries.
  const BENS = [
    { id: 'NISR',      x: 345, y: 215, axis: 'B' },
    { id: 'BNR',       x: 360, y: 278, axis: 'A', big: true },
    { id: 'MINECOFIN', x: 435, y: 210, axis: 'B', big: true },
    { id: 'CMA',       x: 525, y: 250, axis: 'B' },
    { id: 'RSE',       x: 545, y: 310, axis: 'B' },
    { id: 'BRD',       x: 410, y: 350, axis: 'B' },
    { id: 'BoK',       x: 465, y: 320, axis: 'B' },
  ];

  /* ─── Status helpers ───────────────────────────────────────────── */
  const STATUS_COLOR = {
    active      : '#2E7D32',
    planned     : '#E65100',
    completed   : '#546E7A',
    exploratory : '#9E9E9E',
    tbc         : '#F9A825',
  };
  const STATUS_ICON = {
    active: '●', planned: '◐', completed: '○', exploratory: '▷', tbc: '⚑',
  };
  const STATUS_LABEL = {
    active: 'Active', planned: 'Planned', completed: 'Completed',
    exploratory: 'Exploratory', tbc: 'TBC',
  };

  /* ─── Module state ─────────────────────────────────────────────── */
  let _data = null;
  let _svg  = null;
  let _sel  = null; // { type: 'donor'|'ben', id: string } | null

  /* ─── Public API ───────────────────────────────────────────────── */
  window.__initDonorMap = function (donors) {
    if (_svg) return; // idempotent
    _data = _processData(donors);
    _render();
    // Fix layout for panels that were hidden during first paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var svgEl = document.getElementById('dmp-svg');
        if (svgEl) svgEl.dispatchEvent(new Event('resize'));
      });
    });
  };

  /* Expose deselect so inline onclick buttons can call it */
  window._dmpDeselect = function () { _deselect(); };

  /* ─── Data processing ──────────────────────────────────────────── */
  function _processData(donors) {
    // donorToMapped : { donorId → Map<benId, iv[]> }
    // benToMapped   : { benId   → Map<donorId, iv[]> }
    var donorToMapped = {};
    var benToMapped   = {};

    (donors.interventions || []).forEach(function (iv) {
      var ben = CONSOLIDATE[iv.institution];
      if (!ben) {
        if (iv.institution !== 'nisr') {
          console.warn('[donor-map] Unknown institution "' + iv.institution + '" — skipping');
        }
        return;
      }
      var donor = iv.donor;

      if (!donorToMapped[donor]) donorToMapped[donor] = new Map();
      if (!donorToMapped[donor].has(ben)) donorToMapped[donor].set(ben, []);
      donorToMapped[donor].get(ben).push(iv);

      if (!benToMapped[ben]) benToMapped[ben] = new Map();
      if (!benToMapped[ben].has(donor)) benToMapped[ben].set(donor, []);
      benToMapped[ben].get(donor).push(iv);
    });

    return {
      donorToMapped : donorToMapped,
      benToMapped   : benToMapped,
      dpCoord       : donors.dp_coordination || [],
    };
  }

  /* ─── SVG helpers ──────────────────────────────────────────────── */
  var NS = 'http://www.w3.org/2000/svg';

  function _el(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    }
    return el;
  }

  /* ─── Render ───────────────────────────────────────────────────── */
  function _render() {
    var panel = document.getElementById('donor-map-panel');
    if (!panel) return;

    var stageWrap = panel.querySelector('.dmp-stage-wrap');
    var aside     = panel.querySelector('.dmp-aside');

    /* Build SVG */
    var svg = _el('svg', {
      id                  : 'dmp-svg',
      viewBox             : '0 0 900 540',
      preserveAspectRatio : 'xMidYMid meet',
    });
    _svg = svg;

    /* Defs */
    var defs = _el('defs');
    defs.innerHTML = [
      '<filter id="dmp-shadow" x="-25%" y="-25%" width="150%" height="150%">',
        '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.22)"/>',
      '</filter>',
      '<filter id="dmp-glow" x="-50%" y="-50%" width="200%" height="200%">',
        '<feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="rgba(255,255,255,0.9)"/>',
      '</filter>',
      '<clipPath id="dmp-stage-clip">',
        '<rect x="0" y="0" width="900" height="540"/>',
      '</clipPath>',
    ].join('');
    svg.appendChild(defs);

    /* Stage background */
    svg.appendChild(_el('rect', { x:0, y:0, width:900, height:540, fill:'#EFF6FF' }));

    /* Rwanda silhouette */
    var rPath = _el('path', {
      d                : window.__RWANDA_PATH || '',
      fill             : '#A5D6A7',
      stroke           : '#388E3C',
      'stroke-width'   : '1',
      'stroke-linejoin': 'round',
    });
    svg.appendChild(rPath);

    /* Arc layer (below chips) */
    svg.appendChild(_el('g', { id:'dmp-arcs' }));

    /* Ben chips */
    BENS.forEach(function (ben) {
      var g = _buildBenChip(ben);
      g.addEventListener('click', function (e) {
        e.stopPropagation();
        _sel && _sel.type === 'ben' && _sel.id === ben.id ? _deselect() : _selectBen(ben.id);
      });
      svg.appendChild(g);
    });

    /* Donor chips */
    DONORS.forEach(function (donor) {
      var g = _buildDonorChip(donor);
      g.addEventListener('click', function (e) {
        e.stopPropagation();
        _sel && _sel.type === 'donor' && _sel.id === donor.id ? _deselect() : _selectDonor(donor.id);
      });
      svg.appendChild(g);
    });

    /* Click on SVG background → deselect */
    svg.addEventListener('click', function () { _deselect(); });

    stageWrap.insertBefore(svg, stageWrap.firstChild);
  }

  /* ─── Chip builders ─────────────────────────────────────────────── */
  function _buildDonorChip(donor) {
    var g = _el('g', {
      class           : 'dmp-chip dmp-donor-chip',
      'data-id'       : donor.id,
      transform       : 'translate(' + donor.x + ',' + donor.y + ')',
      cursor          : 'pointer',
      'aria-label'    : donor.id,
    });

    /* Circle */
    var circle = _el('circle', {
      r      : '28',
      fill   : donor.color,
      filter : 'url(#dmp-shadow)',
    });
    g.appendChild(circle);

    /* Logo <image> — try SVG then PNG; fall back to monogram */
    var logoId = donor.id.replace(/ /g, '_');
    var img = _el('image', {
      href                 : 'logos/' + logoId + '.svg',
      x:'-18', y:'-18',
      width:'36', height:'36',
      preserveAspectRatio  : 'xMidYMid meet',
    });
    var mono = _buildMonoText(donor.id);
    img.addEventListener('error', function () {
      if (img.getAttribute('href').endsWith('.svg')) {
        img.setAttribute('href', 'logos/' + logoId + '.png');
      } else {
        img.style.display = 'none';
        mono.style.display = '';
      }
    });
    img.addEventListener('load', function () {
      mono.style.display = 'none';
    });
    g.appendChild(img);
    g.appendChild(mono);

    return g;
  }

  function _buildMonoText(id) {
    var abbr = id.length <= 6 ? id : id.split(' ').map(function(w){return w[0];}).join('');
    var size = abbr.length <= 2 ? '14' : abbr.length <= 4 ? '11' : '9';
    var t = _el('text', {
      'text-anchor'       : 'middle',
      'dominant-baseline' : 'central',
      'font-size'         : size,
      'font-weight'       : '700',
      'font-family'       : 'Barlow,system-ui,sans-serif',
      fill                : '#fff',
      'user-select'       : 'none',
    });
    t.textContent = abbr;
    return t;
  }

  function _buildBenChip(ben) {
    var isA     = ben.axis === 'A';
    var bgColor = isA ? '#DBEAFE' : '#D1FAE5';
    var txColor = isA ? '#1E3A8A' : '#065F46';
    var bdColor = isA ? '#93C5FD' : '#6EE7B7';
    var textLen = ben.id.length;
    var big     = !!ben.big;
    var scale   = big ? 1.35 : 1;
    var w = Math.max(textLen * 8 * scale + 22 * scale, 50 * scale);
    var h = big ? 38 : 28;

    var g = _el('g', {
      class        : 'dmp-chip dmp-ben-chip',
      'data-id'    : ben.id,
      transform    : 'translate(' + ben.x + ',' + ben.y + ')',
      cursor       : 'pointer',
      'aria-label' : ben.id,
    });

    var rect = _el('rect', {
      x              : -w / 2,
      y              : -h / 2,
      width          : w,
      height         : h,
      rx             : big ? '10' : '8',
      fill           : bgColor,
      stroke         : bdColor,
      'stroke-width' : big ? '2.5' : '1.5',
      filter         : 'url(#dmp-shadow)',
    });
    g.appendChild(rect);

    var txt = _el('text', {
      'text-anchor'       : 'middle',
      'dominant-baseline' : 'central',
      'font-size'         : big ? '14' : '11',
      'font-weight'       : '700',
      'font-family'       : 'Barlow,system-ui,sans-serif',
      fill                : txColor,
      'user-select'       : 'none',
    });
    txt.textContent = ben.id;
    g.appendChild(txt);

    return g;
  }

  /* ─── Selection & highlight ─────────────────────────────────────── */
  function _selectDonor(id) { _sel = { type:'donor', id:id }; _updateHighlights(); }
  function _selectBen(id)   { _sel = { type:'ben',   id:id }; _updateHighlights(); }

  function _deselect() {
    _sel = null;
    _updateHighlights();
    // Also hide "Clear selection" if present
    var btn = document.getElementById('dmp-clear-btn');
    if (btn) btn.style.display = 'none';
  }

  function _updateHighlights() {
    var arcsLayer = document.getElementById('dmp-arcs');
    var panel     = document.getElementById('donor-map-panel');
    var aside     = panel && panel.querySelector('.dmp-aside');
    var hintEl    = panel && panel.querySelector('.dmp-hint');
    var clearBtn  = document.getElementById('dmp-clear-btn');

    /* Clear arcs */
    if (arcsLayer) arcsLayer.innerHTML = '';

    /* Determine connected sets */
    var connDonors = new Set();
    var connBens   = new Set();

    if (_sel) {
      if (_sel.type === 'donor') {
        connDonors.add(_sel.id);
        var benMap = _data.donorToMapped[_sel.id] || new Map();
        benMap.forEach(function (_, benId) { connBens.add(benId); });
      } else {
        connBens.add(_sel.id);
        var donorMap = _data.benToMapped[_sel.id] || new Map();
        donorMap.forEach(function (_, donorId) { connDonors.add(donorId); });
      }

      /* Draw arcs */
      connDonors.forEach(function (donorId) {
        connBens.forEach(function (benId) {
          var dm = _data.donorToMapped[donorId];
          if (!dm || !dm.has(benId)) return;
          var donor = DONORS.find(function (d) { return d.id === donorId; });
          var ben   = BENS.find(function (b) { return b.id === benId; });
          if (donor && ben && arcsLayer) {
            arcsLayer.appendChild(_buildArc(donor, ben));
          }
        });
      });
    }

    /* Dim / highlight chips */
    if (_svg) {
      _svg.querySelectorAll('.dmp-chip').forEach(function (chip) {
        chip.classList.remove('dmp-sel', 'dmp-dim');
      });

      if (_sel) {
        _svg.querySelectorAll('.dmp-donor-chip').forEach(function (chip) {
          var id = chip.getAttribute('data-id');
          chip.classList.add(connDonors.has(id) ? 'dmp-sel' : 'dmp-dim');
        });
        _svg.querySelectorAll('.dmp-ben-chip').forEach(function (chip) {
          var id = chip.getAttribute('data-id');
          chip.classList.add(connBens.has(id) ? 'dmp-sel' : 'dmp-dim');
        });
      }
    }

    /* Show/hide "Clear selection" button */
    if (clearBtn) clearBtn.style.display = _sel ? '' : 'none';
    if (hintEl)   hintEl.style.display   = _sel ? 'none' : '';

    /* Side panel */
    _renderAside(aside);
  }

  function _buildArc(donor, ben) {
    /* Quadratic bezier with control point pulled toward stage center */
    var CX = 450, CY = 270;
    var mx = (donor.x + ben.x) / 2;
    var my = (donor.y + ben.y) / 2;
    var cx = mx + (CX - mx) * 0.32;
    var cy = my + (CY - my) * 0.32;

    var arc = _el('path', {
      d              : 'M ' + donor.x + ' ' + donor.y + ' Q ' + cx + ' ' + cy + ' ' + ben.x + ' ' + ben.y,
      stroke         : donor.color,
      'stroke-width' : '2.5',
      'stroke-linecap': 'round',
      fill           : 'none',
      opacity        : '0.75',
    });

    /* Animate stroke in */
    var len = Math.hypot(ben.x - donor.x, ben.y - donor.y) * 2.0;
    arc.setAttribute('stroke-dasharray', len);
    arc.setAttribute('stroke-dashoffset', len);
    arc.style.animation = 'dmp-arc-draw 0.45s ease forwards';

    return arc;
  }

  /* ─── Side panel renderer ───────────────────────────────────────── */
  function _renderAside(asideEl) {
    if (!asideEl) return;

    if (!_sel) {
      asideEl.classList.remove('dmp-aside-open');
      asideEl.innerHTML = '';
      return;
    }

    asideEl.classList.add('dmp-aside-open');
    var html = '';

    if (_sel.type === 'donor') {
      var donorId  = _sel.id;
      var benMap   = _data.donorToMapped[donorId] || new Map();
      var cfg      = DONORS.find(function (d) { return d.id === donorId; });
      var color    = cfg ? cfg.color : '#333';
      var mono     = _monoStr(donorId);

      html += '<div class="dmp-ph">';
      html += '  <div class="dmp-ph-badge" style="background:' + color + ';">' + mono + '</div>';
      html += '  <div class="dmp-ph-info">';
      html += '    <div class="dmp-ph-title">' + _esc(donorId) + '</div>';
      html += '    <div class="dmp-ph-sub">' + benMap.size + ' beneficiar' + (benMap.size === 1 ? 'y' : 'ies') + '</div>';
      html += '  </div>';
      html += '  <button class="dmp-ph-close" onclick="window._dmpDeselect()" aria-label="Close">×</button>';
      html += '</div>';
      html += '<div class="dmp-pb">';
      benMap.forEach(function (ivs, benId) {
        html += _benGroupHtml(benId, ivs);
      });
      html += '</div>';

    } else {
      var benId    = _sel.id;
      var donorMap = _data.benToMapped[benId] || new Map();
      var benCfg   = BENS.find(function (b) { return b.id === benId; });
      var isA      = benCfg && benCfg.axis === 'A';
      var bgCol    = isA ? '#DBEAFE' : '#D1FAE5';
      var txCol    = isA ? '#1E3A8A' : '#065F46';

      html += '<div class="dmp-ph">';
      html += '  <div class="dmp-ph-badge dmp-ph-rect" style="background:' + bgCol + ';color:' + txCol + ';">' + _esc(benId) + '</div>';
      html += '  <div class="dmp-ph-info">';
      html += '    <div class="dmp-ph-title">' + _esc(benId) + '</div>';
      html += '    <div class="dmp-ph-sub">' + donorMap.size + ' donor' + (donorMap.size === 1 ? '' : 's') + '</div>';
      html += '  </div>';
      html += '  <button class="dmp-ph-close" onclick="window._dmpDeselect()" aria-label="Close">×</button>';
      html += '</div>';
      html += '<div class="dmp-pb">';
      donorMap.forEach(function (ivs, donorId) {
        var dcfg   = DONORS.find(function (d) { return d.id === donorId; });
        var dcolor = dcfg ? dcfg.color : '#333';
        html += _donorGroupHtml(donorId, dcolor, ivs);
      });
      html += '</div>';
    }

    asideEl.innerHTML = html;
  }

  function _benGroupHtml(benId, ivs) {
    var html = '<div class="dmp-group"><div class="dmp-group-hd">' + _esc(benId) + '</div>';
    ivs.forEach(function (iv) { html += _ivCardHtml(iv); });
    html += '</div>';
    return html;
  }

  function _donorGroupHtml(donorId, color, ivs) {
    var mono = _monoStr(donorId);
    var html = [
      '<div class="dmp-group">',
      '  <div class="dmp-group-hd dmp-group-hd-donor">',
      '    <span class="dmp-dbadge" style="background:' + color + ';">' + mono + '</span>',
      '    <strong>' + _esc(donorId) + '</strong>',
      '    <span class="dmp-ivcnt">' + ivs.length + '</span>',
      '  </div>',
    ].join('');
    ivs.forEach(function (iv) { html += _ivCardHtml(iv); });
    html += '</div>';
    return html;
  }

  function _ivCardHtml(iv) {
    var s  = iv.status || 'active';
    var sc = STATUS_COLOR[s] || '#9E9E9E';
    var si = STATUS_ICON[s]  || '●';
    var sl = STATUS_LABEL[s] || s;
    var tbc = iv.tbc
      ? '<span class="dmp-tbc">⚑ TBC</span>'
      : '';
    return [
      '<div class="dmp-iv">',
      '  <div class="dmp-iv-row">',
      '    <span class="dmp-iv-status" style="color:' + sc + ';">' + si + ' ' + sl + '</span>',
      '    <span class="dmp-iv-type">' + _esc(iv.type || 'TA') + '</span>',
      '  </div>',
      '  <div class="dmp-iv-lbl">' + _esc(iv.label) + tbc + '</div>',
      '</div>',
    ].join('');
  }

  /* ─── Utilities ──────────────────────────────────────────────────── */
  function _monoStr(id) {
    if (id.length <= 6) return id;
    return id.split(' ').map(function (w) { return w[0]; }).join('');
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})(); // end IIFE
