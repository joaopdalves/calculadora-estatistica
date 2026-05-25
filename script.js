
var _zBase = 50;
var _zTop  = _zBase;

var _winStack = [];

function _winRegister(id, closeFn) {
  _winStack = _winStack.filter(function(w) { return w.id !== id; });
  _winStack.push({ id: id, closeFn: closeFn });
}

function _winFocus(id) {
  var idx = _winStack.findIndex(function(w) { return w.id === id; });
  if (idx === -1) return;
  var entry = _winStack.splice(idx, 1)[0];
  _winStack.push(entry);
}

function _winRemove(id) {
  _winStack = _winStack.filter(function(w) { return w.id !== id; });
}

function bringToFront(el) {
  if (!el) return;
  _zTop++;
  el.style.zIndex = _zTop;
  var id = el.id || el.className;
  _winFocus(id);
}

var _taskbar = (function () {
  var items = [];
  var container = null;
  var isDragging = false;
  var dragId = null;
  var dragEl = null;
  var activePointerId = null;
  var DRAG_THRESHOLD = 5;
  var FLIP_MS = 260;
  var currentDropIdx = -1;
  var rafPending = false;
  var pendingX = 0;
  var baseRects = [];

  function getContainer() {
    if (!container) container = document.getElementById('taskbar-items');
    return container;
  }

  function render() {
    var c = getContainer();
    if (!c) return;
    items.forEach(function (item) { c.appendChild(item.el); });
  }

  function snapshotRects() {
    baseRects = items.map(function (item) {
      return item.el.getBoundingClientRect();
    });
  }

  function getDropIndex(clientX) {
    var dragIdx = items.findIndex(function (i) { return i.id === dragId; });
    var best = dragIdx;
    var bestDist = Infinity;
    baseRects.forEach(function (r, i) {
      if (i === dragIdx) return;
      var mid = r.left + r.width / 2;
      var d = Math.abs(clientX - mid);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function applyShifts(dropIdx) {
    var dragIdx = items.findIndex(function (i) { return i.id === dragId; });
    items.forEach(function (item, i) {
      if (i === dragIdx) return;
      var shift = 0;
      if (dragIdx < dropIdx) {
        if (i > dragIdx && i <= dropIdx) shift = -(baseRects[dragIdx].width + 4);
      } else if (dragIdx > dropIdx) {
        if (i >= dropIdx && i < dragIdx) shift = baseRects[dragIdx].width + 4;
      }
      item.el.style.transition = 'transform ' + FLIP_MS + 'ms cubic-bezier(0.4, 0, 0.2, 1)';
      item.el.style.transform = shift ? 'translateX(' + shift + 'px)' : '';
    });
  }

  function commitOrder(dragIdx, dropIdx) {
    items.forEach(function (item) {
      item.el.style.transition = 'none';
      item.el.style.transform = '';
    });
    if (dragIdx !== dropIdx && dragIdx !== -1) {
      var removed = items.splice(dragIdx, 1)[0];
      items.splice(dropIdx, 0, removed);
      render();
    }
  }

  function updateDrag(clientX) {
    var dropIdx = getDropIndex(clientX);
    if (dropIdx === currentDropIdx) return;
    currentDropIdx = dropIdx;
    applyShifts(dropIdx);
  }

  function scheduleDrag(clientX) {
    pendingX = clientX;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      if (isDragging) updateDrag(pendingX);
    });
  }

  function startDrag(id, el, pointerId) {
    dragId = id;
    dragEl = el;
    isDragging = true;
    activePointerId = pointerId;
    currentDropIdx = items.findIndex(function (i) { return i.id === id; });
    items.forEach(function (item) {
      item.el.style.transition = 'none';
      item.el.style.transform = '';
    });
    snapshotRects();
    el.classList.add('dragging');
    var c = getContainer();
    if (c) { c.style.userSelect = 'none'; c.style.webkitUserSelect = 'none'; }
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    rafPending = false;
    var drop = currentDropIdx;
    var dragIdx = items.findIndex(function (i) { return i.id === dragId; });
    currentDropIdx = -1;
    activePointerId = null;
    var el = dragEl;
    dragId = null;
    dragEl = null;
    baseRects = [];
    if (el) el.classList.remove('dragging');
    var c = getContainer();
    if (c) { c.style.userSelect = ''; c.style.webkitUserSelect = ''; }
    commitOrder(dragIdx, drop);
  }

  document.addEventListener('pointerup', function (e) {
    if (!isDragging) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    endDrag();
  });

  document.addEventListener('pointercancel', function (e) {
    if (!isDragging) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    endDrag();
  });

  function addItem(id, el) {
    if (items.find(function (i) { return i.id === id; })) return;

    var pointerDown = false;
    var downX = 0;
    var thresholdMet = false;
    var capturedPointerId = null;

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      pointerDown = true;
      thresholdMet = false;
      downX = e.clientX;
      capturedPointerId = e.pointerId;
    });

    el.addEventListener('pointermove', function (e) {
      if (!pointerDown || e.pointerId !== capturedPointerId) return;
      if (!thresholdMet) {
        if (Math.abs(e.clientX - downX) < DRAG_THRESHOLD) return;
        thresholdMet = true;
        el.setPointerCapture(e.pointerId);
        startDrag(id, el, e.pointerId);
      }
      if (!isDragging || dragId !== id) return;
      scheduleDrag(e.clientX);
    });

    el.addEventListener('pointerup', function (e) {
      if (e.pointerId !== capturedPointerId) return;
      pointerDown = false;
      thresholdMet = false;
      if (isDragging && dragId === id) endDrag();
    });

    el.addEventListener('pointercancel', function (e) {
      if (e.pointerId !== capturedPointerId) return;
      pointerDown = false;
      thresholdMet = false;
      if (isDragging && dragId === id) endDrag();
    });

    items.push({ id: id, el: el });
    render();
  }

  function removeItem(id) {
    if (isDragging && dragId === id) endDrag();
    var idx = items.findIndex(function (i) { return i.id === id; });
    if (idx === -1) return;
    var el = items[idx].el;
    if (el.parentNode) el.parentNode.removeChild(el);
    items.splice(idx, 1);
  }

  function getItem(id) {
    var found = items.find(function (i) { return i.id === id; });
    return found ? found.el : null;
  }

  return { addItem: addItem, removeItem: removeItem, getItem: getItem };
})();


const fmt = v => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return parseFloat(v).toFixed(2).replace('.', ',');
};

// ── Filtro de entrada para as textareas da calculadora descritiva ──────────
// Permite apenas: dígitos (0-9), vírgula, ponto, ponto-e-vírgula e espaços.
(function () {
  var DESC_TEXTAREAS = ['p0-input', 'p1-input', 'p2-input'];
  var ALLOWED = /^[0-9.,; \t\n\r]*$/;

  function filterValue(val) {
    // Remove qualquer caractere que não seja número, vírgula, ponto, ponto-e-vírgula ou espaço
    return val.replace(/[^0-9.,; \t\n\r]/g, '');
  }

  function attachFilter(id) {
    var el = document.getElementById(id);
    if (!el) return;

    // Bloqueia teclas não permitidas (preserva teclas de controle)
    el.addEventListener('keydown', function (e) {
      // Permite: teclas de controle (backspace, delete, arrows, tab, enter, home, end, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length > 1) return; // teclas especiais (Enter, Backspace, ArrowLeft…)
      if (!ALLOWED.test(e.key)) {
        e.preventDefault();
      }
    });

    // Sanitiza no evento input (cobre colar via teclado Ctrl+V, arrastar texto, etc.)
    el.addEventListener('input', function () {
      var sel = el.selectionStart;
      var original = el.value;
      var filtered = filterValue(original);
      if (filtered !== original) {
        var diff = original.length - filtered.length;
        el.value = filtered;
        el.selectionStart = el.selectionEnd = Math.max(0, sel - diff);
      }
    });

    // Sanitiza também no evento paste explicitamente
    el.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData).getData('text');
      var clean = filterValue(pasted);
      var start = el.selectionStart;
      var end = el.selectionEnd;
      el.value = el.value.substring(0, start) + clean + el.value.substring(end);
      el.selectionStart = el.selectionEnd = start + clean.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Aplica após o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      DESC_TEXTAREAS.forEach(attachFilter);
    });
  } else {
    DESC_TEXTAREAS.forEach(attachFilter);
  }
})();
// ──────────────────────────────────────────────────────────────────────────

function parseNumbers(str) {
  const normalized = str.replace(/[;]/g, ',').split(/[\s,]+/)
    .map(s => s.trim().replace(',', '.'))
    .filter(s => s !== '');
  return normalized.map(Number).filter(n => !isNaN(n));
}

function showError(id, msg) {
  document.getElementById(id).innerHTML = msg
    ? `<div class="msg-error">⚠️ ${msg}</div>` : '';
}

function showResults(id) {
  const el = document.getElementById(id);
  el.classList.remove('anim-in');
  void el.offsetWidth;
  el.style.display = 'block';
  el.classList.add('anim-in');
}

function switchTab(idx) {
  const body = document.querySelector('.window-body');
  body.classList.add('no-scroll');
  const descSection = document.getElementById('desc-section');
  const tabs = descSection.querySelectorAll('.tab');
  const panels = descSection.querySelectorAll('.panel');
  tabs.forEach((t, i) => t.classList.toggle('active', i === idx));
  panels.forEach((p, i) => p.classList.toggle('active', i === idx));
  setTimeout(() => body.classList.remove('no-scroll'), 230);
}

function setMode(mode) {
  const descSection = document.getElementById('desc-section');
  const infSection = document.getElementById('inf-section');
  const btnDesc = document.getElementById('mode-btn-desc');
  const btnInf = document.getElementById('mode-btn-inf');
  const subtitle = document.getElementById('app-subtitle');

  if (mode === 'desc') {
    descSection.style.display = '';
    infSection.style.display = 'none';
    btnDesc.classList.add('active');
    btnInf.classList.remove('active');
    subtitle.textContent = 'Tendência Central e Dispersão · Dados Não Agrupados e Agrupados';
  } else {
    descSection.style.display = 'none';
    infSection.style.display = '';
    btnDesc.classList.remove('active');
    btnInf.classList.add('active');
    subtitle.textContent = 'Estatística Inferencial · Distribuição de Poisson';
  }
}

