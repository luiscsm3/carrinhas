const firebaseConfig = {
  apiKey: "AIzaSyAbNKlWYSe1rIn1t5yFS8kgJlwWggn5eLQ",
  authDomain: "sugestoes-f03d9.firebaseapp.com",
  projectId: "sugestoes-f03d9",
  storageBucket: "sugestoes-f03d9.firebasestorage.app",
  messagingSenderId: "640972402801",
  appId: "1:640972402801:web:c1aaf57020fb7e1f05abd0"
};

firebase.initializeApp(firebaseConfig);

// ─── SEGURANÇA — HASH SHA-256 ─────────────────────────

async function hashSenha(senha) {
  const data = new TextEncoder().encode(senha);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function verificarSenha(input, stored) {
  // Suporte a passwords antigas (plain text) → migra automaticamente para hash
  if (stored.length !== 64) return input === stored;
  return (await hashSenha(input)) === stored;
}

// ─── TEMA ─────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtns(next);
  atualizarFavicon(next);
}

function atualizarFavicon(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    if (theme === 'light') {
      ctx.filter = 'invert(1)';
    }
    ctx.drawImage(img, 0, 0, 32, 32);
    const link = document.querySelector("link[rel='icon']");
    if (link) link.href = canvas.toDataURL();
  };
  img.src = '35.png';
}

const ICON_SUN  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const ICON_MOON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const ICON_GRID = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
const ICON_LIST = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
const ICON_COMPACT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_EXPORT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

function updateThemeBtns(theme) {
  const icon = theme === 'light' ? ICON_MOON : ICON_SUN;
  document.querySelectorAll('[id^="btn-theme"]').forEach(b => { b.innerHTML = icon; });
}

(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  window.addEventListener('DOMContentLoaded', () => {
    updateThemeBtns(saved);
    initFiltroChips();
    const bv = document.getElementById('btn-view-toggle');
    if (bv) bv.innerHTML = viewMode === 'table' ? ICON_LIST : ICON_GRID;
    const bc = document.getElementById('btn-compact');
    if (bc) bc.innerHTML = ICON_COMPACT;
    const bex = document.querySelector('[onclick="exportarDados()"]');
    if (bex) bex.innerHTML = ICON_EXPORT;
  });
})();

window.toggleTheme = toggleTheme;
const db = firebase.firestore();

let perfilAtual = null;
let unsubCarrinhas = null;
let viewMode = localStorage.getItem('viewMode') || 'cards';
let _compactMode = false;
let _sortField = null;
let _sortDir = 1;

