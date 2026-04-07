const fmt = v => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const n = Math.round(v * 10000) / 10000;
  return n.toString().replace('.', ',');
};

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

function switchTab(idx) {
  const body = document.querySelector('.window-body');
  body.classList.add('no-scroll');
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  setTimeout(() => body.classList.remove('no-scroll'), 230);
}

function calcP0() {
  showError('p0-error', '');
  const raw = document.getElementById('p0-input').value.trim();
  if (!raw) { showError('p0-error', 'Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 2) { showError('p0-error', 'Insira pelo menos 2 valores numéricos.'); return; }

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

  document.getElementById('p0-mean').textContent = fmt(mean);
  document.getElementById('p0-mode').textContent = modeStr;
  document.getElementById('p0-median').textContent = fmt(median);
  document.getElementById('p0-range').textContent = fmt(range);
  document.getElementById('p0-std').textContent = fmt(std);
  document.getElementById('p0-n').textContent = n;
  document.getElementById('p0-sorted').textContent = sorted.join('  ·  ');
  document.getElementById('p0-results').style.display = 'block';
}

function clearP0() {
  document.getElementById('p0-input').value = '';
  document.getElementById('p0-results').style.display = 'none';
  showError('p0-error', '');
}

function exampleP0() {
  document.getElementById('p0-input').value = '4 7 2 9 5 7 3 8 7 1 6 5 4 3 7';
}

function clearP1() {
  document.getElementById('p1-input').value = '';
  document.getElementById('p1-results').style.display = 'none';
  showError('p1-error', '');
}

function exampleP1() {
  document.getElementById('p1-input').value = '2 2 2 4 4 4 4 4 6 6 6 6 6 6 6 6 8 8 8 8 8 8 10 10 10 10 12 12';
}

function calcP1() {
  showError('p1-error', '');
  const raw = document.getElementById('p1-input').value.trim();
  if (!raw) { showError('p1-error', 'Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 2) { showError('p1-error', 'Insira pelo menos 2 valores numéricos.'); return; }

  const freqMap = {};
  data.forEach(v => freqMap[v] = (freqMap[v] || 0) + 1);
  const vals = Object.keys(freqMap).map(Number).sort((a, b) => a - b);
  const freqs = vals.map(v => freqMap[v]);
  const n = freqs.reduce((a, b) => a + b, 0);
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
  document.getElementById('p1-results').style.display = 'block';
}

function clearP2() {
  document.getElementById('p2-input').value = '';
  document.getElementById('p2-nclasses').value = '';
  document.getElementById('p2-results').style.display = 'none';
  showError('p2-error', '');
}

function exampleP2() {
  document.getElementById('p2-input').value = '12 18 23 27 31 35 38 42 45 49 51 55 58 62 67 14 20 25 29 33 37 41 44 48 53 57 61 65 19 24';
  document.getElementById('p2-nclasses').value = '';
}

function calcP2() {
  showError('p2-error', '');
  const raw = document.getElementById('p2-input').value.trim();
  if (!raw) { showError('p2-error', 'Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 4) { showError('p2-error', 'Insira pelo menos 4 valores para dados agrupados com intervalo.'); return; }

  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const dataMin = sorted[0];
  const dataMax = sorted[n - 1];

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
  const range = cls[cls.length - 1].ls - cls[0].li;

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
    <b>Mediana:</b> Md = lᵢ + [(n/2 − Fac) / fᵢ] · h = ${fmt(mc.li)} + [(${fmt(half)} − ${mc.cumBefore}) / ${mc.f}] · ${fmt(hMc)} = <b>${fmt(median)}</b><br>
    <b>Moda (Czuber):</b> classe modal [${fmt(cls[moIdx].li)} – ${fmt(cls[moIdx].ls)}[  →  Mo = <b>${fmt(mo)}</b><br>
    <b>Amplitude:</b> AT = L<sub>k</sub> − l₁ = ${fmt(cls[cls.length - 1].ls)} − ${fmt(cls[0].li)} = <b>${fmt(range)}</b><br>
    <b>Desvio Padrão:</b> σ = √[Σfᵢ(mᵢ−x̄)² / n] = √[${fmt(sDev)} / ${nTotal}] = <b>${fmt(std)}</b>
  `;
  document.getElementById('p2-results').style.display = 'block';
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
  const taskbarApp = document.querySelector('.taskbar-app');
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
    setTimeout(() => { clearAnims(); if (after) after(); }, duration);
  }

  win.style.display = '';
  playAnim('anim-open', 230, null);

  document.querySelector('.win-btn-min').addEventListener('click', () => {
    if (isClosed || isMinimized) return;
    playAnim('anim-minimize', 210, () => {
      isMinimized = true;
      win.classList.add('minimized');
    });
    taskbarApp.style.opacity = '0.55';
    taskbarApp.title = 'Clique para restaurar';
    taskbarApp.style.cursor = 'pointer';
  });

  taskbarApp.addEventListener('click', () => {
    if (isClosed) return;
    if (isMinimized) {
      isMinimized = false;
      win.classList.remove('minimized');
      taskbarApp.style.opacity = '1';
      taskbarApp.title = '';
      taskbarApp.style.cursor = 'default';
      playAnim('anim-restore', 230, null);
    }
  });

  document.querySelector('.win-btn-max').addEventListener('click', () => {
    if (isClosed) return;
    if (!isMaximized) {
      clearAnims();
      void win.offsetWidth;
      win.classList.add('maximized', 'anim-maximize');
      setTimeout(() => { clearAnims(); }, 200);
    } else {
      win.classList.remove('maximized');
      clearAnims();
      void win.offsetWidth;
      win.classList.add('anim-unmaximize');
      setTimeout(() => { clearAnims(); }, 180);
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
      taskbarApp.style.display = 'none';
      desktopIcon.classList.remove('hidden');
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
      taskbarApp.style.display = '';
      taskbarApp.style.opacity = '1';
      taskbarApp.title = '';
      taskbarApp.style.cursor = 'default';
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
      taskbarApp.style.display = '';
      taskbarApp.style.opacity = '1';
      taskbarApp.title = '';
      taskbarApp.style.cursor = 'default';
      playAnim('anim-open', 230, null);
    } else if (isMinimized) {
      isMinimized = false;
      win.classList.remove('minimized');
      taskbarApp.style.opacity = '1';
      taskbarApp.title = '';
      taskbarApp.style.cursor = 'default';
      playAnim('anim-restore', 230, null);
    }
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
  const isFirst = el.style.display === 'none';
  el.onload = function () {
    document.body.style.backgroundImage = 'none';
    el.style.display = 'block';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
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
  let smClickCount = 0;
  let smClickTimer = null;

  smCalcItem.addEventListener('click', () => {
    smClickCount++;
    if (smClickCount === 1) {
      smClickTimer = setTimeout(() => { smClickCount = 0; }, 400);
    } else if (smClickCount >= 2) {
      clearTimeout(smClickTimer);
      smClickCount = 0;
      closeStartMenu();
      window.openCalculadora();
    }
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