function calcP0() {
  showError('p0-error', '');
  const raw = document.getElementById('p0-input').value.trim();
  if (!raw) { showError('p0-error', 'Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 2) {
    showError('p0-error', 'Insira pelo menos <b>2</b> valores numéricos.');
    document.getElementById('p0-group-hint').innerHTML = '';
    document.getElementById('p0-results').style.display = 'none';
    return;
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const mean = data.reduce((s, v) => s + v, 0) / n;
  const range = sorted[n - 1] - sorted[0];
  const std = Math.sqrt(data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);

  let median;
  if (n % 2 === 1) median = sorted[Math.floor(n / 2)];
  else median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  const freq = {};
  data.forEach(v => freq[v] = (freq[v] || 0) + 1);
  const maxF = Math.max(...Object.values(freq));
  const modes = Object.keys(freq).filter(k => freq[k] === maxF).map(Number).sort((a, b) => a - b);
  const modeStr = (new Set(Object.values(freq)).size === 1 && n > 1)
    ? 'Amodal'
    : modes.map(fmt).join(' | ');

  const p0warn = document.getElementById('p0-group-hint');
  if (n > 10) {
    const destTab = n >= 20 ? 2 : 1;
    const destLabel = n >= 20 ? 'Agrupados c/ Intervalo' : 'Agrupados s/ Intervalo';
    p0warn.innerHTML = `
      <div class="msg-info msg-info-block">
        <span style="font-size:13px;">⚠️ Seu conjunto possui <b>${n} elementos</b>. Para 11 ou mais elementos, a análise por dados não agrupados não é adequada para tabulação.</span>
        <span style="font-size:11px;opacity:0.85;">Utilize o painel <b>${destLabel}</b> para uma análise correta.</span>
        <button class="btn-redirect" onclick="switchTab(${destTab});document.getElementById('p0-group-hint').innerHTML='';">
          Ir para ${destLabel}
        </button>
      </div>`;
    document.getElementById('p0-results').style.display = 'none';
    return;
  } else {
    p0warn.innerHTML = '';
  }

  document.getElementById('p0-mean').textContent = fmt(mean);
  document.getElementById('p0-mode').textContent = modeStr;
  document.getElementById('p0-median').textContent = fmt(median);
  document.getElementById('p0-range').textContent = fmt(range);
  document.getElementById('p0-std').textContent = fmt(std);
  document.getElementById('p0-n').textContent = n;
  document.getElementById('p0-sorted').textContent = sorted.join('  ·  ');

  const sumSq = data.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
  const modeValStr = (new Set(Object.values(freq)).size === 1 && n > 1)
    ? 'Amodal (todos os valores têm a mesma frequência)'
    : modes.map(fmt).join(' | ');
  const medianNote = n % 2 === 1
    ? `elemento central (posição ${Math.floor(n / 2) + 1} do rol)`
    : `média dos elementos nas posições ${n / 2} e ${n / 2 + 1} do rol`;

  document.getElementById('p0-formulas').innerHTML = `
    <b>Média:</b> x̄ = Σxᵢ / n = ${data.reduce((s, v) => s + v, 0)} / ${n} = <b>${fmt(mean)}</b><br>
    <b>Mediana:</b> ${medianNote} → Md = <b>${fmt(median)}</b><br>
    <b>Moda:</b> valor(es) com maior frequência (f = ${maxF}) → Mo = <b>${modeValStr}</b><br>
    <b>Amplitude:</b> AT = Xmáx − Xmín = ${fmt(sorted[n - 1])} − ${fmt(sorted[0])} = <b>${fmt(range)}</b><br>
    <b>Desvio Padrão:</b> σ = √[Σ(xᵢ−x̄)² / n] = √[${fmt(sumSq)} / ${n}] = <b>${fmt(std)}</b>
  `;
  showResults('p0-results');
}

function clearP0() {
  document.getElementById('p0-input').value = '';
  document.getElementById('p0-results').style.display = 'none';
  document.getElementById('p0-group-hint').innerHTML = '';
  showError('p0-error', '');
}

function exampleP0() {
  const n = Math.floor(Math.random() * 9) + 2;
  const vals = Array.from({ length: n }, () => Math.floor(Math.random() * 30) + 1);
  document.getElementById('p0-input').value = vals.join(' ');
}

function clearP1() {
  document.getElementById('p1-input').value = '';
  document.getElementById('p1-results').style.display = 'none';
  showError('p1-error', '');
}

function exampleP1() {
  const n = Math.floor(Math.random() * 9) + 11;
  const base = Array.from({ length: Math.floor(Math.random() * 4) + 4 }, () =>
    Math.floor(Math.random() * 18) * 2 + 2
  );
  const pool = [...base];
  while (pool.length < n) pool.push(base[Math.floor(Math.random() * base.length)]);
  pool.sort((a, b) => a - b);
  document.getElementById('p1-input').value = pool.join(' ');
}

function calcP1() {
  showError('p1-error', '');
  const raw = document.getElementById('p1-input').value.trim();
  if (!raw) { showError('p1-error', 'Digite os dados.'); return; }
  const data = parseNumbers(raw);
  const n = data.length;
  if (n < 11) {
    document.getElementById('p1-error').innerHTML = `
      <div class="msg-info msg-info-block">
        <span style="font-size:13px;">⚠️ Dados insuficientes (<b>${n} elemento${n > 1 ? 's' : ''}</b>). A tabulação agrupada s/ intervalo requer entre <b>11 e 19 elementos</b>.</span>
        <span style="font-size:11px;opacity:0.85;">Utilize o painel <b>Dados Não Agrupados</b> para uma análise correta.</span>
        <button class="btn-redirect" onclick="switchTab(0);document.getElementById('p1-error').innerHTML='';">
          Ir para Dados Não Agrupados
        </button>
      </div>`;
    document.getElementById('p1-results').style.display = 'none';
    return;
  }
  if (n >= 20) {
    document.getElementById('p1-error').innerHTML = `
      <div class="msg-info msg-info-block">
        <span style="font-size:13px;">⚠️ Seu conjunto possui <b>${n} elementos</b>. Para 20 ou mais elementos, a análise agrupada s/ intervalo não é adequada para tabulação.</span>
        <span style="font-size:11px;opacity:0.85;">Utilize o painel <b>Agrupados c/ Intervalo</b> para uma análise correta.</span>
        <button class="btn-redirect" onclick="switchTab(2);document.getElementById('p1-error').innerHTML='';">
          Ir para Agrupados c/ Intervalo
        </button>
      </div>`;
    document.getElementById('p1-results').style.display = 'none';
    return;
  }

  const freqMap = {};
  data.forEach(v => freqMap[v] = (freqMap[v] || 0) + 1);
  const vals = Object.keys(freqMap).map(Number).sort((a, b) => a - b);
  const freqs = vals.map(v => freqMap[v]);

  const rol = [];
  vals.forEach((v, i) => { for (let j = 0; j < freqs[i]; j++) rol.push(v); });
  document.getElementById('p1-sorted').textContent = rol.join('  ·  ');
  const sumXF = vals.reduce((s, v, i) => s + v * freqs[i], 0);
  const mean = sumXF / n;
  const range = vals[vals.length - 1] - vals[0];
  const std = Math.sqrt(vals.reduce((s, v, i) => s + freqs[i] * Math.pow(v - mean, 2), 0) / n);

  let cum = 0;
  let median = vals[0];
  const half = n / 2;
  for (let i = 0; i < vals.length; i++) {
    cum += freqs[i];
    if (cum >= half) { median = vals[i]; break; }
  }

  const maxF = Math.max(...freqs);
  const allSame = new Set(freqs).size === 1;
  const modeStr = allSame
    ? 'Amodal'
    : vals.filter((_, i) => freqs[i] === maxF).map(fmt).join(' | ');

  document.getElementById('p1-mean').textContent = fmt(mean);
  document.getElementById('p1-mode').textContent = modeStr;
  document.getElementById('p1-median').textContent = fmt(median);
  document.getElementById('p1-range').textContent = fmt(range);
  document.getElementById('p1-std').textContent = fmt(std);
  document.getElementById('p1-n').textContent = n;

  let body = '';
  let sumDev = 0;
  let cumT = 0;
  let sxf = 0;

  vals.forEach((v, i) => {
    cumT += freqs[i];
    const xf = v * freqs[i];
    const dev = freqs[i] * Math.pow(v - mean, 2);
    sxf += xf;
    sumDev += dev;
    body += `<tr><td>${fmt(v)}</td><td>${freqs[i]}</td><td>${cumT}</td><td>${fmt(xf)}</td><td>${fmt(dev)}</td></tr>`;
  });

  document.getElementById('p1-detail-body').innerHTML = body;
  document.getElementById('p1-detail-foot').innerHTML =
    `<tr><td><b>Σ</b></td><td><b>${n}</b></td><td>—</td><td><b>${fmt(sxf)}</b></td><td><b>${fmt(sumDev)}</b></td></tr>`;

  const modeValStr = allSame ? 'Amodal (todas as frequências são iguais)' : modeStr;
  document.getElementById('p1-formulas').innerHTML = `
    <b>Média:</b> x̄ = Σ(xᵢ·fᵢ) / Σfᵢ = ${fmt(sxf)} / ${n} = <b>${fmt(mean)}</b><br>
    <b>Mediana:</b> valor de xᵢ onde F ≥ n/2 = ${fmt(half)} → Md = <b>${fmt(median)}</b><br>
    <b>Moda:</b> valor(es) com maior frequência (fᵢ = ${maxF}) → Mo = <b>${modeValStr}</b><br>
    <b>Amplitude:</b> AT = Xmáx − Xmín = ${fmt(vals[vals.length - 1])} − ${fmt(vals[0])} = <b>${fmt(range)}</b><br>
    <b>Desvio Padrão:</b> σ = √[Σfᵢ(xᵢ−x̄)² / n] = √[${fmt(sumDev)} / ${n}] = <b>${fmt(std)}</b>
  `;
  showResults('p1-results');
}

function clearP2() {
  document.getElementById('p2-input').value = '';
  document.getElementById('p2-nclasses').value = '';
  document.getElementById('p2-results').style.display = 'none';
  showError('p2-error', '');
}

function exampleP2() {
  const n = Math.floor(Math.random() * 16) + 20;
  const min = Math.floor(Math.random() * 20) + 5;
  const spread = Math.floor(Math.random() * 60) + 40;
  const vals = Array.from({ length: n }, () => Math.floor(Math.random() * spread) + min);
  vals.sort((a, b) => a - b);
  document.getElementById('p2-input').value = vals.join(' ');
  document.getElementById('p2-nclasses').value = '';
}

function calcP2() {
  showError('p2-error', '');
  const raw = document.getElementById('p2-input').value.trim();
  if (!raw) { showError('p2-error', 'Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 20) {
    const _destTab = data.length < 11 ? 0 : 1;
    const _destLabel = data.length < 11 ? 'Dados Não Agrupados' : 'Agrupados s/ Intervalo';
    document.getElementById('p2-error').innerHTML = `
      <div class="msg-info msg-info-block">
        <span style="font-size:13px;">⚠️ Seu conjunto possui <b>${data.length} elemento${data.length > 1 ? 's' : ''}</b>. Para agrupados c/ intervalo são necessários <b>20 ou mais elementos</b>.</span>
        <span style="font-size:11px;opacity:0.85;">Utilize o painel <b>${_destLabel}</b> para uma análise correta.</span>
        <button class="btn-redirect" onclick="switchTab(${_destTab});document.getElementById('p2-error').innerHTML='';">
          Ir para ${_destLabel}
        </button>
      </div>`;
    document.getElementById('p2-results').style.display = 'none';
    return;
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const dataMin = sorted[0];
  const dataMax = sorted[n - 1];

  document.getElementById('p2-sorted').textContent = sorted.join('  ·  ');

  let k = parseInt(document.getElementById('p2-nclasses').value);
  if (isNaN(k) || k < 2) k = Math.ceil(1 + 3.322 * Math.log10(n));
  if (k > 20) k = 20;

  const rawH = (dataMax - dataMin) / k;
  const mag = Math.pow(10, Math.floor(Math.log10(rawH)));
  const h = Math.ceil(rawH / mag) * mag;

  const cls = [];
  for (let i = 0; i < k; i++) {
    const li = dataMin + i * h;
    const ls = li + h;
    const f = sorted.filter(v => v >= li && v < ls).length;
    const fAdj = (i === k - 1) ? sorted.filter(v => v >= li && v <= ls).length : f;
    if (i < k - 1 || fAdj > 0) cls.push({ li, ls, f: i === k - 1 ? fAdj : f, m: (li + ls) / 2 });
  }

  while (cls.length > 1 && cls[cls.length - 1].f === 0) cls.pop();

  const freqs = cls.map(c => c.f);
  const mids = cls.map(c => c.m);
  const nTotal = freqs.reduce((a, b) => a + b, 0);
  const sumMF = mids.reduce((s, m, i) => s + m * freqs[i], 0);
  const mean = sumMF / nTotal;
  const sumDev = mids.reduce((s, m, i) => s + freqs[i] * Math.pow(m - mean, 2), 0);
  const std = Math.sqrt(sumDev / nTotal);
  const range = dataMax - dataMin;

  const half = nTotal / 2;
  let cumBefore = 0;
  let mc = null;
  for (const c of cls) {
    if (cumBefore + c.f >= half) { mc = { ...c, cumBefore }; break; }
    cumBefore += c.f;
  }
  const hMc = mc.ls - mc.li;
  const median = mc.li + ((half - mc.cumBefore) / mc.f) * hMc;

  const maxF = Math.max(...freqs);
  const moIdx = freqs.indexOf(maxF);
  let mo;
  if (moIdx === 0 || moIdx === freqs.length - 1) {
    mo = cls[moIdx].m;
  } else {
    const d1 = maxF - freqs[moIdx - 1];
    const d2 = maxF - freqs[moIdx + 1];
    const hm = cls[moIdx].ls - cls[moIdx].li;
    mo = cls[moIdx].li + (d1 / (d1 + d2)) * hm;
  }

  document.getElementById('p2-mean').textContent = fmt(mean);
  document.getElementById('p2-mode').textContent = fmt(mo);
  document.getElementById('p2-median').textContent = fmt(median);
  document.getElementById('p2-range').textContent = fmt(range);
  document.getElementById('p2-std').textContent = fmt(std);
  document.getElementById('p2-n').textContent = nTotal;

  let body = '';
  let cumT = 0;
  let sMF = 0;
  let sDev = 0;

  cls.forEach(c => {
    cumT += c.f;
    const mf = c.m * c.f;
    const dv = c.f * Math.pow(c.m - mean, 2);
    sMF += mf;
    sDev += dv;
    body += `<tr><td>[${fmt(c.li)} – ${fmt(c.ls)}[</td><td>${fmt(c.m)}</td><td>${c.f}</td><td>${cumT}</td><td>${fmt(mf)}</td><td>${fmt(dv)}</td></tr>`;
  });

  document.getElementById('p2-detail-body').innerHTML = body;
  document.getElementById('p2-detail-foot').innerHTML =
    `<tr><td><b>Σ</b></td><td>—</td><td><b>${nTotal}</b></td><td>—</td><td><b>${fmt(sMF)}</b></td><td><b>${fmt(sDev)}</b></td></tr>`;

  const kUser = parseInt(document.getElementById('p2-nclasses').value);
  const kInfo = (isNaN(kUser) || kUser < 2)
    ? `${cls.length} classes (Regra de Sturges: k = 1 + 3,322·log₁₀(${n}) ≈ ${cls.length})`
    : `${cls.length} classes (definido pelo usuário)`;

  document.getElementById('p2-formulas').innerHTML = `
    <b>Classes geradas:</b> ${kInfo} · amplitude h = ${fmt(h)}<br>
    <b>Média:</b> x̄ = Σ(mᵢ·fᵢ) / Σfᵢ = ${fmt(sMF)} / ${nTotal} = <b>${fmt(mean)}</b><br>
    <b>Mediana:</b> Md = lᵢ + [(n/2 − F) / fᵢ] · h = ${fmt(mc.li)} + [(${fmt(half)} − ${mc.cumBefore}) / ${mc.f}] · ${fmt(hMc)} = <b>${fmt(median)}</b><br>
    <b>Moda (Czuber):</b> classe modal [${fmt(cls[moIdx].li)} – ${fmt(cls[moIdx].ls)}[  →  Mo = <b>${fmt(mo)}</b><br>
    <b>Amplitude:</b> AT = L<sub>k</sub> − l₁ = ${fmt(cls[cls.length - 1].ls)} − ${fmt(cls[0].li)} = <b>${fmt(range)}</b><br>
    <b>Desvio Padrão:</b> σ = √[Σfᵢ(mᵢ−x̄)² / n] = √[${fmt(sDev)} / ${nTotal}] = <b>${fmt(std)}</b>
  `;
  showResults('p2-results');
}

function poissonFatorial(n) {
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function _logFatorial(n) {
  // Calcula log(n!) somando logaritmos — nunca estoura independente do valor de n
  let r = 0;
  for (let i = 2; i <= n; i++) r += Math.log(i);
  return r;
}

function poissonP(lambda, k) {
  if (lambda === 0) return k === 0 ? 1 : 0;
  // Calcula em escala logarítmica para evitar overflow com λ ou k grandes:
  // log P(X=k) = -λ + k·log(λ) - log(k!)
  const logP = -lambda + k * Math.log(lambda) - _logFatorial(k);
  return Math.exp(logP);
}

function poissonAtMost(lambda, k) {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += poissonP(lambda, i);
    // Saída antecipada: quando a soma já convergiu para 1 com precisão de 10 casas,
    // continuar somando não muda o resultado — evita travar com k absurdamente grande
    if (sum >= 1 - 1e-10) return 1;
  }
  return sum;
}

function poissonAtLeast(lambda, k) {
  return 1 - poissonAtMost(lambda, k - 1);
}

function fmtProb(v) {
  return v.toFixed(6).replace('.', ',');
}

function fmtPct(v) {
  return (v * 100).toFixed(4).replace('.', ',') + '%';
}

function toggleAdjuste() {
  const sec = document.getElementById('poisson-adj-section');
  const btn = document.getElementById('adj-toggle');
  const open = !sec.classList.contains('adj-open');
  sec.classList.toggle('adj-open', open);
  btn.classList.toggle('adj-active', open);
}

function toggleIntervalo() {
  const op = document.getElementById('p3-op').value;
  const k2Group = document.getElementById('p3-k2-group');
  const kLabel = document.getElementById('p3-k-label');
  const kHint = document.getElementById('p3-k-hint');
  if (op === 'between') {
    k2Group.style.display = '';
    kLabel.innerHTML = 'Limite inferior (a) <span class="th-tip" data-tip="Início do intervalo&#10;Deve ser inteiro não negativo">?</span>';
    kHint.textContent = '💡 Valor inteiro não negativo — início do intervalo.';
  } else {
    k2Group.style.display = 'none';
    kLabel.innerHTML = 'Ocorrências desejadas (k) <span class="th-tip" data-tip="Número de ocorrências a calcular&#10;Deve ser inteiro não negativo (0, 1, 2, ...)">?</span>';
    kHint.textContent = '💡 Valor inteiro não negativo (0, 1, 2, 3 ...).';
  }
  document.getElementById('p3-results').style.display = 'none';
  showError('p3-error', '');
}

function clearPoisson() {
  document.getElementById('p3-lambda').value = '';
  document.getElementById('p3-k').value = '';
  document.getElementById('p3-k2').value = '';
  document.getElementById('p3-op').value = 'exact';
  document.getElementById('p3-int-base').value = '';
  document.getElementById('p3-int-target').value = '';
  document.getElementById('p3-results').style.display = 'none';
  document.getElementById('p3-example-note').style.display = 'none';
  showError('p3-error', '');
  const sec = document.getElementById('poisson-adj-section');
  const btn = document.getElementById('adj-toggle');
  sec.classList.remove('adj-open');
  btn.classList.remove('adj-active');
  toggleIntervalo();
}

const POISSON_EXAMPLES = [
  {
    lambda: 3,
    k: 5,
    op: 'exact',
    base: '',
    target: '',
    k2: '',
    note: '📋 Exemplo: Uma central recebe em média 3 ligações por minuto. Qual a probabilidade de receber exatamente 5 ligações em um minuto?'
  },
  {
    lambda: 2,
    k: 3,
    op: 'atmost',
    base: '',
    target: '',
    k2: '',
    note: '📋 Exemplo: Uma padaria vende em média 2 bolos especiais por dia. Qual a probabilidade de vender no máximo 3 bolos em um dia?'
  },
  {
    lambda: 4,
    k: 2,
    op: 'atleast',
    base: '',
    target: '',
    k2: '',
    note: '📋 Exemplo: Um hospital registra em média 4 emergências por hora. Qual a probabilidade de ocorrer pelo menos 2 emergências em uma hora?'
  },
  {
    lambda: 5,
    k: 3,
    op: 'between',
    base: '',
    target: '',
    k2: 7,
    note: '📋 Exemplo: Uma loja recebe em média 5 clientes por hora. Qual a probabilidade de atender entre 3 e 7 clientes em uma hora?'
  }
];

let _lastExampleIdx = -1;

function examplePoisson() {
  let idx;
  do { idx = Math.floor(Math.random() * POISSON_EXAMPLES.length); } while (idx === _lastExampleIdx && POISSON_EXAMPLES.length > 1);
  _lastExampleIdx = idx;
  const ex = POISSON_EXAMPLES[idx];

  document.getElementById('p3-lambda').value = ex.lambda;
  document.getElementById('p3-k').value = ex.k;
  document.getElementById('p3-op').value = ex.op;
  document.getElementById('p3-k2').value = ex.k2 || '';

  toggleIntervalo();

  const sec = document.getElementById('poisson-adj-section');
  const btn = document.getElementById('adj-toggle');

  if (ex.base) {
    document.getElementById('p3-int-base').value = ex.base;
    document.getElementById('p3-int-target').value = ex.target;
    sec.classList.add('adj-open');
    btn.classList.add('adj-active');
  } else {
    document.getElementById('p3-int-base').value = '';
    document.getElementById('p3-int-target').value = '';
    sec.classList.remove('adj-open');
    btn.classList.remove('adj-active');
  }

  const noteEl = document.getElementById('p3-example-note');
  noteEl.textContent = ex.note;
  noteEl.style.display = 'block';

  showError('p3-error', '');
  document.getElementById('p3-results').style.display = 'none';
}

function calcPoisson() {
  showError('p3-error', '');

  const lambdaStr = document.getElementById('p3-lambda').value.trim().replace(',', '.');
  const kStr = document.getElementById('p3-k').value.trim();
  const k2Str = document.getElementById('p3-k2') ? document.getElementById('p3-k2').value.trim() : '';
  const op = document.getElementById('p3-op').value;
  const baseRaw = parseFloat(document.getElementById('p3-int-base').value.replace(',', '.'));
  const targetRaw = parseFloat(document.getElementById('p3-int-target').value.replace(',', '.'));

  // Limites máximos compatíveis com Estatística Aplicada
  const LAMBDA_MAX = 100;
  const K_MAX = 100;

  // Validação λ: aceita 0 ou positivo até LAMBDA_MAX
  const lambdaRaw = parseFloat(lambdaStr);
  if (lambdaStr === '' || isNaN(lambdaRaw) || lambdaRaw < 0) {
    showError('p3-error', 'Informe uma taxa média λ válida (número ≥ 0).');
    return;
  }
  if (lambdaRaw > LAMBDA_MAX) {
    showError('p3-error', `A taxa média λ deve ser no máximo ${LAMBDA_MAX}. Valores acima disso estão fora do escopo da disciplina.`);
    return;
  }

  // Validação k: rejeita decimais na string bruta (Caso #12 corrigido)
  if (kStr === '' || isNaN(Number(kStr)) || kStr.includes('.') || kStr.includes(',')) {
    showError('p3-error', 'Informe um número de ocorrências k válido (inteiro ≥ 0).');
    return;
  }
  const kRaw = parseInt(kStr, 10);
  if (kRaw < 0) {
    showError('p3-error', 'Informe um número de ocorrências k válido (inteiro ≥ 0).');
    return;
  }
  if (kRaw > K_MAX) {
    showError('p3-error', `O número de ocorrências k deve ser no máximo ${K_MAX}. Valores acima disso estão fora do escopo da disciplina.`);
    return;
  }

  // Validação k2 (apenas no modo intervalo)
  let k2Raw = 0;
  if (op === 'between') {
    if (k2Str === '' || isNaN(Number(k2Str)) || k2Str.includes('.') || k2Str.includes(',')) {
      showError('p3-error', 'Informe o limite superior b válido (inteiro ≥ a).');
      return;
    }
    k2Raw = parseInt(k2Str, 10);
    if (k2Raw < kRaw) {
      showError('p3-error', 'O limite superior b deve ser maior ou igual a k (a).');
      return;
    }
    if (k2Raw > K_MAX) {
      showError('p3-error', `O limite superior b deve ser no máximo ${K_MAX}. Valores acima disso estão fora do escopo da disciplina.`);
      return;
    }
  }

  let lambda = lambdaRaw;
  let ajusteInfo = '';

  const hasBase = !isNaN(baseRaw) && baseRaw > 0;
  const hasTarget = !isNaN(targetRaw) && targetRaw > 0;

  if (hasBase && hasTarget) {
    lambda = lambdaRaw * (targetRaw / baseRaw);
    if (lambda > LAMBDA_MAX) {
      showError('p3-error', `O λ ajustado resultante (${lambda.toFixed(2).replace('.', ',')}) ultrapassa o limite de ${LAMBDA_MAX}. Reduza a taxa ou o intervalo alvo.`);
      return;
    }
    ajusteInfo = `λ ajustado = ${lambdaRaw} × (${targetRaw} / ${baseRaw}) = <b>${lambda.toFixed(4).replace('.', ',')}</b><br>`;
  } else if (hasBase !== hasTarget) {
    showError('p3-error', 'Preencha os dois campos de intervalo (base e alvo) ou deixe ambos em branco.');
    return;
  }

  const k = kRaw;

  let prob;
  let labelText;
  let stepsHtml = '';

  const eMinusL = Math.exp(-lambda);
  // Para exibicao no passo a passo: se os valores intermediarios estouram,
  // mostra texto em vez de Infinity ou NaN
  const lambdaKRaw = Math.pow(lambda, k);
  const lambdaK = isFinite(lambdaKRaw) ? lambdaKRaw : null;
  const kFatRaw = poissonFatorial(k);
  const kFat = isFinite(kFatRaw) ? kFatRaw : null;
  const _fmt6 = v => (v !== null && isFinite(v)) ? v.toFixed(6).replace('.', ',') : '(número muito grande)';
  const pExact = poissonP(lambda, k);

  const formulaBase = `P(X = k) = (e<sup>−λ</sup> · λ<sup>k</sup>) / k!`;

  // Aviso especial para λ=0
  const lambdaZeroNote = lambda === 0
    ? `<br><span style="font-size:11px;color:#7a9acc;">ℹ️ λ = 0: processo sem ocorrências esperadas (caso degenerado válido).</span>`
    : '';

  if (op === 'exact') {
    prob = pExact;
    labelText = `P(X = ${k})`;
    stepsHtml = `
      ${ajusteInfo}
      <b>Fórmula:</b> ${formulaBase}<br>
      <b>Substituindo:</b> P(X = ${k}) = (e<sup>−${lambda.toFixed(4).replace('.', ',')}</sup> · ${lambda.toFixed(4).replace('.', ',')} <sup>${k}</sup>) / ${k}!<br>
      <b>e<sup>−λ</sup></b> = e<sup>−${lambda.toFixed(4).replace('.', ',')}</sup> = ${eMinusL.toFixed(6).replace('.', ',')}<br>
      <b>λ<sup>k</sup></b> = ${lambda.toFixed(4).replace('.', ',')} <sup>${k}</sup> = ${_fmt6(lambdaK)}<br>
      <b>k!</b> = ${k}! = ${kFat !== null ? kFat : '(número muito grande)'}<br>
      <b>P(X = ${k})</b> = calculado via escala logarítmica = <b>${fmtProb(prob)}</b>${lambdaZeroNote}
    `;
  } else if (op === 'atmost') {
    prob = poissonAtMost(lambda, k);
    labelText = `P(X ≤ ${k})`;
    const STEP_MAX = 20;
    let partes = [];
    for (let i = 0; i <= Math.min(k, STEP_MAX - 1); i++) {
      const pi = poissonP(lambda, i);
      partes.push(`P(X=${i}) = ${fmtProb(pi)}`);
    }
    const truncNote = k >= STEP_MAX ? `<br>&nbsp;&nbsp;<i>... (${k - STEP_MAX + 1} parcelas omitidas para não travar o navegador)</i>` : '';
    stepsHtml = `
      ${ajusteInfo}
      <b>Fórmula:</b> P(X ≤ ${k}) = Σ P(X = i) para i = 0 até ${k}<br>
      <b>Parcelas:</b><br>
      ${partes.map(p => '&nbsp;&nbsp;' + p).join('<br>')}${truncNote}<br>
      <b>Resultado:</b> <b>${fmtProb(prob)}</b>${lambdaZeroNote}
    `;
  } else if (op === 'atleast') {
    prob = poissonAtLeast(lambda, k);
    labelText = `P(X ≥ ${k})`;
    const complement = poissonAtMost(lambda, k - 1);
    const STEP_MAX = 20;
    let partes = [];
    for (let i = 0; i <= Math.min(k - 1, STEP_MAX - 1); i++) {
      const pi = poissonP(lambda, i);
      partes.push(`P(X=${i}) = ${fmtProb(pi)}`);
    }
    const truncNoteAl = (k - 1) >= STEP_MAX ? `<br>&nbsp;&nbsp;<i>... (${k - 1 - STEP_MAX + 1} parcelas omitidas para não travar o navegador)</i>` : '';
    stepsHtml = `
      ${ajusteInfo}
      <b>Fórmula:</b> P(X ≥ ${k}) = 1 − P(X ≤ ${k - 1})<br>
      <b>Parcelas de P(X ≤ ${k - 1}):</b><br>
      ${k === 0 ? '&nbsp;&nbsp;(nenhuma — P(X ≤ −1) = 0)' : partes.map(p => '&nbsp;&nbsp;' + p).join('<br>') + truncNoteAl}<br>
      <b>P(X ≤ ${k - 1})</b> = ${fmtProb(complement)}<br>
      <b>P(X ≥ ${k})</b> = 1 − ${fmtProb(complement)} = <b>${fmtProb(prob)}</b>${lambdaZeroNote}
    `;
  } else if (op === 'between') {
    const b = k2Raw;
    const pLeqB = poissonAtMost(lambda, b);
    const pLeqAm1 = k > 0 ? poissonAtMost(lambda, k - 1) : 0;
    prob = pLeqB - pLeqAm1;
    labelText = `P(${k} ≤ X ≤ ${b})`;
    const STEP_MAX = 20;
    let partes = [];
    for (let i = k; i <= Math.min(b, k + STEP_MAX - 1); i++) {
      const pi = poissonP(lambda, i);
      partes.push(`P(X=${i}) = ${fmtProb(pi)}`);
    }
    const truncNoteBt = (b - k + 1) > STEP_MAX ? `<br>&nbsp;&nbsp;<i>... (${b - k + 1 - STEP_MAX} parcelas omitidas para não travar o navegador)</i>` : '';
    stepsHtml = `
      ${ajusteInfo}
      <b>Fórmula:</b> P(${k} ≤ X ≤ ${b}) = P(X ≤ ${b}) − P(X ≤ ${k - 1})<br>
      <b>Equivalente a:</b> Σ P(X = i) para i = ${k} até ${b}<br>
      <b>Parcelas:</b><br>
      ${partes.map(p => '&nbsp;&nbsp;' + p).join('<br>')}${truncNoteBt}<br>
      <b>Resultado:</b> <b>${fmtProb(prob)}</b>${lambdaZeroNote}
    `;
  }

  document.getElementById('p3-result-label').textContent = labelText;
  document.getElementById('p3-result-value').textContent = fmtProb(prob) + '  (' + fmtPct(prob) + ')';
  document.getElementById('p3-steps').innerHTML = stepsHtml;

  const TABLE_MAX = 200;
  const tableLimit = Math.min(Math.max((op === 'between' ? k2Raw : k) + 4, 10), TABLE_MAX);
  let distBody = '';
  let runningSum = 0;
  for (let i = 0; i <= tableLimit; i++) {
    const pi = poissonP(lambda, i);
    runningSum += pi;
    let highlight = false;
    if (op === 'exact' && i === k) highlight = true;
    if (op === 'atmost' && i <= k) highlight = true;
    if (op === 'atleast' && i >= k) highlight = true;
    if (op === 'between' && i >= k && i <= k2Raw) highlight = true;
    distBody += `<tr${highlight ? ' class="highlight-row"' : ''}>
      <td>${i}</td>
      <td>${fmtProb(pi)}</td>
      <td>${fmtPct(pi)}</td>
    </tr>`;
    if (i > tableLimit && runningSum > 0.9999) break;
  }
  document.getElementById('p3-dist-body').innerHTML = distBody;

  showResults('p3-results');
}

function rmRow(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function tick() {
  const now = new Date();
  document.getElementById('clock').innerHTML =
    now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '<br>' +
    '<span style="font-size:10px">' + now.toLocaleDateString('pt-BR') + '</span>';
}

(() => { tick(); setInterval(tick, 10000); })();

(function () {
  const win = document.querySelector('.window');
  win.addEventListener('mousedown', function () { bringToFront(win); }, true);
  const desktopIcon = document.getElementById('desktop-icon');
  let isMaximized = false;
  let isMinimized = false;
  let isClosed = false;

  const ANIMS = ['anim-open', 'anim-close', 'anim-minimize', 'anim-restore', 'anim-maximize', 'anim-unmaximize'];

  function clearAnims() {
    win.classList.remove(...ANIMS);
  }

  function playAnim(cls, duration, after) {
    clearAnims();
    void win.offsetWidth;
    win.classList.add(cls);
    bringToFront(win);
    var animZ = _zTop + 1000;
    win.style.zIndex = animZ;
    setTimeout(() => {
      clearAnims();
      bringToFront(win);
      if (after) after();
    }, duration);
  }

  function getBtn() { return _taskbar.getItem('calc-taskbar'); }

  function createTaskbarBtn() {
    var btn = document.createElement('div');
    btn.className = 'taskbar-app';
    btn.innerHTML = '<img src="imagens/beta.png" width="16" height="16" style="object-fit:contain;display:inline-block;vertical-align:middle;border-radius:3px;"> Calculadora Estatística';
    btn.addEventListener('click', function () {
      if (isClosed) return;
      if (isMinimized) {
        isMinimized = false;
        win.classList.remove('minimized');
        btn.style.opacity = '1';
        btn.title = '';
        
        playAnim('anim-restore', 230, null);
      }
      bringToFront(win);
      win.focus && win.focus();
    });
    return btn;
  }

  win.style.display = '';
  playAnim('anim-open', 230, null);
  _winRegister('calc-window', function () { if (!isClosed) window._closeCalc(); });

  var initialBtn = createTaskbarBtn();
  _taskbar.addItem('calc-taskbar', initialBtn);

  document.querySelector('.win-btn-min').addEventListener('click', () => {
    if (isClosed || isMinimized) return;
    playAnim('anim-minimize', 210, () => {
      isMinimized = true;
      win.classList.add('minimized');
    });
    var btn = getBtn();
    if (btn) { btn.style.opacity = '0.55'; btn.title = 'Clique para restaurar';  }
  });

  document.querySelector('.win-btn-max').addEventListener('click', () => {
    if (isClosed) return;
    const calcMaxIcon = document.getElementById('calc-max-icon');
    if (!isMaximized) {
      clearAnims();
      void win.offsetWidth;
      win.classList.add('maximized', 'anim-maximize');
      setTimeout(() => { clearAnims(); }, 200);
      if (calcMaxIcon) calcMaxIcon.classList.add('restore');
    } else {
      win.classList.remove('maximized');
      clearAnims();
      void win.offsetWidth;
      win.classList.add('anim-unmaximize');
      setTimeout(() => { clearAnims(); }, 180);
      if (calcMaxIcon) calcMaxIcon.classList.remove('restore');
    }
    isMaximized = !isMaximized;
  });

  document.querySelector('.win-btn-close').addEventListener('click', () => {
    if (isClosed) return;
    playAnim('anim-close', 190, () => {
      isClosed = true;
      isMinimized = false;
      isMaximized = false;
      win.classList.remove('minimized', 'maximized');
      win.style.display = 'none';
      _taskbar.removeItem('calc-taskbar');
      desktopIcon.classList.remove('hidden');
      _winRemove('calc-window');
      const calcMaxIcon = document.getElementById('calc-max-icon');
      if (calcMaxIcon) calcMaxIcon.classList.remove('restore');
    });
  });

  let clickCount = 0;
  let clickTimer = null;

  desktopIcon.addEventListener('click', () => {
    desktopIcon.classList.add('selected');
    clickCount++;
    if (clickCount === 1) {
      clickTimer = setTimeout(() => { clickCount = 0; }, 400);
    } else if (clickCount >= 2) {
      clearTimeout(clickTimer);
      clickCount = 0;
      isClosed = false;
      desktopIcon.classList.remove('selected');
      desktopIcon.classList.add('hidden');
      win.style.display = '';
      win.classList.remove('minimized', 'maximized');
      isMinimized = false;
      isMaximized = false;
      var btn = createTaskbarBtn();
      _taskbar.addItem('calc-taskbar', btn);
      _winRegister('calc-window', function () { if (!isClosed) window._closeCalc(); });
      playAnim('anim-open', 230, null);
    }
  });

  document.addEventListener('click', (e) => {
    if (!desktopIcon.contains(e.target)) {
      desktopIcon.classList.remove('selected');
    }
  });

  window.openCalculadora = function () {
    if (isClosed) {
      isClosed = false;
      desktopIcon.classList.add('hidden');
      win.style.display = '';
      win.classList.remove('minimized', 'maximized');
      isMinimized = false;
      isMaximized = false;
      var btn = createTaskbarBtn();
      _taskbar.addItem('calc-taskbar', btn);
      _winRegister('calc-window', function () { if (!isClosed) window._closeCalc(); });
      playAnim('anim-open', 230, null);
    } else if (isMinimized) {
      isMinimized = false;
      win.classList.remove('minimized');
      var btn = getBtn();
      if (btn) { btn.style.opacity = '1'; btn.title = '';  }
      playAnim('anim-restore', 230, null);
    } else {
      bringToFront(win);
    }
  };

  window._closeCalc = function () {
    if (isClosed) return;
    _winRemove('calc-window');
    playAnim('anim-close', 190, () => {
      isClosed = true;
      isMinimized = false;
      isMaximized = false;
      win.classList.remove('minimized', 'maximized');
      win.style.display = 'none';
      _taskbar.removeItem('calc-taskbar');
      desktopIcon.classList.remove('hidden');
      const calcMaxIcon = document.getElementById('calc-max-icon');
      if (calcMaxIcon) calcMaxIcon.classList.remove('restore');
    });
  };
})();

const startBtn = document.querySelector('.start-btn');
const startMenu = document.getElementById('start-menu');
const startMenuOverlay = document.getElementById('start-menu-overlay');

function openStartMenu() {
  startMenu.classList.add('open');
  startMenuOverlay.classList.add('active');
}

function closeStartMenu() {
  if (!startMenu.classList.contains('open')) return;
  startMenu.classList.remove('open');
  startMenu.classList.add('closing');
  startMenuOverlay.classList.remove('active');
  setTimeout(() => { startMenu.classList.remove('closing'); }, 150);
}

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (startMenu.classList.contains('open')) {
    closeStartMenu();
  } else {
    openStartMenu();
  }
});

startMenuOverlay.addEventListener('click', closeStartMenu);

(function () {
  const wallpaperEl = document.createElement('img');
  wallpaperEl.id = 'wallpaper-bg';
  wallpaperEl.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;z-index:-1;display:none;pointer-events:none;transition:opacity 0.4s ease;opacity:0;';
  document.body.appendChild(wallpaperEl);
  window._wallpaperEl = wallpaperEl;
})();

function setWallpaper(imgPath) {
  const el = window._wallpaperEl;
  const smBetinha = document.getElementById('sm-betinha');

  
  if (el.style.display !== 'none' && el.getAttribute('data-wpp') === imgPath) {
    el.style.opacity = '0';
    setTimeout(function () {
      el.onload = null;
      el.onerror = null;
      el.style.display = 'none';
      el.removeAttribute('src');
      el.removeAttribute('data-wpp');
      document.body.style.backgroundImage = '';
    }, 400);
    if (smBetinha) smBetinha.setAttribute('data-tip', 'Definir como papel de parede');
    closeStartMenu();
    return;
  }

  const isFirst = el.style.display === 'none';
  el.onload = function () {
    document.body.style.backgroundImage = 'none';
    el.style.display = 'block';
    el.setAttribute('data-wpp', imgPath);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    if (smBetinha) smBetinha.setAttribute('data-tip', 'Remover papel de parede');
    closeStartMenu();
  };
  el.onerror = function () {
    alert('Não foi possível carregar "' + imgPath + '". Verifique se o arquivo está na mesma pasta do site.');
    closeStartMenu();
  };
  el.style.opacity = '0';
  setTimeout(() => { el.src = imgPath; }, isFirst ? 0 : 200);
}

(function () {
  const smCalcItem = document.getElementById('sm-calc-item');

  smCalcItem.addEventListener('click', () => {
    closeStartMenu();
    window.openCalculadora();
  });
})();

(function () {
  const win = document.querySelector('.window');
  const titleBar = win.querySelector('.title-bar');

  function centreWindow() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ww = Math.min(win.offsetWidth, 860);
    const wh = win.offsetHeight;
    const taskbarH = 40;
    const left = Math.max(0, (vw - ww) / 2);
    const top = Math.max(0, (vh - taskbarH - wh) / 2);
    win.style.left = left + 'px';
    win.style.top = top + 'px';
  }

  requestAnimationFrame(() => { requestAnimationFrame(centreWindow); });
  window.addEventListener('resize', centreWindow);

  let dragging = false;
  let startX, startY, origLeft, origTop;

  titleBar.addEventListener('mousedown', function (e) {
    if (e.target.closest('.win-controls')) return;
    var rect = win.getBoundingClientRect();
    var HIT_D = 8;
    if (e.clientX - rect.left <= HIT_D || rect.right - e.clientX <= HIT_D) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origLeft = win.offsetLeft;
    origTop = win.offsetTop;
    titleBar.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const taskbarH = 40;
    const newLeft = Math.max(0, Math.min(origLeft + dx, vw - win.offsetWidth));
    const newTop = Math.max(0, Math.min(origTop + dy, vh - taskbarH - 30));
    win.style.left = newLeft + 'px';
    win.style.top = newTop + 'px';
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    titleBar.style.cursor = 'grab';
  });

  titleBar.addEventListener('touchstart', function (e) {
    if (e.target.closest('.win-controls')) return;
    const t = e.touches[0];
    dragging = true;
    startX = t.clientX;
    startY = t.clientY;
    origLeft = win.offsetLeft;
    origTop = win.offsetTop;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const taskbarH = 40;
    const newLeft = Math.max(0, Math.min(origLeft + dx, vw - win.offsetWidth));
    const newTop = Math.max(0, Math.min(origTop + dy, vh - taskbarH - 30));
    win.style.left = newLeft + 'px';
    win.style.top = newTop + 'px';
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', function () { dragging = false; });
})();

(function () {
  var MIN_W = 320;
  var MIN_H = 180;
  var TASKBAR_H = 44;
  var HIT = 8;

  var activeApply = null;
  var activeStop = null;

  var captureOverlay = document.createElement('div');
  captureOverlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;touch-action:none;';
  document.body.appendChild(captureOverlay);

  captureOverlay.addEventListener('pointermove', function (e) {
    e.preventDefault();
    if (activeApply) activeApply(e.clientX, e.clientY);
  });

  captureOverlay.addEventListener('pointerup', function () {
    if (activeStop) activeStop();
  });

  captureOverlay.addEventListener('pointercancel', function () {
    if (activeStop) activeStop();
  });

  function pinPx(winEl) {
    var rect = winEl.getBoundingClientRect();
    winEl.style.left = rect.left + 'px';
    winEl.style.top = rect.top + 'px';
    winEl.style.width = rect.width + 'px';
    winEl.style.height = rect.height + 'px';
    winEl.style.maxWidth = 'none';
    winEl.style.maxHeight = 'none';
    winEl.style.position = 'fixed';
    winEl.style.margin = '0';
  }

  function makeResizable(winEl) {
    if (!winEl) return;

    var resizing = false;
    var dir = '';
    var startX, startY, startW, startH, startLeft, startTop;

    var cursorMap = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };

    function getDir(clientX, clientY) {
      var rect = winEl.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      var w = rect.width;
      var h = rect.height;
      var onL = x <= HIT;
      var onR = x >= w - HIT;
      var onT = y <= HIT;
      var onB = y >= h - HIT;
      if (onT && onL) return 'nw';
      if (onT && onR) return 'ne';
      if (onB && onL) return 'sw';
      if (onB && onR) return 'se';
      if (onL) return 'w';
      if (onR) return 'e';
      if (onT) return 'n';
      if (onB) return 's';
      return '';
    }

    function applyResize(clientX, clientY) {
      var dx = clientX - startX;
      var dy = clientY - startY;
      var cw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var newW = startW, newH = startH, newL = startLeft, newT = startTop;

      if (dir === 'e' || dir === 'ne' || dir === 'se') {
        newW = Math.min(Math.max(startW + dx, MIN_W), cw - startLeft - 4);
      }
      if (dir === 'w' || dir === 'nw' || dir === 'sw') {
        var rawW = startW - dx;
        newW = Math.max(rawW, MIN_W);
        newL = startLeft + startW - newW;
        if (newL < 0) { newW = startLeft + startW; newL = 0; }
      }
      if (dir === 's' || dir === 'se' || dir === 'sw') {
        newH = Math.min(Math.max(startH + dy, MIN_H), vh - TASKBAR_H - startTop - 4);
      }
      if (dir === 'n' || dir === 'nw' || dir === 'ne') {
        var rawH = startH - dy;
        newH = Math.max(rawH, MIN_H);
        newT = startTop + startH - newH;
        if (newT < 0) { newH = startTop + startH; newT = 0; }
      }

      winEl.style.width = newW + 'px';
      winEl.style.height = newH + 'px';
      winEl.style.left = newL + 'px';
      winEl.style.top = newT + 'px';
    }

    function stopResize() {
      if (!resizing) return;
      resizing = false;
      dir = '';
      activeApply = null;
      activeStop = null;
      winEl.classList.remove('resizing');
      document.body.classList.remove('is-resizing');
      captureOverlay.style.display = 'none';
      captureOverlay.style.cursor = '';
      winEl.style.cursor = '';
    }

    function startResize(d, clientX, clientY, pointerId) {
      pinPx(winEl);
      resizing = true;
      dir = d;
      startX = clientX;
      startY = clientY;
      var rect = winEl.getBoundingClientRect();
      startW = rect.width;
      startH = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      winEl.classList.add('resizing');
      document.body.classList.add('is-resizing');
      captureOverlay.style.cursor = cursorMap[d];
      captureOverlay.style.display = 'block';
      activeApply = applyResize;
      activeStop = stopResize;
      if (pointerId != null) {
        try { captureOverlay.setPointerCapture(pointerId); } catch (ex) {}
      }
    }

    winEl.addEventListener('mousemove', function (e) {
      if (resizing) return;
      var d = getDir(e.clientX, e.clientY);
      winEl.style.cursor = d ? cursorMap[d] : '';
    });

    winEl.addEventListener('mouseleave', function () {
      if (!resizing) winEl.style.cursor = '';
    });

    winEl.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var d = getDir(e.clientX, e.clientY);
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      startResize(d, e.clientX, e.clientY, e.pointerId);
    });

    var topBar = document.createElement('div');
    topBar.style.cssText = 'position:fixed;height:' + HIT + 'px;z-index:9998;pointer-events:none;cursor:ns-resize;touch-action:none;';
    document.body.appendChild(topBar);

    function syncTopBar() {
      var computed = getComputedStyle(winEl);
      var hidden = computed.display === 'none' || computed.visibility === 'hidden' || winEl.classList.contains('minimized') || winEl.classList.contains('pv-minimized') || winEl.classList.contains('maximized');
      if (hidden) {
        topBar.style.pointerEvents = 'none';
        return;
      }
      topBar.style.pointerEvents = 'auto';
      var rect = winEl.getBoundingClientRect();
      topBar.style.left = rect.left + 'px';
      topBar.style.top = rect.top + 'px';
      topBar.style.width = rect.width + 'px';
      topBar.style.zIndex = (parseInt(winEl.style.zIndex) || 50) + 2;
    }

    requestAnimationFrame(function loop() { syncTopBar(); requestAnimationFrame(loop); });

    topBar.addEventListener('mousemove', function (e) {
      if (resizing) return;
      var rect = winEl.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var w = rect.width;
      if (x <= HIT) topBar.style.cursor = 'nwse-resize';
      else if (x >= w - HIT) topBar.style.cursor = 'nesw-resize';
      else topBar.style.cursor = 'ns-resize';
    });

    topBar.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      var rect = winEl.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var w = rect.width;
      var d;
      if (x <= HIT) d = 'nw';
      else if (x >= w - HIT) d = 'ne';
      else d = 'n';
      startResize(d, e.clientX, e.clientY, e.pointerId);
    });

    var rightBar = document.createElement('div');
    rightBar.style.cssText = 'position:fixed;width:' + HIT + 'px;z-index:9998;pointer-events:none;cursor:ew-resize;touch-action:none;';
    document.body.appendChild(rightBar);

    function syncRightBar() {
      var computed = getComputedStyle(winEl);
      var hidden = computed.display === 'none' || computed.visibility === 'hidden' || winEl.classList.contains('minimized') || winEl.classList.contains('pv-minimized') || winEl.classList.contains('maximized');
      if (hidden) {
        rightBar.style.pointerEvents = 'none';
        return;
      }
      rightBar.style.pointerEvents = 'auto';
      var rect = winEl.getBoundingClientRect();
      rightBar.style.left = (rect.right - HIT) + 'px';
      rightBar.style.top = rect.top + 'px';
      rightBar.style.height = rect.height + 'px';
      rightBar.style.zIndex = (parseInt(winEl.style.zIndex) || 50) + 2;
    }

    requestAnimationFrame(function loop() { syncRightBar(); requestAnimationFrame(loop); });

    rightBar.addEventListener('mousemove', function (e) {
      if (resizing) return;
      var rect = winEl.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var h = rect.height;
      if (y <= HIT) rightBar.style.cursor = 'nesw-resize';
      else if (y >= h - HIT) rightBar.style.cursor = 'nwse-resize';
      else rightBar.style.cursor = 'ew-resize';
    });

    rightBar.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      var rect = winEl.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var h = rect.height;
      var d;
      if (y <= HIT) d = 'ne';
      else if (y >= h - HIT) d = 'se';
      else d = 'e';
      startResize(d, e.clientX, e.clientY, e.pointerId);
    });
  }

  makeResizable(document.querySelector('.window'));
  makeResizable(document.getElementById('photo-viewer'));
  makeResizable(document.getElementById('trash-window'));
})();