function toggleViewMode() {
  viewMode = viewMode === 'cards' ? 'table' : 'cards';
  localStorage.setItem('viewMode', viewMode);
  _sortField = null; _sortDir = 1;
  const btn = document.getElementById('btn-view-toggle');
  if (btn) btn.innerHTML = viewMode === 'cards' ? ICON_GRID : ICON_LIST;
  const btnC = document.getElementById('btn-compact');
  if (btnC) btnC.style.display = viewMode === 'table' ? '' : 'none';
  if (unsubCarrinhas) unsubCarrinhas();
  unsubCarrinhas = db.collection('perfis').doc(perfilAtual).collection('carrinhas')
    .orderBy('matricula').onSnapshot(snap => {
      renderCarrinhas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}
window.toggleViewMode = toggleViewMode;

function toggleCompactMode() {
  _compactMode = !_compactMode;
  const btn = document.getElementById('btn-compact');
  if (btn) { btn.title = _compactMode ? 'Modo normal' : 'Modo compacto'; btn.style.opacity = _compactMode ? '1' : ''; }
  const wrap = document.querySelector('.table-wrap');
  if (wrap) wrap.classList.toggle('compact', _compactMode);
}
window.toggleCompactMode = toggleCompactMode;

function sortTable(field) {
  if (_sortField === field) _sortDir *= -1;
  else { _sortField = field; _sortDir = 1; }
  aplicarFiltros();
}
window.sortTable = sortTable;

const CARGA_CLASS = {
  'Vazio': 'carga-vazio',
  'Petróleo': 'carga-petroleo',
  'Ópio': 'carga-opio',
  'Metafetamina': 'carga-meta',
  'Cocaína': 'carga-cocaina',
  'Materiais': 'carga-materiais',
  'Armas': 'carga-armas',
  'Dinheiro Sujo': 'carga-dinheiro',
  'Erva': 'carga-erva',
  'CAIXAS': 'carga-caixas',
  'Cenas Random': 'carga-random'
};

const STATUS_CLASS = {
  'Vazio': 'status-vazio',
  'Processado': 'status-processado',
  'Não Processado': 'status-nprocessado'
};

const CARGA_OPTS = ['Vazio','Petróleo','Ópio','Metafetamina','Cocaína','Materiais','Armas','Dinheiro Sujo','Erva','CAIXAS','Cenas Random'];
const STATUS_OPTS = ['Vazio','Processado','Não Processado'];

// ─── PERFIS ───────────────────────────────────────────

db.collection('perfis').orderBy('nome').onSnapshot(snap => {
  const perfis = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderPerfis(perfis);
});

function renderPerfis(perfis) {
  const grid = document.getElementById('perfis-grid');
  const empty = document.getElementById('perfis-empty');
  if (!perfis.length) { grid.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';

  grid.innerHTML = perfis.map((p, i) => `
    <div class="perfil-card" onclick="tentarAbrirPerfil('${p.id}','${esc(p.nome)}')" style="animation-delay:${i * 70}ms">
      <button class="perfil-del" onclick="event.stopPropagation(); eliminarPerfil('${p.id}','${esc(p.nome)}')" title="Eliminar">×</button>
      ${p.foto ? `<div class="perfil-bg" style="background-image:url('${esc(p.foto)}')"></div>` : `<div class="perfil-bg perfil-bg-gradient"></div>`}
      <div class="perfil-card-top">
        <div class="perfil-avatar" onclick="event.stopPropagation(); abrirImgPerfil('${p.id}')">
          ${p.foto
            ? `<img src="${esc(p.foto)}" class="perfil-avatar-img" />`
            : `<span>${p.nome.charAt(0).toUpperCase()}</span>`}
          <div class="perfil-avatar-overlay">✎</div>
        </div>
        <button class="perfil-senha-btn" onclick="event.stopPropagation(); abrirEditarPerfil('${p.id}','${esc(p.nome)}')" title="Alterar palavra-passe">🔑</button>
      </div>
      <div class="perfil-body">
        <div class="perfil-nome">${esc(p.nome)} ${p.senha ? '<span class="perfil-lock">🔒</span>' : ''}</div>
        <div class="perfil-stats-row" id="stats-row-${p.id}">
          <span class="perfil-stat-pill" id="pill-total-${p.id}">— veículos</span>
          <span class="perfil-stat-pill perfil-stat-active" id="pill-uso-${p.id}">— em uso</span>
        </div>
        <div class="perfil-usage">
          <div class="perfil-usage-bar"><div class="perfil-usage-fill" id="fill-${p.id}" style="width:0%"></div></div>
        </div>
      </div>
      <div class="perfil-enter-hint">Entrar →</div>
    </div>
  `).join('');

  // Carregar contadores + hero stats
  let globalTotal = 0, globalUso = 0, loaded = 0;
  perfis.forEach(p => {
    db.collection('perfis').doc(p.id).collection('carrinhas').get().then(snap => {
      const total = snap.size;
      const emUso = snap.docs.filter(d => d.data().carga && d.data().carga !== 'Vazio').length;
      const proc  = snap.docs.filter(d => d.data().status === 'Processado').length;
      globalTotal += total; globalUso += emUso; loaded++;

      const pillTotal = document.getElementById(`pill-total-${p.id}`);
      const pillUso   = document.getElementById(`pill-uso-${p.id}`);
      const fill      = document.getElementById(`fill-${p.id}`);
      if (pillTotal) pillTotal.textContent = `${total} veículo${total !== 1 ? 's' : ''}`;
      if (pillUso)   pillUso.textContent   = total === 0 ? 'Vazio' : `${emUso} em uso`;
      if (fill) fill.style.width = total === 0 ? '0%' : `${Math.round(emUso / total * 100)}%`;

      if (loaded === perfis.length) renderHeroStats(globalTotal, globalUso, perfis.length);
    });
  });
}

function renderHeroStats(total, emUso, nPerfis) {
  const el = document.getElementById('perfis-hero-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="hero-stat"><span class="hero-stat-val">${nPerfis}</span><span class="hero-stat-label">Perfis</span></div>
    <div class="hero-stat-div"></div>
    <div class="hero-stat"><span class="hero-stat-val">${total}</span><span class="hero-stat-label">Veículos</span></div>
    <div class="hero-stat-div"></div>
    <div class="hero-stat"><span class="hero-stat-val" style="color:var(--green)">${emUso}</span><span class="hero-stat-label">Em uso</span></div>
  `;
}

async function criarPerfil() {
  const nome = document.getElementById('m-perfil-nome').value.trim();
  if (!nome) { toast('Indica um nome.'); return; }
  const senhaRaw = document.getElementById('m-perfil-senha').value;
  if (!senhaRaw) { toast('Indica uma palavra-passe.'); return; }
  const senha = await hashSenha(senhaRaw);
  const dados = { nome, senha, criadoEm: new Date().toISOString() };
  await db.collection('perfis').add(dados);
  fecharModal('modal-perfil');
  document.getElementById('m-perfil-nome').value = '';
  document.getElementById('m-perfil-senha').value = '';
  toast('Perfil criado!');
}

async function eliminarPerfil(id, nome) {
  document.getElementById('modal-senha-desc').textContent = `Confirmar eliminação: ${nome}`;
  document.getElementById('m-senha-input').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('modal-senha').classList.add('open');
  setTimeout(() => document.getElementById('m-senha-input').focus(), 100);
  _senhaCallback = async (input) => {
    const snap = await db.collection('perfis').doc(id).get();
    if (!(await verificarSenha(input, snap.data().senha))) return false;
    fecharModal('modal-senha');
    if (!(await confirmar(`Eliminar o perfil "${nome}" e todas as suas carrinhas?`, 'Eliminar'))) return true;
    const carrinhas = await db.collection('perfis').doc(id).collection('carrinhas').get();
    await Promise.all(carrinhas.docs.map(d => d.ref.delete()));
    await db.collection('perfis').doc(id).delete();
    toast('Perfil eliminado.');
    return true;
  };
}

// ─── PALAVRA-PASSE ────────────────────────────────────

let _senhaCallback = null;

function tentarAbrirPerfil(id, nome) {
  // Verificar sessão guardada
  if (sessionStorage.getItem(`auth_${id}`) === '1') {
    abrirPerfil(id, nome);
    return;
  }
  document.getElementById('modal-senha-desc').textContent = `Perfil: ${nome}`;
  document.getElementById('m-senha-input').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('cb-lembrar').checked = false;
  document.getElementById('modal-senha').classList.add('open');
  setTimeout(() => document.getElementById('m-senha-input').focus(), 100);
  _senhaCallback = async (input) => {
    const snap = await db.collection('perfis').doc(id).get();
    const stored = snap.data().senha;
    if (!(await verificarSenha(input, stored))) return false;
    if (stored.length !== 64) await db.collection('perfis').doc(id).update({ senha: await hashSenha(input) });
    if (document.getElementById('cb-lembrar').checked) {
      sessionStorage.setItem(`auth_${id}`, '1');
    }
    fecharModal('modal-senha');
    abrirPerfil(id, nome);
    return true;
  };
}

async function confirmarSenha() {
  const input = document.getElementById('m-senha-input').value;
  const ok = await _senhaCallback(input);
  if (!ok) {
    document.getElementById('senha-erro').style.display = '';
    document.getElementById('m-senha-input').value = '';
    document.getElementById('m-senha-input').focus();
  }
}

function fecharModalSenha(e) { if (e.target === e.currentTarget) fecharModal('modal-senha'); }

// ─── CARRINHAS ────────────────────────────────────────

function abrirPerfil(id, nome) {
  perfilAtual = id;
  document.getElementById('perfil-nome-titulo').textContent = nome;
  document.getElementById('view-perfis').style.display = 'none';
  document.getElementById('view-carrinhas').style.display = '';

  if (unsubCarrinhas) unsubCarrinhas();
  unsubCarrinhas = db.collection('perfis').doc(id).collection('carrinhas')
    .orderBy('matricula')
    .onSnapshot(snap => {
      const carrinhas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCarrinhas(carrinhas);
    });
}

function voltarPerfis() {
  if (unsubCarrinhas) { unsubCarrinhas(); unsubCarrinhas = null; }
  perfilAtual = null;
  document.getElementById('view-carrinhas').style.display = 'none';
  document.getElementById('view-perfis').style.display = '';
}

function renderCarrinhas(carrinhas) {
  _todasCarrinhas = carrinhas;
  atualizarFiltroMarcas(carrinhas);
  renderStatsPanel(carrinhas);
  aplicarFiltros();
}

function renderStatsPanel(carrinhas) {
  const panel = document.getElementById('stats-panel');
  if (!panel) return;
  if (!carrinhas.length) { panel.innerHTML = ''; return; }

  const total    = carrinhas.length;
  const comCarga = carrinhas.filter(c => c.carga && c.carga !== 'Vazio').length;
  const proc     = carrinhas.filter(c => c.status === 'Processado').length;
  const nproc    = carrinhas.filter(c => c.status === 'Não Processado').length;

  const byCarga = {};
  carrinhas.forEach(c => {
    if (c.carga && c.carga !== 'Vazio') byCarga[c.carga] = (byCarga[c.carga] || 0) + 1;
  });
  // Chips coloridos por carga, clicáveis para filtrar
  const CARGA_CHIP_STYLE = {
    'Petróleo':      'background:#14532d;color:#bbf7d0;border-color:#16a34a44',
    'Ópio':          'background:#2e1065;color:#ddd6fe;border-color:#7c3aed44',
    'Metafetamina':  'background:#701a75;color:#fae8ff;border-color:#c026d344',
    'Cocaína':       'background:#78350f;color:#fde68a;border-color:#d9770644',
    'Materiais':     'background:#7f1d1d;color:#fee2e2;border-color:#dc262644',
    'Armas':         'background:#1e3a8a;color:#bfdbfe;border-color:#2563eb44',
    'Dinheiro Sujo': 'background:#064e3b;color:#a7f3d0;border-color:#10b98144',
    'Erva':          'background:#365314;color:#d9f99d;border-color:#65a30d44',
    'CAIXAS':        'background:#713f12;color:#fef9c3;border-color:#ca8a0444',
    'Cenas Random':  'background:#831843;color:#fce7f3;border-color:#db277744',
  };
  const cargaChips = Object.entries(byCarga)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => {
      const st = CARGA_CHIP_STYLE[k] || 'background:var(--surface3);color:var(--text-muted)';
      return `<div class="stat-carga-chip" style="${st};border:1px solid" onclick="toggleFiltroChip('carga','${esc(k)}')" title="Filtrar por ${esc(k)}">
        <span class="stat-carga-count">${v}</span>
        <span>${esc(k)}</span>
      </div>`;
    }).join('');

  panel.innerHTML = `
    <div class="stat-item"><span class="stat-val">${total}</span><span class="stat-label">Total</span></div>
    <div class="stat-item"><span class="stat-val stat-green">${comCarga}</span><span class="stat-label">Com Carga</span></div>
    <div class="stat-item"><span class="stat-val">${proc}</span><span class="stat-label">Processados</span></div>
    <div class="stat-item"><span class="stat-val stat-yellow">${nproc}</span><span class="stat-label">Por Processar</span></div>
    ${cargaChips}
  `;
}

function renderCarrinhasInterno(carrinhas) {
  const emUso = carrinhas.filter(c => c.carga && c.carga !== 'Vazio').length;
  const tipos = { '🚐': 0, '🚗': 0, '🏍️': 0, '⛵': 0 };
  carrinhas.forEach(c => {
    const icon = c.tipoVeiculo === 'Carro' ? '🚗' : c.tipoVeiculo === 'Mota' ? '🏍️' : c.tipoVeiculo === 'Barco' ? '⛵' : '🚐';
    tipos[icon]++;
  });
  const tiposStr = Object.entries(tipos).filter(([,v]) => v > 0).map(([k,v]) => `${v}${k}`).join(' ');
  document.getElementById('perfil-contador').textContent = `${emUso} / ${carrinhas.length} em uso  •  ${tiposStr}`;

  const grid = document.getElementById('carrinhas-grid');
  const empty = document.getElementById('carrinhas-empty');

  if (!carrinhas.length) {
    grid.innerHTML = '';
    const filtrosAtivos = contarFiltrosAtivos(getFiltros()) > 0;
    empty.innerHTML = filtrosAtivos
      ? `<div class="empty-filter-state">
           <div class="empty-filter-icon">🔍</div>
           <div class="empty-filter-title">Nenhum veículo encontrado</div>
           <div class="empty-filter-sub">Nenhum veículo corresponde aos filtros activos.</div>
           <button class="btn-ghost" onclick="limparFiltros()">✕ Limpar filtros</button>
         </div>`
      : `<div class="empty-state"><div class="empty-icon">🚐</div><p>Ainda não há veículos neste perfil.</p></div>`;
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  const btn = document.getElementById('btn-view-toggle');
  if (btn) btn.innerHTML = viewMode === 'cards' ? ICON_GRID : ICON_LIST;
  const btnC = document.getElementById('btn-compact');
  if (btnC) { btnC.style.display = viewMode === 'table' ? '' : 'none'; btnC.innerHTML = ICON_COMPACT; }

  if (viewMode === 'table') { renderTabela(carrinhas, grid); return; }

  // Ordenar por campo `ordem`, depois por matrícula
  carrinhas.sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || (a.matricula || '').localeCompare(b.matricula || ''));

  // Agrupar por marca
  const grupos = {};
  carrinhas.forEach(c => {
    const marca = c.marca?.trim() || '—';
    if (!grupos[marca]) grupos[marca] = [];
    grupos[marca].push(c);
  });

  const marcasBruto = Object.keys(grupos).sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b));
  const marcasOrdenadas = getMarcaOrdem(marcasBruto);

  const cardBgClass = (carga, status) => {
    const c = (carga || '').toLowerCase().replace(' ', '-').replace('é','e').replace('ó','o').replace('ã','a');
    const s = status === 'Processado' ? 'proc' : status === 'Não Processado' ? 'nproc' : 'vazio';
    return `card-bg-${c} card-st-${s}`;
  };

  const carrinhaCard = c => `<div class="carrinha-card ${cardBgClass(c.carga, c.status)}" draggable="true" data-id="${c.id}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dragDrop(event)" ondragend="dragEnd(event)">
    <div class="carrinha-img">
      ${c.imagem
        ? `<img src="${esc(c.imagem)}" class="carrinha-img-foto" onclick="abrirLightbox('${esc(c.imagem)}')" />
           <button class="carrinha-img-edit" onclick="abrirImgModal('${c.id}','${esc(c.imagem)}')">✎</button>`
        : `<span class="carrinha-img-plus" onclick="abrirImgModal('${c.id}','')">+</span>`}
    </div>
    <div class="card-content">
      <div class="carrinha-marca-inline" onclick="filtrarPorMarca('${esc(c.marca || '')}')" title="Filtrar por esta marca">${esc(c.marca || '—')}</div>
      <div class="card-placa">
        <select class="select-tipo-veiculo" onchange="updateCarrinha('${c.id}','tipoVeiculo',this.value)">
          <option value="Carrinha" ${(c.tipoVeiculo||'Carrinha')==='Carrinha'?'selected':''}>🚐</option>
          <option value="Carro"    ${c.tipoVeiculo==='Carro'?'selected':''}>🚗</option>
          <option value="Mota"     ${c.tipoVeiculo==='Mota'?'selected':''}>🏍️</option>
          <option value="Barco"    ${c.tipoVeiculo==='Barco'?'selected':''}>⛵</option>
        </select>
        <span class="carrinha-matricula-text" onclick="editarCampoCard(event,'${c.id}','matricula','${esc(c.matricula || '')}')">${esc(c.matricula || '—')}</span>
      </div>
      <div class="carrinha-badges">
        ${selectInline(c.id, 'carga', c.carga, CARGA_OPTS, 'badge-carga', CARGA_CLASS)}
        ${selectInline(c.id, 'status', c.status, STATUS_OPTS, 'badge-status', STATUS_CLASS)}
      </div>
      <div class="carrinha-fields">
        ${c.estado
          ? `<textarea class="carrinha-input" placeholder="Estado..." onchange="updateCarrinha('${c.id}','estado',this.value)" oninput="autoResize(this)">${esc(c.estado)}</textarea>`
          : `<button class="field-add-btn" onclick="expandField(this,'${c.id}','estado')">+ Estado</button>`}
        ${c.notas
          ? `<textarea class="carrinha-input" placeholder="Notas..." onchange="updateCarrinha('${c.id}','notas',this.value)" oninput="autoResize(this)">${esc(c.notas)}</textarea>`
          : `<button class="field-add-btn" onclick="expandField(this,'${c.id}','notas')">+ Notas</button>`}
      </div>
    </div>
    <div class="card-bottom-actions">
      <button class="card-hist-btn" onclick="verHistorico('${c.id}')" title="Histórico">⟳</button>
      <button class="carrinha-btn-del" onclick="eliminarCarrinha('${c.id}')">Remover</button>
    </div>
  </div>`;

  const addCard = marca => `
    <div class="carrinha-card carrinha-card-add" onclick="abrirModalCarrinhaMarca('${esc(marca)}')">
      <div class="carrinha-card-add-inner">+</div>
    </div>`;

  grid.innerHTML = marcasOrdenadas.map((marca, i) => `
    <div class="marca-grupo" data-marca="${esc(marca)}"
      style="animation-delay:${i * 55}ms"
      draggable="true"
      ondragstart="dragMarcaStart(event)"
      ondragover="dragMarcaOver(event)"
      ondragleave="dragMarcaLeave(event)"
      ondrop="dragMarcaDrop(event)"
      ondragend="dragMarcaEnd(event)">
      <div class="marca-header" onclick="toggleMarca(this)">
        <span class="marca-drag-handle" title="Arrastar para reordenar">⠿</span>
        <span class="marca-chevron">▾</span>
        <span class="marca-nome">${esc(marca)}</span>
        <span class="marca-count">${grupos[marca].length} carrinha${grupos[marca].length !== 1 ? 's' : ''}</span>
      </div>
      <div class="marca-cards">
        ${grupos[marca].map(carrinhaCard).join('')}
        ${addCard(marca)}
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.carrinha-input').forEach(el => autoResize(el));
}

function renderTabela(carrinhas, grid) {
  let sorted = [...carrinhas];
  if (_sortField) {
    sorted.sort((a, b) => {
      const av = (a[_sortField] || '').toString().toLowerCase();
      const bv = (b[_sortField] || '').toString().toLowerCase();
      return av.localeCompare(bv) * _sortDir;
    });
  } else {
    sorted.sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));
  }

  const thSort = (label, field) => {
    const active = _sortField === field;
    const cls = active ? (_sortDir === 1 ? 'sort-asc' : 'sort-desc') : '';
    return `<th class="sortable ${cls}" onclick="sortTable('${field}')">${label}</th>`;
  };

  grid.innerHTML = `
    <div class="table-wrap${_compactMode ? ' compact' : ''}">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Img</th>
            <th>Tipo</th>
            ${thSort('Marca', 'marca')}
            ${thSort('Matrícula', 'matricula')}
            ${thSort('Carga', 'carga')}
            ${thSort('Status', 'status')}
            ${thSort('Estado', 'estado')}
            ${thSort('Notas', 'notas')}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(c => `
            <tr draggable="true" data-id="${c.id}"
              ondragstart="dragRowStart(event)"
              ondragover="dragRowOver(event)"
              ondragleave="dragRowLeave(event)"
              ondrop="dragRowDrop(event)"
              ondragend="dragRowEnd(event)">
              <td class="td-img td-drag-handle">⠿</td>
              <td class="td-img">
                ${c.imagem
                  ? `<img class="td-thumb" src="${esc(c.imagem)}" onclick="abrirLightbox('${esc(c.imagem)}')" />`
                  : `<button class="btn-add-img" onclick="abrirImgModal('${c.id}','')">+</button>`}
              </td>
              <td style="font-size:16px;">${c.tipoVeiculo === 'Carro' ? '🚗' : c.tipoVeiculo === 'Mota' ? '🏍️' : c.tipoVeiculo === 'Barco' ? '⛵' : '🚐'}</td>
              <td class="td-marca-edit"><span onclick="editarCampoCard(event,'${c.id}','marca','${esc(c.marca || '')}')">${esc(c.marca || '—')}</span></td>
              <td class="td-matricula"><span onclick="editarCampoCard(event,'${c.id}','matricula','${esc(c.matricula || '')}')">${esc(c.matricula || '—')}</span></td>
              <td>${selectInline(c.id, 'carga', c.carga, CARGA_OPTS, 'badge-carga', CARGA_CLASS)}</td>
              <td>${selectInline(c.id, 'status', c.status, STATUS_OPTS, 'badge-status', STATUS_CLASS)}</td>
              <td><input class="input-inline" value="${esc(c.estado || '')}" placeholder="—" onchange="updateCarrinha('${c.id}','estado',this.value)" /></td>
              <td><input class="input-inline" value="${esc(c.notas || '')}" placeholder="—" onchange="updateCarrinha('${c.id}','notas',this.value)" /></td>
              <td style="display:flex;gap:4px;align-items:center;">
                <button class="card-hist-btn" onclick="verHistorico('${c.id}')" title="Histórico">⟳</button>
                <button class="btn-del" onclick="eliminarCarrinha('${c.id}')">×</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function selectInline(id, field, value, opts, badgeClass, classMap) {
  const options = opts.map(o => `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`).join('');
  return `<select class="select-inline ${badgeClass} ${classMap[value] || ''}" onchange="updateCarrinha('${id}','${field}',this.value); this.className='select-inline ${badgeClass} '+getClass(this.value,'${field}')">
    <option value="">—</option>${options}
  </select>`;
}

function getClass(value, field) {
  if (field === 'carga') return CARGA_CLASS[value] || '';
  if (field === 'status') return STATUS_CLASS[value] || '';
  return '';
}

async function adicionarCarrinha() {
  const matricula = document.getElementById('m-matricula').value.trim();
  if (!matricula) { toast('Indica a matrícula.'); return; }
  const carga = document.getElementById('m-carga').value;
  const status = document.getElementById('m-status').value;
  const estado = document.getElementById('m-estado').value.trim();
  const notas = document.getElementById('m-notas').value.trim();

  const marca = document.getElementById('m-marca').value.trim();
  const tipoVeiculo = document.getElementById('m-tipo-veiculo').value;
  await db.collection('perfis').doc(perfilAtual).collection('carrinhas').add({
    tipoVeiculo, marca, matricula, carga, status, estado, notas
  });

  fecharModal('modal-carrinha');
  document.getElementById('m-tipo-veiculo').value = 'Carrinha';
  document.getElementById('m-marca').value = '';
  document.getElementById('m-matricula').value = '';
  document.getElementById('m-carga').value = '';
  document.getElementById('m-status').value = '';
  document.getElementById('m-estado').value = '';
  document.getElementById('m-notas').value = '';
  toast('Carrinha adicionada!');
}

async function updateCarrinha(id, field, value) {
  mostrarSync('A guardar...');
  const carrinha = _todasCarrinhas.find(c => c.id === id);
  const valorAnterior = carrinha ? (carrinha[field] ?? '') : '';
  const update = { [field]: value };
  if (valorAnterior !== value && field !== 'ordem' && field !== 'imagem') {
    const entrada = { campo: field, anterior: String(valorAnterior), novo: String(value), ts: new Date().toISOString() };
    const historico = (carrinha?.historico || []).slice(0, 9);
    update.historico = [entrada, ...historico];
  }
  await db.collection('perfis').doc(perfilAtual).collection('carrinhas').doc(id).update(update);
  mostrarSync('✓ Guardado', true);
}

function verHistorico(id) {
  const carrinha = _todasCarrinhas.find(c => c.id === id);
  if (!carrinha) return;
  const historico = carrinha.historico || [];
  const lista = document.getElementById('historico-lista');
  document.getElementById('modal-historico-titulo').textContent = `Histórico — ${carrinha.matricula || '?'}`;
  if (!historico.length) {
    lista.innerHTML = '<div class="historico-vazio">Sem alterações registadas.</div>';
  } else {
    lista.innerHTML = historico.map(h => `
      <div class="historico-item">
        <span class="historico-campo">${esc(h.campo)}</span>
        <span class="historico-anterior">${esc(h.anterior || '—')}</span>
        <span class="historico-arrow">→</span>
        <span class="historico-novo">${esc(h.novo || '—')}</span>
        <span class="historico-ts">${new Date(h.ts).toLocaleString('pt-PT')}</span>
      </div>
    `).join('');
  }
  document.getElementById('modal-historico').classList.add('open');
}
window.verHistorico = verHistorico;

function filtrarPorMarca(marca) {
  const sel = document.getElementById('filtro-marca');
  if (!sel) return;
  sel.value = marca || '—';
  aplicarFiltros();
  // Scroll to filtros
  document.getElementById('filtros-bar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
window.filtrarPorMarca = filtrarPorMarca;

async function eliminarCarrinha(id) {
  if (!(await confirmar('Remover este veículo?', 'Remover'))) return;
  await db.collection('perfis').doc(perfilAtual).collection('carrinhas').doc(id).delete();
  toast('Removido.');
}

// ─── IMAGEM PERFIL ────────────────────────────────────

let _imgPerfilId = null;

function abrirImgPerfil(id) {
  document.getElementById('modal-senha-desc').textContent = 'Confirmar identidade para editar foto';
  document.getElementById('m-senha-input').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('modal-senha').classList.add('open');
  setTimeout(() => document.getElementById('m-senha-input').focus(), 100);
  _senhaCallback = async (input) => {
    const snap = await db.collection('perfis').doc(id).get();
    if (!(await verificarSenha(input, snap.data().senha))) return false;
    fecharModal('modal-senha');
    _imgPerfilId = id;
    _imgCarrinhaId = null;
    document.getElementById('m-img-url').value = '';
    document.getElementById('img-preview').src = '';
    document.getElementById('img-preview').style.display = 'none';
    document.getElementById('img-paste-hint').style.display = '';
    document.getElementById('modal-img-titulo').textContent = '📷 Foto do Perfil';
    document.getElementById('modal-img').classList.add('open');
    setTimeout(() => document.getElementById('img-paste-zone').focus(), 100);
    return true;
  };
}

async function guardarFotoPerfil(src) {
  await db.collection('perfis').doc(_imgPerfilId).update({ foto: src });
  toast('Foto atualizada.');
}

// ─── IMAGEM ───────────────────────────────────────────

let _imgCarrinhaId = null;
let _imgDataAtual = '';

function abrirImgModal(id, urlAtual) {
  _imgCarrinhaId = id;
  _imgPerfilId = null;
  document.getElementById('modal-img-titulo').textContent = '📷 Imagem';
  _imgDataAtual = urlAtual;
  document.getElementById('m-img-url').value = urlAtual.startsWith('data:') ? '' : urlAtual;
  const img = document.getElementById('img-preview');
  const hint = document.getElementById('img-paste-hint');
  if (urlAtual) {
    img.src = urlAtual;
    img.style.display = '';
    hint.style.display = 'none';
  } else {
    img.src = '';
    img.style.display = 'none';
    hint.style.display = '';
  }
  document.getElementById('modal-img').classList.add('open');
  setTimeout(() => document.getElementById('img-paste-zone').focus(), 100);
}

function setImgPreview(src) {
  _imgDataAtual = src;
  const img = document.getElementById('img-preview');
  const hint = document.getElementById('img-paste-hint');
  img.src = src;
  img.style.display = src ? '' : 'none';
  hint.style.display = src ? 'none' : '';
}

function previewImgUrl() {
  const url = document.getElementById('m-img-url').value.trim();
  setImgPreview(url);
}

function comprimirImagem(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const imgEl = new Image();
    imgEl.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 900;
      let w = imgEl.width, h = imgEl.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    imgEl.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function carregarFicheiro(input) {
  const file = input.files[0];
  if (!file) return;
  comprimirImagem(file, src => {
    document.getElementById('m-img-url').value = '';
    setImgPreview(src);
    toast('Imagem carregada!');
  });
  input.value = '';
}

window.carregarFicheiro = carregarFicheiro;

document.addEventListener('paste', e => {
  if (!document.getElementById('modal-img').classList.contains('open')) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      comprimirImagem(item.getAsFile(), src => {
        document.getElementById('m-img-url').value = '';
        setImgPreview(src);
        toast('Imagem colada!');
      });
      break;
    }
  }
});

async function guardarImagem() {
  const url = document.getElementById('m-img-url').value.trim();
  const final = url || _imgDataAtual;
  if (_imgPerfilId) {
    await guardarFotoPerfil(final);
  } else {
    await updateCarrinha(_imgCarrinhaId, 'imagem', final);
    toast('Imagem guardada.');
  }
  fecharModal('modal-img');
}

async function removerImagem() {
  if (_imgPerfilId) {
    await db.collection('perfis').doc(_imgPerfilId).update({ foto: '' });
    toast('Foto removida.');
  } else {
    await updateCarrinha(_imgCarrinhaId, 'imagem', '');
    toast('Imagem removida.');
  }
  _imgDataAtual = '';
  fecharModal('modal-img');
}

window.abrirImgModal = abrirImgModal;
window.abrirImgPerfil = abrirImgPerfil;
window.previewImgUrl = previewImgUrl;
window.guardarImagem = guardarImagem;
window.removerImagem = removerImagem;

// ─── MODAIS ───────────────────────────────────────────

function abrirModalPerfil() {
  document.getElementById('modal-perfil').classList.add('open');
  setTimeout(() => document.getElementById('m-perfil-nome').focus(), 100);
}

function abrirModalCarrinha() {
  document.getElementById('m-marca').value = '';
  document.getElementById('modal-carrinha').classList.add('open');
  setTimeout(() => document.getElementById('m-marca').focus(), 100);
}

function abrirModalCarrinhaMarca(marca) {
  document.getElementById('m-marca').value = marca;
  document.getElementById('modal-carrinha').classList.add('open');
  setTimeout(() => document.getElementById('m-matricula').focus(), 100);
}

window.abrirModalCarrinhaMarca = abrirModalCarrinhaMarca;

// ─── DRAG & DROP TABELA ───────────────────────────────

let _dragRowId = null;

function dragRowStart(e) {
  _dragRowId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('row-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.stopPropagation();
}

function dragRowOver(e) {
  e.preventDefault();
  e.stopPropagation();
  const tr = e.currentTarget;
  if (tr.dataset.id !== _dragRowId) tr.classList.add('row-drag-over');
}

function dragRowLeave(e) {
  e.currentTarget.classList.remove('row-drag-over');
}

function dragRowEnd(e) {
  document.querySelectorAll('tr[data-id]').forEach(tr => tr.classList.remove('row-dragging', 'row-drag-over'));
}

async function dragRowDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget;
  target.classList.remove('row-drag-over');
  if (!_dragRowId || target.dataset.id === _dragRowId) return;

  const tbody = target.closest('tbody');
  const rows = [...tbody.querySelectorAll('tr[data-id]')];
  const dragEl = tbody.querySelector(`tr[data-id="${_dragRowId}"]`);
  const dragIdx = rows.indexOf(dragEl);
  const targetIdx = rows.indexOf(target);

  if (dragIdx < targetIdx) target.after(dragEl);
  else target.before(dragEl);

  // Guardar nova ordem
  const novaOrdem = [...tbody.querySelectorAll('tr[data-id]')];
  await Promise.all(novaOrdem.map((tr, i) =>
    db.collection('perfis').doc(perfilAtual).collection('carrinhas').doc(tr.dataset.id).update({ ordem: i })
  ));
}

window.dragRowStart = dragRowStart;
window.dragRowOver  = dragRowOver;
window.dragRowLeave = dragRowLeave;
window.dragRowEnd   = dragRowEnd;
window.dragRowDrop  = dragRowDrop;

// ─── DRAG & DROP GRUPOS ───────────────────────────────

let _dragMarca = null;

function dragMarcaStart(e) {
  _dragMarca = e.currentTarget.dataset.marca;
  e.currentTarget.classList.add('marca-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.stopPropagation();
}

function dragMarcaOver(e) {
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget;
  if (target.dataset.marca !== _dragMarca) target.classList.add('marca-drag-over');
}

function dragMarcaLeave(e) {
  e.currentTarget.classList.remove('marca-drag-over');
}

function dragMarcaEnd(e) {
  document.querySelectorAll('.marca-grupo').forEach(el => el.classList.remove('marca-dragging', 'marca-drag-over'));
}

function dragMarcaDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget;
  target.classList.remove('marca-drag-over');
  if (!_dragMarca || target.dataset.marca === _dragMarca) return;

  const grid = document.getElementById('carrinhas-grid');
  const dragEl = grid.querySelector(`.marca-grupo[data-marca="${_dragMarca}"]`);
  const targetEl = target;
  const grupos = [...grid.querySelectorAll('.marca-grupo')];
  const dragIdx = grupos.indexOf(dragEl);
  const targetIdx = grupos.indexOf(targetEl);

  if (dragIdx < targetIdx) targetEl.after(dragEl);
  else targetEl.before(dragEl);

  // Guardar nova ordem
  const novaOrdem = [...grid.querySelectorAll('.marca-grupo')].map(el => el.dataset.marca);
  saveMarcaOrdem(novaOrdem);
}

window.dragMarcaStart = dragMarcaStart;
window.dragMarcaOver  = dragMarcaOver;
window.dragMarcaLeave = dragMarcaLeave;
window.dragMarcaEnd   = dragMarcaEnd;
window.dragMarcaDrop  = dragMarcaDrop;

function getMarcaOrdem(marcas) {
  const key = `marcaOrdem_${perfilAtual}`;
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  // Juntar marcas guardadas com novas que ainda não existem
  const ordenadas = saved.filter(m => marcas.includes(m));
  marcas.forEach(m => { if (!ordenadas.includes(m)) ordenadas.push(m); });
  return ordenadas;
}

function saveMarcaOrdem(ordem) {
  localStorage.setItem(`marcaOrdem_${perfilAtual}`, JSON.stringify(ordem));
}

function moverMarca(marca, dir) {
  const grupos = [...document.querySelectorAll('.marca-grupo')].map(el => el.dataset.marca);
  const idx = grupos.indexOf(marca);
  const novoIdx = idx + dir;
  if (novoIdx < 0 || novoIdx >= grupos.length) return;
  // Trocar no array
  [grupos[idx], grupos[novoIdx]] = [grupos[novoIdx], grupos[idx]];
  saveMarcaOrdem(grupos);
  // Mover no DOM diretamente para ser imediato
  const grid = document.getElementById('carrinhas-grid');
  const els = [...grid.querySelectorAll('.marca-grupo')];
  if (dir === -1) {
    els[novoIdx].before(els[idx]);
  } else {
    els[novoIdx].after(els[idx]);
  }
  // Atualizar botões ▲▼
  atualizarBotoesOrdem();
}

function atualizarBotoesOrdem() {
  const els = [...document.querySelectorAll('.marca-grupo')];
  els.forEach((el, idx) => {
    const btns = el.querySelector('.marca-ordem-btns');
    if (!btns) return;
    const marca = el.dataset.marca;
    btns.innerHTML = `
      ${idx > 0 ? `<button class="marca-ordem-btn" onclick="moverMarca('${marca}',-1)">▲</button>` : '<span class="marca-ordem-btn-vazio"></span>'}
      ${idx < els.length - 1 ? `<button class="marca-ordem-btn" onclick="moverMarca('${marca}',1)">▼</button>` : '<span class="marca-ordem-btn-vazio"></span>'}
    `;
  });
}

window.moverMarca = moverMarca;

function toggleMarca(header) {
  const grupo = header.closest('.marca-grupo');
  const cards = grupo.querySelector('.marca-cards');
  const chevron = header.querySelector('.marca-chevron');
  const collapsed = cards.style.display === 'none';
  cards.style.display = collapsed ? '' : 'none';
  chevron.textContent = collapsed ? '▾' : '▸';
}
window.toggleMarca = toggleMarca;

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

function fecharModalPerfil(e) { if (e.target === e.currentTarget) fecharModal('modal-perfil'); }
function fecharModalCarrinha(e) { if (e.target === e.currentTarget) fecharModal('modal-carrinha'); }

document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  const emInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);
  const emModal = document.querySelector('.modal-overlay.open');

  if (e.key === 'Escape') {
    fecharModal('modal-perfil');
    fecharModal('modal-carrinha');
    fecharModal('modal-senha');
    fecharModal('modal-historico');
    fecharModal('modal-editar-perfil');
    fecharModal('modal-img');
    fecharModal('modal-confirm');
    if (document.getElementById('view-calculadora').style.display !== 'none') fecharCalculadora();
  }
  if (e.key === 'Enter' && document.getElementById('modal-perfil').classList.contains('open')) criarPerfil();
  if (e.key === 'Enter' && document.getElementById('modal-carrinha').classList.contains('open')) adicionarCarrinha();
  if (e.key === 'Enter' && document.getElementById('modal-senha').classList.contains('open')) confirmarSenha();

  // Atalhos rápidos (só quando não estamos num input e sem modal aberto)
  if (!emInput && !emModal) {
    const emCarrinhas = document.getElementById('view-carrinhas').style.display !== 'none';
    if (e.key === 'n' && emCarrinhas) { e.preventDefault(); abrirModalCarrinha(); }
    if (e.key === '/' && emCarrinhas) {
      e.preventDefault();
      const s = document.getElementById('search-carrinhas');
      if (s) { s.focus(); s.select(); }
    }
    if (e.key === 't' && emCarrinhas) { e.preventDefault(); toggleViewMode(); }
  }
});

// ─── SYNC INDICATOR ───────────────────────────────────

let _syncTimer = null;
function mostrarSync(msg, sucesso = false) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.textContent = msg;
  el.className = 'sync-indicator ' + (sucesso ? 'sync-ok' : 'sync-saving');
  clearTimeout(_syncTimer);
  if (sucesso) _syncTimer = setTimeout(() => { el.textContent = ''; el.className = 'sync-indicator'; }, 2000);
}
window.mostrarSync = mostrarSync;

