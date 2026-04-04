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
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i === idx));
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
  const range = sorted[n-1] - sorted[0];
  const std = Math.sqrt(data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);

  let median;
  if (n % 2 === 1) median = sorted[Math.floor(n/2)];
  else median = (sorted[n/2 - 1] + sorted[n/2]) / 2;

  const freq = {};
  data.forEach(v => freq[v] = (freq[v] || 0) + 1);
  const maxF = Math.max(...Object.values(freq));
  const modes = Object.keys(freq).filter(k => freq[k] === maxF).map(Number).sort((a,b) => a-b);
  const modeStr = (new Set(Object.values(freq)).size === 1 && n > 1) ? 'Amodal' : modes.map(fmt).join(' | ');

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

/* ── P1 ── */
function clearP1() {
  document.getElementById('p1-input').value = '';
  document.getElementById('p1-results').style.display = 'none';
  showError('p1-error', '');
}

function exampleP1() {
  document.getElementById('p1-input').value = '2 2 2 4 4 4 4 4 6 6 6 6 6 6 6 6 8 8 8 8 8 8 10 10 10 10 12 12';
}

function calcP1() {
  showError('p1-error','');
  const raw = document.getElementById('p1-input').value.trim();
  if (!raw) { showError('p1-error','Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 2) { showError('p1-error','Insira pelo menos 2 valores numéricos.'); return; }

  const freqMap = {};
  data.forEach(v => freqMap[v] = (freqMap[v] || 0) + 1);
  const vals = Object.keys(freqMap).map(Number).sort((a,b)=>a-b);
  const freqs = vals.map(v => freqMap[v]);
  const n = freqs.reduce((a,b)=>a+b,0);
  const sumXF = vals.reduce((s,v,i)=>s+v*freqs[i],0);
  const mean = sumXF / n;
  const range = vals[vals.length-1] - vals[0];
  const std = Math.sqrt(vals.reduce((s,v,i)=>s+freqs[i]*Math.pow(v-mean,2),0)/n);

  let cum=0, median=vals[0];
  const half = n/2;
  for(let i=0;i<vals.length;i++){cum+=freqs[i];if(cum>=half){median=vals[i];break;}}

  const maxF=Math.max(...freqs);
  const allSame=new Set(freqs).size===1;
  const modeStr=allSame?'Amodal':vals.filter((_,i)=>freqs[i]===maxF).map(fmt).join(' | ');

  document.getElementById('p1-mean').textContent=fmt(mean);
  document.getElementById('p1-mode').textContent=modeStr;
  document.getElementById('p1-median').textContent=fmt(median);
  document.getElementById('p1-range').textContent=fmt(range);
  document.getElementById('p1-std').textContent=fmt(std);
  document.getElementById('p1-n').textContent=n;

  let body='',sumDev=0,cumT=0,sxf=0;
  vals.forEach((v,i)=>{
    cumT+=freqs[i];const xf=v*freqs[i];const dev=freqs[i]*Math.pow(v-mean,2);
    sxf+=xf;sumDev+=dev;
    body+=`<tr><td>${fmt(v)}</td><td>${freqs[i]}</td><td>${cumT}</td><td>${fmt(xf)}</td><td>${fmt(dev)}</td></tr>`;
  });
  document.getElementById('p1-detail-body').innerHTML=body;
  document.getElementById('p1-detail-foot').innerHTML=`<tr><td><b>Σ</b></td><td><b>${n}</b></td><td>—</td><td><b>${fmt(sxf)}</b></td><td><b>${fmt(sumDev)}</b></td></tr>`;
  document.getElementById('p1-results').style.display='block';
}

function clearP2(){
  document.getElementById('p2-input').value='';
  document.getElementById('p2-nclasses').value='';
  document.getElementById('p2-results').style.display='none';
  showError('p2-error','');
}

function exampleP2(){
  document.getElementById('p2-input').value='12 18 23 27 31 35 38 42 45 49 51 55 58 62 67 14 20 25 29 33 37 41 44 48 53 57 61 65 19 24';
  document.getElementById('p2-nclasses').value='';
}

function calcP2(){
  showError('p2-error','');
  const raw = document.getElementById('p2-input').value.trim();
  if (!raw) { showError('p2-error','Digite os dados.'); return; }
  const data = parseNumbers(raw);
  if (data.length < 4) { showError('p2-error','Insira pelo menos 4 valores para dados agrupados com intervalo.'); return; }

  const sorted = [...data].sort((a,b)=>a-b);
  const n = data.length;
  const dataMin = sorted[0];
  const dataMax = sorted[n-1];

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
    const fAdj = (i === k-1) ? sorted.filter(v => v >= li && v <= ls).length : f;
    if (i < k-1 || fAdj > 0) cls.push({li, ls, f: i === k-1 ? fAdj : f, m: (li+ls)/2});
  }

  while (cls.length > 1 && cls[cls.length-1].f === 0) cls.pop();

  const freqs=cls.map(c=>c.f), mids=cls.map(c=>c.m);
  const nTotal=freqs.reduce((a,b)=>a+b,0);
  const sumMF=mids.reduce((s,m,i)=>s+m*freqs[i],0);
  const mean=sumMF/nTotal;
  const sumDev=mids.reduce((s,m,i)=>s+freqs[i]*Math.pow(m-mean,2),0);
  const std=Math.sqrt(sumDev/nTotal);
  const range=cls[cls.length-1].ls-cls[0].li;

  const half=nTotal/2;let cumBefore=0,mc=null;
  for(const c of cls){if(cumBefore+c.f>=half){mc={...c,cumBefore};break;}cumBefore+=c.f;}
  const hMc=mc.ls-mc.li;
  const median=mc.li+((half-mc.cumBefore)/mc.f)*hMc;

  const maxF=Math.max(...freqs);
  const moIdx=freqs.indexOf(maxF);
  let mo;
  if(moIdx===0||moIdx===freqs.length-1){mo=cls[moIdx].m;}
  else{const d1=maxF-freqs[moIdx-1],d2=maxF-freqs[moIdx+1],hm=cls[moIdx].ls-cls[moIdx].li;mo=cls[moIdx].li+(d1/(d1+d2))*hm;}

  document.getElementById('p2-mean').textContent=fmt(mean);
  document.getElementById('p2-mode').textContent=fmt(mo);
  document.getElementById('p2-median').textContent=fmt(median);
  document.getElementById('p2-range').textContent=fmt(range);
  document.getElementById('p2-std').textContent=fmt(std);
  document.getElementById('p2-n').textContent=nTotal;

  let body='',cumT=0,sMF=0,sDev=0;
  cls.forEach(c=>{
    cumT+=c.f;const mf=c.m*c.f;const dv=c.f*Math.pow(c.m-mean,2);sMF+=mf;sDev+=dv;
    body+=`<tr><td>[${fmt(c.li)} – ${fmt(c.ls)}[</td><td>${fmt(c.m)}</td><td>${c.f}</td><td>${cumT}</td><td>${fmt(mf)}</td><td>${fmt(dv)}</td></tr>`;
  });
  document.getElementById('p2-detail-body').innerHTML=body;
  document.getElementById('p2-detail-foot').innerHTML=`<tr><td><b>Σ</b></td><td>—</td><td><b>${nTotal}</b></td><td>—</td><td><b>${fmt(sMF)}</b></td><td><b>${fmt(sDev)}</b></td></tr>`;

  const kUser = parseInt(document.getElementById('p2-nclasses').value);
  const kInfo = (isNaN(kUser)||kUser<2) ? `${cls.length} classes (Regra de Sturges: k = 1 + 3,322·log₁₀(${n}) ≈ ${cls.length})` : `${cls.length} classes (definido pelo usuário)`;
  document.getElementById('p2-formulas').innerHTML=`
    <b>Classes geradas:</b> ${kInfo} · amplitude h = ${fmt(h)}<br>
    <b>Média:</b> x̄ = Σ(mᵢ·fᵢ) / Σfᵢ = ${fmt(sMF)} / ${nTotal} = <b>${fmt(mean)}</b><br>
    <b>Mediana:</b> Md = lᵢ + [(n/2 − Fac) / fᵢ] · h = ${fmt(mc.li)} + [(${fmt(half)} − ${mc.cumBefore}) / ${mc.f}] · ${fmt(hMc)} = <b>${fmt(median)}</b><br>
    <b>Moda (Czuber):</b> classe modal [${fmt(cls[moIdx].li)} – ${fmt(cls[moIdx].ls)}[  →  Mo = <b>${fmt(mo)}</b><br>
    <b>Amplitude:</b> AT = L<sub>k</sub> − l₁ = ${fmt(cls[cls.length-1].ls)} − ${fmt(cls[0].li)} = <b>${fmt(range)}</b><br>
    <b>Desvio Padrão:</b> σ = √[Σfᵢ(mᵢ−x̄)² / n] = √[${fmt(sDev)} / ${nTotal}] = <b>${fmt(std)}</b>
  `;
  document.getElementById('p2-results').style.display='block';
}

function rmRow(id){const el=document.getElementById(id);if(el)el.remove();}

function tick(){
  const now=new Date();
  document.getElementById('clock').innerHTML=
    now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'<br>'+
    '<span style="font-size:10px">'+now.toLocaleDateString('pt-BR')+'</span>';
}

(()=>{ tick(); setInterval(tick,10000); })();

const ttBox = document.getElementById('tooltip-box');
document.querySelectorAll('.th-tip').forEach(el => {
  el.addEventListener('mouseenter', e => {
    ttBox.textContent = el.getAttribute('data-tip');
    ttBox.style.display = 'block';
  });
  el.addEventListener('mousemove', e => {
    let x = e.clientX + 14, y = e.clientY - 10;
    if (x + 250 > window.innerWidth) x = e.clientX - 260;
    if (y + 80 > window.innerHeight) y = e.clientY - 90;
    ttBox.style.left = x + 'px';
    ttBox.style.top = y + 'px';
  });
  el.addEventListener('mouseleave', () => { ttBox.style.display = 'none'; });
});