const ttBox = document.getElementById('tooltip-box');
document.querySelectorAll('.th-tip').forEach(el => {
  el.addEventListener('mouseenter', () => {
    ttBox.textContent = el.getAttribute('data-tip');
    ttBox.style.display = 'block';
  });
  el.addEventListener('mousemove', e => {
    let x = e.clientX + 14;
    let y = e.clientY - 10;
    if (x + 250 > window.innerWidth) x = e.clientX - 260;
    if (y + 80 > window.innerHeight) y = e.clientY - 90;
    ttBox.style.left = x + 'px';
    ttBox.style.top = y + 'px';
  });
  el.addEventListener('mouseleave', () => { ttBox.style.display = 'none'; });
});
(function () {
  var TOTAL = 10;
  var currentIdx = 0;
  var customMode = false;
  var overlay = document.getElementById('photo-viewer-overlay');
  var viewer = document.getElementById('photo-viewer');
  var pvImg = document.getElementById('pv-img');
  var pvPlaceholder = document.getElementById('pv-placeholder');
  var pvCounter = document.getElementById('pv-counter');
  var pvCloseBtn = document.getElementById('pv-close-btn');
  var pvPrevBtn = document.getElementById('pv-prev-btn');
  var pvNextBtn = document.getElementById('pv-next-btn');
  var pvTitlebar = document.getElementById('pv-titlebar');
  var pvMinBtn = document.getElementById('pv-min-btn');
  var pvMaxBtn = document.getElementById('pv-max-btn');
  var pvMaxIcon = document.getElementById('pv-max-btn-icon');
  var smImagensBtn = document.getElementById('sm-imagens-btn');
  var pvClosing = false;
  var pvMaximized = false;
  viewer.addEventListener('mousedown', function () { bringToFront(overlay); }, true);
  var pvRestoreState = null;

  pvImg.setAttribute('draggable', 'false');
  pvImg.style.userSelect = 'none';
  pvImg.style.webkitUserSelect = 'none';
  pvImg.style.pointerEvents = 'none';

  function getPvBtn() { return _taskbar.getItem('pv-taskbar'); }

  function createPvBtn() {
    var btn = document.createElement('div');
    btn.className = 'taskbar-app';
    
    btn.textContent = '🖼️ Visualizador de Imagens';
    btn.addEventListener('click', function () {
      if (btn.classList.contains('faded')) {
        viewer.classList.remove('pv-minimized');
        pvClearAnims();
        void viewer.offsetWidth;
        viewer.classList.add('pv-anim-restore');
        btn.classList.remove('faded');
        btn.title = '';
        setTimeout(function () { pvClearAnims(); }, 230);
      }
      bringToFront(overlay);
    });
    return btn;
  }

  function pvUpdateCounter() {
    pvCounter.textContent = (currentIdx + 1) + ' / ' + TOTAL;
  }

  function pvLoadSlot(idx) {
    pvImg.classList.remove('pv-fade-in');
    pvImg.style.display = 'none';
    pvPlaceholder.classList.remove('pv-placeholder-in');
    pvPlaceholder.style.display = 'none';

    var src = 'imagens/foto' + (idx + 1) + '.png';
    var testImg = new Image();

    testImg.onload = function () {
      pvImg.src = src;
      pvImg.style.display = 'block';
      pvPlaceholder.style.display = 'none';
      void pvImg.offsetWidth;
      pvImg.classList.add('pv-fade-in');
    };

    testImg.onerror = function () {
      pvImg.style.display = 'none';
      pvPlaceholder.style.display = 'flex';
      void pvPlaceholder.offsetWidth;
      pvPlaceholder.classList.add('pv-placeholder-in');
    };

    testImg.src = src;
  }

  function pvGo(idx) {
    currentIdx = ((idx % TOTAL) + TOTAL) % TOTAL;
    pvLoadSlot(currentIdx);
    pvUpdateCounter();
  }

  function blockDrag(e) { e.preventDefault(); return false; }

  function pvClearAnims() {
    viewer.classList.remove('pv-anim-open','pv-anim-maximize','pv-anim-unmaximize','pv-anim-minimize','pv-anim-restore','pv-anim-close');
  }

  function pvLoadCustom(src) {
    customMode = true;
    pvPrevBtn.style.visibility = 'hidden';
    pvNextBtn.style.visibility = 'hidden';
    pvImg.classList.remove('pv-fade-in');
    pvImg.style.display = 'none';
    pvPlaceholder.classList.remove('pv-placeholder-in');
    pvPlaceholder.style.display = 'none';
    var testImg = new Image();
    testImg.onload = function () {
      pvImg.src = src;
      pvImg.style.display = 'block';
      pvPlaceholder.style.display = 'none';
      void pvImg.offsetWidth;
      pvImg.classList.add('pv-fade-in');
    };
    testImg.onerror = function () {
      pvImg.style.display = 'none';
      pvPlaceholder.style.display = 'flex';
      void pvPlaceholder.offsetWidth;
      pvPlaceholder.classList.add('pv-placeholder-in');
    };
    testImg.src = src;
    pvCounter.textContent = '';
  }

  function pvOpen(customSrc) {
    closeStartMenu();
    pvClosing = false;
    currentIdx = 0;
    pvClearAnims();
    viewer.classList.remove('pv-minimized');
    overlay.classList.remove('closing');
    overlay.classList.add('open');
    bringToFront(overlay);
    _winRegister('photo-viewer-overlay', pvClose);
    void viewer.offsetWidth;
    viewer.classList.add('pv-anim-open');
    setTimeout(function () { pvClearAnims(); }, 250);
    if (!_taskbar.getItem('pv-taskbar')) {
      _taskbar.addItem('pv-taskbar', createPvBtn());
    }
    var btn = getPvBtn();
    if (btn) { btn.classList.remove('faded'); btn.title = ''; }
    document.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('drag',      blockDrag, true);
    if (customSrc) {
      pvLoadCustom(customSrc);
    } else {
      pvGo(0);
    }
  }

  function pvClose() {
    if (pvClosing) return;
    pvClosing = true;
    _winRemove('photo-viewer-overlay');
    ttBox.style.display = 'none';
    document.removeEventListener('dragstart', blockDrag, true);
    document.removeEventListener('drag',      blockDrag, true);

    viewer.classList.remove('pv-minimized', 'pv-maximized');
    pvClearAnims();
    void viewer.offsetWidth;
    viewer.classList.add('pv-anim-close');
    setTimeout(function () {
      pvClearAnims();
      customMode = false;
      pvPrevBtn.style.visibility = '';
      pvNextBtn.style.visibility = '';
      overlay.classList.remove('open', 'closing');
      pvMaxIcon.classList.remove('restore');
      pvMaximized = false;
      pvRestoreState = null;
      _taskbar.removeItem('pv-taskbar');
      pvClosing = false;
    }, 190);
  }

  pvMinBtn.addEventListener('click', function () {
    pvClearAnims();
    void viewer.offsetWidth;
    viewer.classList.add('pv-anim-minimize');
    var btn = getPvBtn();
    if (btn) { btn.classList.add('faded'); btn.title = 'Clique para restaurar'; }
    setTimeout(function () {
      viewer.classList.add('pv-minimized');
      pvClearAnims();
    }, 200);
  });

  pvMaxBtn.addEventListener('click', function () {
    if (!pvMaximized) {
      pvRestoreState = { left: viewer.style.left, top: viewer.style.top,
                         width: viewer.style.width, height: viewer.style.height,
                         position: viewer.style.position };
      pvClearAnims();
      void viewer.offsetWidth;
      viewer.classList.add('pv-maximized', 'pv-anim-maximize');
      pvMaxIcon.classList.add('restore');
      pvMaximized = true;
      setTimeout(function () { pvClearAnims(); }, 210);
    } else {
      viewer.classList.remove('pv-maximized');
      pvMaxIcon.classList.remove('restore');
      if (pvRestoreState) {
        viewer.style.left     = pvRestoreState.left;
        viewer.style.top      = pvRestoreState.top;
        viewer.style.width    = pvRestoreState.width || '';
        viewer.style.height   = pvRestoreState.height || '';
        viewer.style.position = pvRestoreState.position || 'absolute';
      }
      pvClearAnims();
      void viewer.offsetWidth;
      viewer.classList.add('pv-anim-unmaximize');
      pvMaximized = false;
      setTimeout(function () { pvClearAnims(); }, 190);
    }
  });

  smImagensBtn.addEventListener('click', function() { pvOpen(); });
  pvCloseBtn.addEventListener('click', pvClose);

  pvPrevBtn.addEventListener('click', function () { if (!customMode) pvGo(currentIdx - 1); });
  pvNextBtn.addEventListener('click', function () { if (!customMode) pvGo(currentIdx + 1); });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) pvClose();
  });

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); if (!customMode) pvGo(currentIdx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (!customMode) pvGo(currentIdx - 1); }
  });

  (function () {
    var dragging = false;
    var startX, startY, origLeft, origTop;

    pvTitlebar.addEventListener('mousedown', function (e) {
      if (e.target === pvCloseBtn || e.target === pvMinBtn || e.target === pvMaxBtn || e.target === pvMaxIcon) return;
      if (pvMaximized) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = viewer.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      viewer.style.position = 'absolute';
      viewer.style.margin = '0';
      viewer.style.left = origLeft + 'px';
      viewer.style.top = origTop + 'px';
      pvTitlebar.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var newLeft = Math.max(0, Math.min(origLeft + dx, vw - viewer.offsetWidth));
      var newTop = Math.max(0, Math.min(origTop + dy, vh - viewer.offsetHeight));
      viewer.style.left = newLeft + 'px';
      viewer.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      pvTitlebar.style.cursor = 'grab';
    });
  })();

  window._pvOpen = pvOpen;
})();