// ─── PESQUISA & FILTROS ───────────────────────────────

let _todasCarrinhas = [];
let _filtrosCarga   = new Set();
let _filtrosStatus  = new Set();

const CARGA_CHIPS_OPTS  = ['Vazio','Petróleo','Ópio','Metafetamina','Cocaína','Materiais','Armas','Dinheiro Sujo','Erva','CAIXAS','Cenas Random'];
const STATUS_CHIPS_OPTS = ['Vazio','Processado','Não Processado'];

function initFiltroChips() {
  const cc = document.getElementById('filtro-carga-chips');
  const sc = document.getElementById('filtro-status-chips');
  if (!cc || !sc) return;
  cc.innerHTML = CARGA_CHIPS_OPTS.map(c =>
    `<button class="filtro-chip" data-carga="${esc(c)}" onclick="toggleFiltroChip('carga','${esc(c)}')">${esc(c)}</button>`
  ).join('');
  sc.innerHTML = STATUS_CHIPS_OPTS.map(s =>
    `<button class="filtro-chip" data-status="${esc(s)}" onclick="toggleFiltroChip('status','${esc(s)}')">${esc(s)}</button>`
  ).join('');
}

function toggleFiltroChip(field, value) {
  const set = field === 'carga' ? _filtrosCarga : _filtrosStatus;
  if (set.has(value)) set.delete(value); else set.add(value);
  const attr = field === 'carga' ? 'data-carga' : 'data-status';
  document.querySelectorAll(`.filtro-chip[${attr}]`).forEach(chip => {
    chip.classList.toggle('active', set.has(chip.getAttribute(attr)));
  });
  aplicarFiltros();
}