(function () {
  var ttBox = document.getElementById('tooltip-box');

  function bindTip(el) {
    el.addEventListener('mouseenter', function () {
      ttBox.textContent = el.getAttribute('data-tip');
      ttBox.style.display = 'block';
    });
    el.addEventListener('mousemove', function (e) {
      var x = e.clientX + 14;
      var y = e.clientY - 10;
      if (x + 250 > window.innerWidth) x = e.clientX - 260;
      if (y + 80 > window.innerHeight) y = e.clientY - 90;
      ttBox.style.left = x + 'px';
      ttBox.style.top = y + 'px';
    });
    el.addEventListener('mouseleave', function () {
      ttBox.style.display = 'none';
    });
  }

  document.querySelectorAll('[data-tip]:not(.th-tip)').forEach(bindTip);
})();

(function () {
  var lb = document.getElementById('lb');
  var lbClosing = false;

  window.lbOpen = function () {
    lbClosing = false;
    lb.classList.remove('closing');
    lb.classList.add('open');
  };

  window.lbClose = function () {
    if (lbClosing) return;
    lbClosing = true;
    lb.classList.add('closing');
    setTimeout(function () {
      lb.classList.remove('open', 'closing');
      lbClosing = false;
    }, 210);
  };

  lb.addEventListener('click', function (e) {
    if (e.target === lb) window.lbClose();
  });

  

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb.classList.contains('open')) {
      e.preventDefault();
      window.lbClose();
    }
  });
})();

(function () {
  var trashOverlay = document.getElementById('trash-window-overlay');
  var trashWin = document.getElementById('trash-window');
  var trashTitlebar = document.getElementById('trash-titlebar');
  var trashCloseBtn = document.getElementById('trash-close-btn');
  var trashIcon = document.getElementById('trash-icon');
  var trashFile = document.getElementById('trash-file');
  var trashClosing = false;
  var trashClickTimer = null;

  trashWin.addEventListener('mousedown', function () { bringToFront(trashOverlay); }, true);

  function getTrashBtn() { return _taskbar.getItem('trash-taskbar'); }

  function createTrashBtn() {
    var btn = document.createElement('div');
    btn.className = 'taskbar-app';
    
    btn.textContent = '🗑️ Lixeira';
    btn.addEventListener('click', function () {
      if (btn.classList.contains('faded')) {
        trashWin.classList.remove('tw-minimized');
        btn.classList.remove('faded');
      }
      bringToFront(trashOverlay);
    });
    return btn;
  }

  function trashOpen() {
    if (trashOverlay.classList.contains('open')) {
      bringToFront(trashOverlay);
      return;
    }
    trashClosing = false;
    trashWin.classList.remove('tw-anim-close');
    trashOverlay.classList.remove('closing');
    trashOverlay.classList.add('open');
    if (!_taskbar.getItem('trash-taskbar')) {
      _taskbar.addItem('trash-taskbar', createTrashBtn());
    }
    var btn = getTrashBtn();
    if (btn) { btn.classList.remove('faded'); }
    bringToFront(trashOverlay);
    _winRegister('trash-window-overlay', trashClose);
    void trashWin.offsetWidth;
    trashWin.classList.add('tw-anim-open');
    setTimeout(function () { trashWin.classList.remove('tw-anim-open'); }, 240);
  }

  function trashClose() {
    if (trashClosing) return;
    trashClosing = true;
    _winRemove('trash-window-overlay');
    trashWin.classList.remove('tw-anim-open');
    void trashWin.offsetWidth;
    trashWin.classList.add('tw-anim-close');
    setTimeout(function () {
      trashWin.classList.remove('tw-anim-close');
      trashOverlay.classList.remove('open', 'closing');
      _taskbar.removeItem('trash-taskbar');
      trashClosing = false;
    }, 190);
  }

  trashIcon.addEventListener('click', function (e) {
    trashIcon.classList.add('selected');
    if (trashClickTimer) {
      clearTimeout(trashClickTimer);
      trashClickTimer = null;
      return;
    }
    trashClickTimer = setTimeout(function () { trashClickTimer = null; }, 280);
  });

  document.addEventListener('click', function (e) {
    if (!trashIcon.contains(e.target)) {
      trashIcon.classList.remove('selected');
    }
  });

  trashIcon.addEventListener('dblclick', function () {
    if (trashClickTimer) { clearTimeout(trashClickTimer); trashClickTimer = null; }
    trashIcon.classList.remove('selected');
    trashOpen();
  });

  trashCloseBtn.addEventListener('click', trashClose);

  trashFile.addEventListener('click', function () {
    trashFile.classList.add('selected');
  });

  trashFile.addEventListener('dblclick', function () {
    window.trashFileOpen();
  });

  document.addEventListener('click', function (e) {
    if (!trashFile.contains(e.target)) {
      trashFile.classList.remove('selected');
    }
  });

  (function () {
    var dragging = false;
    var startX, startY, origLeft, origTop;

    trashTitlebar.addEventListener('mousedown', function (e) {
      if (e.target === trashCloseBtn || trashCloseBtn.contains(e.target)) return;
      e.preventDefault();
      bringToFront(trashOverlay);
      var rect = trashWin.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      trashWin.style.left = origLeft + 'px';
      trashWin.style.top = origTop + 'px';
      trashWin.style.position = 'absolute';
      trashWin.style.margin = '0';
      dragging = true;
      trashOverlay.style.alignItems = 'flex-start';
      trashOverlay.style.justifyContent = 'flex-start';
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      var newLeft = origLeft + dx;
      var newTop = origTop + dy;
      var minTop = 0;
      var maxTop = window.innerHeight - 40;
      var maxLeft = window.innerWidth - 80;
      if (newTop < minTop) newTop = minTop;
      if (newTop > maxTop) newTop = maxTop;
      if (newLeft < -trashWin.offsetWidth + 80) newLeft = -trashWin.offsetWidth + 80;
      if (newLeft > maxLeft) newLeft = maxLeft;
      trashWin.style.left = newLeft + 'px';
      trashWin.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', function () { dragging = false; });
  })();

  window.trashFileOpen = function () {
    trashClose();
    setTimeout(function () {
      if (window._pvOpen) window._pvOpen('imagens/topsecret.png');
    }, 200);
  };
})();

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (_winStack.length === 0) return;
  var top = _winStack[_winStack.length - 1];
  e.preventDefault();
  e.stopImmediatePropagation();
  top.closeFn();
});