window.toggleFiltroChip = toggleFiltroChip;

function atualizarFiltroMarcas(carrinhas) {
  const sel = document.getElementById('filtro-marca');
  if (!sel) return;
  const atual = sel.value;
  const marcas = [...new Set(carrinhas.map(c => c.marca?.trim() || '—'))].sort();
  sel.innerHTML = '<option value="">Todas as marcas</option>' +
    marcas.map(m => `<option value="${esc(m)}" ${atual === m ? 'selected' : ''}>${esc(m)}</option>`).join('');
}

function getFiltros() {
  return {
    pesquisa: (document.getElementById('search-carrinhas')?.value || '').toLowerCase(),
    marca:    document.getElementById('filtro-marca')?.value || '',
    tipo:     document.getElementById('filtro-tipo')?.value || '',
    carga:    _filtrosCarga,
    status:   _filtrosStatus,
  };
}

function contarFiltrosAtivos(f) {
  let n = 0;
  if (f.pesquisa) n++;
  if (f.marca) n++;
  if (f.tipo) n++;
  n += f.carga.size;
  n += f.status.size;
  return n;
}

function aplicarFiltros() {
  const f = getFiltros();
  const n = contarFiltrosAtivos(f);
  const btn = document.getElementById('filtro-limpar');

  const filtradas = _todasCarrinhas.filter(c => {
    if (f.pesquisa) {
      const haystack = [c.matricula, c.marca, c.notas, c.estado, c.carga, c.status]
        .map(v => (v || '').toLowerCase()).join(' ');
      if (!haystack.includes(f.pesquisa)) return false;
    }
    if (f.marca && (c.marca?.trim() || '—') !== f.marca) return false;
    if (f.tipo && (c.tipoVeiculo || 'Carrinha') !== f.tipo) return false;
    if (f.carga.size > 0  && !f.carga.has(c.carga  || 'Vazio')) return false;
    if (f.status.size > 0 && !f.status.has(c.status || 'Vazio')) return false;
    return true;
  });

  if (btn) {
    btn.style.display = n > 0 ? '' : 'none';
    const total = _todasCarrinhas.length;
    const resultLabel = n > 0 ? ` · ${filtradas.length}/${total}` : '';
    btn.innerHTML = n > 0 ? `✕ Limpar${resultLabel}` : '✕ Limpar';
  }

  renderCarrinhasInterno(filtradas);
}

function limparFiltros() {
  const s = document.getElementById('search-carrinhas');
  if (s) s.value = '';
  const m = document.getElementById('filtro-marca');
  if (m) m.value = '';
  const t = document.getElementById('filtro-tipo');
  if (t) t.value = '';
  _filtrosCarga.clear();
  _filtrosStatus.clear();
  document.querySelectorAll('.filtro-chip').forEach(c => c.classList.remove('active'));
  const btn = document.getElementById('filtro-limpar');
  if (btn) btn.style.display = 'none';
  renderCarrinhasInterno(_todasCarrinhas);
}

function filtrarCarrinhas() { aplicarFiltros(); }

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros  = limparFiltros;
window.filtrarCarrinhas = filtrarCarrinhas;

// ─── EDITAR CAMPO INLINE ──────────────────────────────

function editarCampoCard(e, id, field, valorAtual) {
  e.stopPropagation();
  const span = e.currentTarget;
  const input = document.createElement('input');
  input.className = 'input-inline-edit';
  input.value = valorAtual;
  span.replaceWith(input);
  input.focus();
  input.select();
  const salvar = async () => {
    const novoValor = input.value.trim() || valorAtual;
    await updateCarrinha(id, field, novoValor);
  };
  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = valorAtual; input.blur(); } });
}
window.editarCampoCard = editarCampoCard;