(function () {
  var ctxMenu = document.getElementById('ctx-menu');
  var ctxCopy = document.getElementById('ctx-copy');
  var ctxPaste = document.getElementById('ctx-paste');
  var ctxTarget = null;
  var ctxClosing = false;

  var DATA_INPUTS_SEL = 'textarea, input[type="number"], input[type="text"], input:not([type])';

  document.addEventListener('contextmenu', function (e) {
    var inputEl = e.target.closest(DATA_INPUTS_SEL);
    e.preventDefault();
    if (!inputEl) {
      closeCtx();
      return;
    }
    ctxTarget = inputEl;
    openCtx(e.clientX, e.clientY);
  });

  function openCtx(cx, cy) {
    ctxClosing = false;
    ctxMenu.classList.remove('ctx-close');
    ctxMenu.style.left = '-9999px';
    ctxMenu.style.top = '-9999px';
    ctxMenu.style.display = 'block';

    var isNumberInput = ctxTarget && ctxTarget.tagName === 'INPUT' && ctxTarget.type === 'number';
    var hasSelection;
    if (isNumberInput) {
      // input[type="number"] não expõe selectionStart/selectionEnd — habilita copiar se há valor
      hasSelection = ctxTarget && ctxTarget.value.trim() !== '';
    } else {
      hasSelection = ctxTarget && ctxTarget.selectionStart !== ctxTarget.selectionEnd;
    }
    if (hasSelection) {
      ctxCopy.classList.remove('ctx-disabled');
    } else {
      ctxCopy.classList.add('ctx-disabled');
    }

    requestAnimationFrame(function () {
      var mw = ctxMenu.offsetWidth;
      var mh = ctxMenu.offsetHeight;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var x = Math.min(cx, vw - mw - 6);
      var y = Math.min(cy, vh - mh - 6);
      if (x < 4) x = 4;
      if (y < 4) y = 4;
      ctxMenu.style.left = x + 'px';
      ctxMenu.style.top = y + 'px';
      void ctxMenu.offsetWidth;
      ctxMenu.classList.add('ctx-open');
    });
  }

  function closeCtx() {
    if (!ctxMenu.classList.contains('ctx-open') || ctxClosing) return;
    ctxClosing = true;
    ctxMenu.classList.remove('ctx-open');
    ctxMenu.classList.add('ctx-close');
    setTimeout(function () {
      ctxMenu.style.display = 'none';
      ctxMenu.classList.remove('ctx-close');
      ctxClosing = false;
      ctxTarget = null;
    }, 140);
  }

  // COPIAR: captura o texto selecionado via textarea auxiliar ANTES de fechar o menu,
  // mantendo o foco e a seleção intactos no momento do execCommand.
  ctxCopy.addEventListener('mousedown', function (e) {
    e.preventDefault(); // impede que o campo de texto perca o foco
    e.stopPropagation();
    if (!ctxTarget || ctxCopy.classList.contains('ctx-disabled')) return;

    var isNumberInput = ctxTarget.tagName === 'INPUT' && ctxTarget.type === 'number';
    var selected;

    if (isNumberInput) {
      // input[type="number"] não suporta selectionStart — copia o valor inteiro
      selected = ctxTarget.value.trim();
      if (!selected) return;
    } else {
      var start = ctxTarget.selectionStart;
      var end = ctxTarget.selectionEnd;
      if (start === end) return;
      selected = ctxTarget.value.substring(start, end);
    }

    // Tenta Clipboard API moderna primeiro (funciona em HTTPS com foco)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(selected).catch(function () {
        copyViaExecCommand(selected);
      });
    } else {
      copyViaExecCommand(selected);
    }
    closeCtx();
  });
  ctxCopy.addEventListener('click', function (e) { e.stopPropagation(); });

  function copyViaExecCommand(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
  }

  // COLAR: tenta Clipboard API; se bloqueada, foca o campo e usa execCommand
  // de forma síncrona (sem fechar o menu antes, para não perder contexto).
  ctxPaste.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();
  });
  ctxPaste.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!ctxTarget) return;
    var el = ctxTarget;

    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        closeCtx();
        insertAtCursor(el, text);
      }).catch(function () {
        // Clipboard API bloqueada: foca o campo e tenta execCommand síncrono
        closeCtx();
        el.focus();
        try {
          document.execCommand('paste');
        } catch (err) {
          showPasteBlocked();
        }
      });
    } else {
      closeCtx();
      el.focus();
      try {
        var ok = document.execCommand('paste');
        if (!ok) showPasteBlocked();
      } catch (err) {
        showPasteBlocked();
      }
    }
  });

  function insertAtCursor(el, text) {
    el.focus();
    var isNumberInput = el.tagName === 'INPUT' && el.type === 'number';
    if (isNumberInput) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    var start = el.selectionStart;
    var end = el.selectionEnd;
    var val = el.value;
    el.value = val.substring(0, start) + text + val.substring(end);
    el.selectionStart = el.selectionEnd = start + text.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function showPasteBlocked() {
    var ttBox = document.getElementById('tooltip-box');
    if (!ttBox) return;
    ttBox.textContent = 'Use Ctrl+V para colar.';
    ttBox.style.left = Math.round(window.innerWidth / 2 - 80) + 'px';
    ttBox.style.top = '80px';
    ttBox.style.display = 'block';
    setTimeout(function () { ttBox.style.display = 'none'; }, 2400);
  }

  document.addEventListener('mousedown', function (e) {
    if (!ctxMenu.contains(e.target)) closeCtx();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCtx();
  });

  window.addEventListener('blur', closeCtx);
  window.addEventListener('scroll', closeCtx, true);
})();