// ─── EDITAR PERFIL ────────────────────────────────────

let _editarPerfilId = null;

function abrirEditarPerfil(id, nome) {
  document.getElementById('modal-senha-desc').textContent = `Confirmar identidade: ${nome}`;
  document.getElementById('m-senha-input').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('modal-senha').classList.add('open');
  setTimeout(() => document.getElementById('m-senha-input').focus(), 100);
  _senhaCallback = async (input) => {
    const snap = await db.collection('perfis').doc(id).get();
    if (!(await verificarSenha(input, snap.data().senha))) return false;
    fecharModal('modal-senha');
    _editarPerfilId = id;
    document.getElementById('ep-nome').value = snap.data().nome;
    document.getElementById('ep-senha').value = '';
    document.getElementById('modal-editar-perfil').classList.add('open');
    setTimeout(() => document.getElementById('ep-nome').focus(), 100);
    return true;
  };
}

async function guardarEdicaoPerfil() {
  const nome = document.getElementById('ep-nome').value.trim();
  const senhaRaw = document.getElementById('ep-senha').value;
  if (!nome) { toast('Indica um nome.'); return; }
  const dados = { nome };
  if (senhaRaw) dados.senha = await hashSenha(senhaRaw);
  await db.collection('perfis').doc(_editarPerfilId).update(dados);
  fecharModal('modal-editar-perfil');
  toast('Perfil atualizado.');
}

window.abrirEditarPerfil = abrirEditarPerfil;
window.guardarEdicaoPerfil = guardarEdicaoPerfil;

// ─── LIGHTBOX ─────────────────────────────────────────

function abrirLightbox(src) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = src;
  lb.style.display = 'flex';
}

function fecharLightbox() {
  document.getElementById('lightbox').style.display = 'none';
}

window.abrirLightbox = abrirLightbox;
window.fecharLightbox = fecharLightbox;

// ─── EXPORTAR ─────────────────────────────────────────

async function exportarDados() {
  const snap = await db.collection('perfis').doc(perfilAtual).collection('carrinhas').get();
  const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Remover imagens base64 para não ficar enorme
  dados.forEach(d => { if (d.imagem?.startsWith('data:')) d.imagem = '[imagem local]'; });
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `carrinhas_${document.getElementById('perfil-nome-titulo').textContent}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('Exportado!');
}

window.exportarDados = exportarDados;

// ─── DRAG & DROP ──────────────────────────────────────

let _dragId = null;

function dragStart(e) {
  _dragId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if (target.dataset.id && target.dataset.id !== _dragId) {
    target.classList.add('drag-over');
  }
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function dragEnd(e) {
  document.querySelectorAll('.carrinha-card').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
}

async function dragDrop(e) {
  e.preventDefault();
  const targetId = e.currentTarget.dataset.id;
  if (!targetId || targetId === _dragId) return;
  e.currentTarget.classList.remove('drag-over');

  const allGrids = document.querySelectorAll('.marca-cards');
  const dragEl = document.querySelector(`.carrinha-card[data-id="${_dragId}"]`);
  const targetEl = e.currentTarget;
  const targetGrid = targetEl.closest('.marca-cards');

  // Mover para novo grupo se necessário
  const novaMarca = targetEl.closest('.marca-grupo')?.dataset.marca;
  if (novaMarca && dragEl.closest('.marca-grupo')?.dataset.marca !== novaMarca) {
    await updateCarrinha(_dragId, 'marca', novaMarca === '—' ? '' : novaMarca);
  }

  // Reordenar no DOM
  const cards = [...targetGrid.querySelectorAll('.carrinha-card[data-id]')];
  const targetIdx = cards.indexOf(targetEl);
  const dragIdx = cards.indexOf(dragEl);
  if (dragIdx === -1 || dragIdx < targetIdx) targetEl.after(dragEl);
  else targetEl.before(dragEl);

  // Guardar ordem
  const novosCards = [...targetGrid.querySelectorAll('.carrinha-card[data-id]')];
  await Promise.all(novosCards.map((el, i) =>
    db.collection('perfis').doc(perfilAtual).collection('carrinhas').doc(el.dataset.id).update({ ordem: i })
  ));
}

window.dragStart  = dragStart;
window.dragOver   = dragOver;
window.dragLeave  = dragLeave;
window.dragEnd    = dragEnd;
window.dragDrop   = dragDrop;

// ─── UTILS ────────────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2000);
}

// ─── MODAL DE CONFIRMAÇÃO ─────────────────────────────

let _confirmResolve = null;
let _confirmReject  = null;

function confirmar(msg, btnLabel = 'Confirmar', danger = true) {
  return new Promise(resolve => {
    document.getElementById('confirm-msg').textContent = msg;
    const btn = document.getElementById('confirm-ok-btn');
    btn.textContent = btnLabel;
    btn.className = danger ? 'btn-confirm-danger' : 'btn-confirm-ok';
    document.getElementById('modal-confirm').classList.add('open');
    _confirmResolve = () => { document.getElementById('modal-confirm').classList.remove('open'); resolve(true); };
    _confirmReject  = () => { document.getElementById('modal-confirm').classList.remove('open'); resolve(false); };
  });
}

window._confirmResolve = () => _confirmResolve && _confirmResolve();
window._confirmReject  = () => _confirmReject  && _confirmReject();

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function expandField(btn, id, field) {
  const placeholder = field === 'estado' ? 'Estado...' : 'Notas...';
  const ta = document.createElement('textarea');
  ta.className = 'carrinha-input carrinha-input-new';
  ta.placeholder = placeholder;
  ta.addEventListener('change', () => updateCarrinha(id, field, ta.value));
  ta.addEventListener('input', () => autoResize(ta));
  btn.replaceWith(ta);
  ta.focus();
  autoResize(ta);
}
window.expandField = expandField;

window.autoResize = autoResize;

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── CALCULADORA ──────────────────────────────────────

const DROGAS = {
  weed:    { nome: 'Weed',    civil: 860,  limpo: 938,  sujo: 964  },
  cocaina: { nome: 'Cocaína', civil: 1485, limpo: 1664, sujo: 1714 },
  opio:    { nome: 'Ópio',    civil: 1405, limpo: 1571, sujo: 1619 },
  meta:    { nome: 'Meta',    civil: 1730, limpo: 1914, sujo: 1971 },
  petroleo:{ nome: 'Petróleo',civil: 8250, limpo: 9221, sujo: 9531 },
};

const ARMAS = {
  hk:       { nome: 'HK',            civil: 95000,    com_mat: 78000,    sem_mat: 82500,    materiais: '2 aços' },
  deagle:   { nome: 'Deagle',        civil: 225000,   com_mat: 165000,   sem_mat: 184250,   materiais: '3 aços' },
  microuzi: { nome: 'Micro Uzi',     civil: 775000,   com_mat: 460000,   sem_mat: 587000,   materiais: '4 encomendas + 1 aço' },
  tec9:     { nome: 'Tec 9',         civil: 825000,   com_mat: 525000,   sem_mat: 639500,   materiais: '4 encomendas + 1 aço' },
  mpx:      { nome: 'Mpx',           civil: 875000,   com_mat: 625000,   sem_mat: 707250,   materiais: '5 encomendas + 1 aço' },
  tommygun: { nome: 'Tommy Gun',     civil: 925000,   com_mat: 660000,   sem_mat: 747500,   materiais: '6 encomendas + 1 aço' },
  minidraco:{ nome: 'Mini Draco',    civil: 1000000,  com_mat: 725000,   sem_mat: 809500,   materiais: '4 encomendas + 1 aço' },
  shotgun:  { nome: 'Shotgun Tática',civil: 1000000,  com_mat: 725000,   sem_mat: 812000,   materiais: '5 encomendas + 2 aços' },
  p90:      { nome: 'P90',           civil: 1050000,  com_mat: 790000,   sem_mat: 865000,   materiais: '6 encomendas + 1 aço' },
  qbz:      { nome: 'Qbz',           civil: 1152000,  com_mat: 920000,   sem_mat: 972000,   materiais: '6 encomendas + 2 aços' },
  ak47:     { nome: 'Ak-47',         civil: 1250000,  com_mat: 990000,   sem_mat: 1048500,  materiais: '6 encomendas + 2 aços' },
  ak12:     { nome: 'Ak-12',         civil: 1600000,  com_mat: 1509000,  sem_mat: 1521000,  materiais: '6 aços' },
  g36:      { nome: 'G36',           civil: 1000000,  com_mat: 725000,   sem_mat: 809500,   materiais: '4 encomendas + 1 aço' },
  g2:       { nome: 'G2',            civil: 1200000,  com_mat: 955000,   sem_mat: 1009750,  materiais: '6 encomendas + 2 aços' },
  spaz12:   { nome: 'Spaz 12',       civil: 650000,   com_mat: 565000,   sem_mat: 604000,   materiais: '4 aços' },
};

const ACESSORIOS = {
  coletes:    { nome: 'Coletes',             civil: 150000,   com_mat: 98000,    sem_mat: 114000,   materiais: '1 encomenda' },
  oxydona:    { nome: 'Oxydona',             civil: 300000,   com_mat: 140000,   sem_mat: 154500,   materiais: '1 encomenda' },
  carregador: { nome: 'Carregador Estendido',civil: 180000,   com_mat: 110000,   sem_mat: 126500,   materiais: '1 encomenda' },
  mira_holo:  { nome: 'Mira Holográfica',    civil: 200000,   com_mat: 130000,   sem_mat: 151500,   materiais: '1 encomenda' },
  mira:       { nome: 'Mira',                civil: 450000,   com_mat: 350000,   sem_mat: 376500,   materiais: '1 encomenda' },
  compensador:{ nome: 'Compensador',         civil: 250000,   com_mat: 165000,   sem_mat: 189000,   materiais: '1 encomenda' },
  drone:      { nome: 'Drone',               civil: 3500000,  com_mat: 2700000,  sem_mat: 2989000,  materiais: '1 encomenda' },
  c4:         { nome: 'C4',                  civil: 50000,    com_mat: 39000,    sem_mat: 42500,    materiais: '1 encomenda' },
  id_falso:   { nome: 'ID Falso',            civil: 200000,   com_mat: 170000,   sem_mat: 176500,   materiais: '1 encomenda' },
};

function fmt(n) {
  return n.toLocaleString('pt-PT') + ' €';
}

let _calcViewAnterior = null;

function salvarEstadoCalc() {
  localStorage.setItem('calc', JSON.stringify({
    tab:          document.querySelector('.calc-tab.active')?.id?.replace('tab-','') || 'drogas',
    droga:        document.getElementById('c-droga')?.value,
    qtd:          document.getElementById('c-qtd')?.value,
    tipo:         document.getElementById('c-tipo')?.value,
    arma:         document.getElementById('c-arma')?.value,
    armaQtd:      document.getElementById('c-arma-qtd')?.value,
    armaTipo:     document.getElementById('c-arma-tipo')?.value,
    acessorio:    document.getElementById('c-acessorio')?.value,
    acessorioQtd: document.getElementById('c-acessorio-qtd')?.value,
    acessorioTipo:document.getElementById('c-acessorio-tipo')?.value,
  }));
}

function restaurarEstadoCalc() {
  try {
    const s = JSON.parse(localStorage.getItem('calc'));
    if (!s) return;
    if (s.droga)         document.getElementById('c-droga').value          = s.droga;
    if (s.qtd)           document.getElementById('c-qtd').value            = s.qtd;
    if (s.tipo)          document.getElementById('c-tipo').value           = s.tipo;
    if (s.arma)          document.getElementById('c-arma').value           = s.arma;
    if (s.armaQtd)       document.getElementById('c-arma-qtd').value       = s.armaQtd;
    if (s.armaTipo)      document.getElementById('c-arma-tipo').value      = s.armaTipo;
    if (s.acessorio)     document.getElementById('c-acessorio').value      = s.acessorio;
    if (s.acessorioQtd)  document.getElementById('c-acessorio-qtd').value  = s.acessorioQtd;
    if (s.acessorioTipo) document.getElementById('c-acessorio-tipo').value = s.acessorioTipo;
    if (s.tab)           calcTab(s.tab);
  } catch(e) {}
}

function abrirCalculadora() {
  _calcViewAnterior = document.getElementById('view-carrinhas').style.display !== 'none' ? 'carrinhas' : 'perfis';
  document.getElementById('view-perfis').style.display = 'none';
  document.getElementById('view-carrinhas').style.display = 'none';
  document.getElementById('view-calculadora').style.display = '';
  restaurarEstadoCalc();
  calcDrogas();
}

function fecharCalculadoraOverlay(e) { if (e.target === e.currentTarget) fecharCalculadora(); }

function fecharCalculadora() {
  document.getElementById('view-calculadora').style.display = 'none';
  if (_calcViewAnterior === 'carrinhas') {
    document.getElementById('view-carrinhas').style.display = '';
  } else {
    document.getElementById('view-perfis').style.display = '';
  }
}

function calcTab(tab) {
  ['drogas','armas','acessorios'].forEach(t => {
    document.getElementById('calc-' + t).style.display = t === tab ? '' : 'none';
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  if (tab === 'drogas') calcDrogas();
  if (tab === 'armas') calcArmas();
  if (tab === 'acessorios') calcAcessorios();
}

function calcDrogas() {
  const key = document.getElementById('c-droga').value;
  const droga = DROGAS[key];
  const qtd = Math.max(1, parseInt(document.getElementById('c-qtd').value) || 1);
  const carMult = key === 'petroleo' ? 240 : 600;

  const th = document.getElementById('calc-droga-th-qtd');
  if (th) th.textContent = `(${qtd}×)`;
  const thCar = document.getElementById('calc-droga-th-car');
  if (thCar) thCar.textContent = `Carrinha (${carMult}×)`;

  document.getElementById('cd-unit-sujo').textContent  = fmt(droga.sujo);
  document.getElementById('cd-total-sujo').textContent = fmt(droga.sujo * qtd);
  document.getElementById('cd-car-sujo').textContent   = fmt(droga.sujo * carMult);
  document.getElementById('cd-unit-limpo').textContent  = fmt(droga.limpo);
  document.getElementById('cd-total-limpo').textContent = fmt(droga.limpo * qtd);
  document.getElementById('cd-car-limpo').textContent   = fmt(droga.limpo * carMult);
  document.getElementById('cd-unit-civil').textContent  = fmt(droga.civil);
  document.getElementById('cd-total-civil').textContent = fmt(droga.civil * qtd);
  document.getElementById('cd-car-civil').textContent   = fmt(droga.civil * carMult);
  salvarEstadoCalc();
}

function multiplicarMateriais(materiaisStr, qtd) {
  if (qtd === 1) return materiaisStr;
  return materiaisStr.replace(/(\d+)/g, n => parseInt(n) * qtd);
}

function calcArmas() {
  const arma = ARMAS[document.getElementById('c-arma').value];
  const qtd = Math.max(1, parseInt(document.getElementById('c-arma-qtd').value) || 1);
  const th = document.getElementById('calc-arma-th-qtd');
  if (th) th.textContent = `(${qtd}×)`;
  document.getElementById('ca-unit-civil').textContent  = fmt(arma.civil);
  document.getElementById('ca-total-civil').textContent = fmt(arma.civil * qtd);
  document.getElementById('ca-unit-com').textContent    = fmt(arma.com_mat);
  document.getElementById('ca-total-com').textContent   = fmt(arma.com_mat * qtd);
  document.getElementById('ca-unit-sem').textContent    = fmt(arma.sem_mat);
  document.getElementById('ca-total-sem').textContent   = fmt(arma.sem_mat * qtd);
  const mat = document.getElementById('ca-materiais');
  if (mat) mat.textContent = `Materiais (com materiais): ${multiplicarMateriais(arma.materiais, qtd)}`;
  salvarEstadoCalc();
}

function calcAcessorios() {
  const ac = ACESSORIOS[document.getElementById('c-acessorio').value];
  const qtd = Math.max(1, parseInt(document.getElementById('c-acessorio-qtd').value) || 1);
  const th = document.getElementById('calc-ac-th-qtd');
  if (th) th.textContent = `(${qtd}×)`;
  document.getElementById('ac-unit-civil').textContent  = fmt(ac.civil);
  document.getElementById('ac-total-civil').textContent = fmt(ac.civil * qtd);
  document.getElementById('ac-unit-com').textContent    = fmt(ac.com_mat);
  document.getElementById('ac-total-com').textContent   = fmt(ac.com_mat * qtd);
  document.getElementById('ac-unit-sem').textContent    = fmt(ac.sem_mat);
  document.getElementById('ac-total-sem').textContent   = fmt(ac.sem_mat * qtd);
  const mat = document.getElementById('ac-materiais');
  if (mat) mat.textContent = `Materiais (com materiais): ${multiplicarMateriais(ac.materiais, qtd)}`;
  salvarEstadoCalc();
}

window.abrirCalculadora = abrirCalculadora;
window.fecharCalculadora = fecharCalculadora;
window.fecharCalculadoraOverlay = fecharCalculadoraOverlay;
window.calcTab = calcTab;
window.calcDrogas = calcDrogas;
window.calcArmas = calcArmas;
window.calcAcessorios = calcAcessorios;

window.tentarAbrirPerfil = tentarAbrirPerfil;
window.confirmarSenha = confirmarSenha;
window.fecharModalSenha = fecharModalSenha;
window.abrirPerfil = abrirPerfil;
window.voltarPerfis = voltarPerfis;
window.criarPerfil = criarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.adicionarCarrinha = adicionarCarrinha;
window.eliminarCarrinha = eliminarCarrinha;
window.updateCarrinha = updateCarrinha;
window.abrirModalPerfil = abrirModalPerfil;
window.abrirModalCarrinha = abrirModalCarrinha;
window.fecharModal = fecharModal;
window.fecharModalPerfil = fecharModalPerfil;
window.fecharModalCarrinha = fecharModalCarrinha;
window.getClass = getClass;