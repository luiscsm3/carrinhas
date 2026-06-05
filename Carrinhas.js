const firebaseConfig = {
  apiKey: "AIzaSyAbNKlWYSe1rIn1t5yFS8kgJlwWggn5eLQ",
  authDomain: "sugestoes-f03d9.firebaseapp.com",
  projectId: "sugestoes-f03d9",
  storageBucket: "sugestoes-f03d9.firebasestorage.app",
  messagingSenderId: "640972402801",
  appId: "1:640972402801:web:c1aaf57020fb7e1f05abd0"
};

firebase.initializeApp(firebaseConfig);

// ─── TEMA ─────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtns(next);
}

function updateThemeBtns(theme) {
  const label = theme === 'light' ? '☀️ Light' : '🌙 Dark';
  document.querySelectorAll('[id^="btn-theme"]').forEach(b => b.textContent = label);
}

(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  window.addEventListener('DOMContentLoaded', () => updateThemeBtns(saved));
})();

window.toggleTheme = toggleTheme;
const db = firebase.firestore();

let perfilAtual = null;
let unsubCarrinhas = null;

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
  grid.innerHTML = perfis.map(p => `
    <div class="perfil-card" onclick="tentarAbrirPerfil('${p.id}','${esc(p.nome)}')">
      <button class="perfil-del" onclick="event.stopPropagation(); eliminarPerfil('${p.id}','${esc(p.nome)}')" title="Eliminar">×</button>
      <div class="perfil-avatar" onclick="event.stopPropagation(); abrirImgPerfil('${p.id}')">
        ${p.foto
          ? `<img src="${esc(p.foto)}" class="perfil-avatar-img" />`
          : `<span>${p.nome.charAt(0).toUpperCase()}</span>`}
        <div class="perfil-avatar-overlay">✎</div>
      </div>
      <div class="perfil-nome">${esc(p.nome)} <span class="perfil-lock">🔒</span></div>
      <div class="perfil-info" id="info-${p.id}">— carrinhas</div>
    </div>
  `).join('');

  // Carregar contadores
  perfis.forEach(p => {
    db.collection('perfis').doc(p.id).collection('carrinhas').get().then(snap => {
      const total = snap.size;
      const emUso = snap.docs.filter(d => d.data().carga && d.data().carga !== 'Vazio').length;
      const el = document.getElementById(`info-${p.id}`);
      if (el) el.textContent = `${emUso} / ${total} em uso`;
    });
  });
}

async function criarPerfil() {
  const nome = document.getElementById('m-perfil-nome').value.trim();
  if (!nome) { toast('Indica um nome.'); return; }
  const senha = document.getElementById('m-perfil-senha').value;
  if (!senha) { toast('Indica uma palavra-passe.'); return; }
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
    if (snap.data().senha !== input) return false;
    fecharModal('modal-senha');
    if (!confirm(`Eliminar o perfil "${nome}" e todas as suas carrinhas?`)) return true;
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
  document.getElementById('modal-senha-desc').textContent = `Perfil: ${nome}`;
  document.getElementById('m-senha-input').value = '';
  document.getElementById('senha-erro').style.display = 'none';
  document.getElementById('modal-senha').classList.add('open');
  setTimeout(() => document.getElementById('m-senha-input').focus(), 100);
  _senhaCallback = async (input) => {
    const snap = await db.collection('perfis').doc(id).get();
    if (snap.data().senha === input) {
      fecharModal('modal-senha');
      abrirPerfil(id, nome);
      return true;
    }
    return false;
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
  const emUso = carrinhas.filter(c => c.carga && c.carga !== 'Vazio').length;
  document.getElementById('perfil-contador').textContent = `${emUso} / ${carrinhas.length} carrinhas em uso`;

  const grid = document.getElementById('carrinhas-grid');
  const empty = document.getElementById('carrinhas-empty');

  if (!carrinhas.length) {
    grid.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  // Agrupar por marca
  const grupos = {};
  carrinhas.forEach(c => {
    const marca = c.marca?.trim() || '—';
    if (!grupos[marca]) grupos[marca] = [];
    grupos[marca].push(c);
  });

  const marcasOrdenadas = Object.keys(grupos).sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b));

  const carrinhaCard = c => `<div class="carrinha-card">
    <div class="carrinha-img" onclick="abrirImgModal('${c.id}','${esc(c.imagem || '')}')">
      ${c.imagem
        ? `<img src="${esc(c.imagem)}" class="carrinha-img-foto" />`
        : `<span class="carrinha-img-plus">+</span>`}
      <div class="perfil-avatar-overlay">✎</div>
    </div>
    <div class="carrinha-matricula">
      <span class="carrinha-tipo-icon">${c.tipoVeiculo === 'Carro' ? '🚗' : c.tipoVeiculo === 'Mota' ? '🏍️' : c.tipoVeiculo === 'Barco' ? '⛵' : '🚐'}</span>
      ${esc(c.matricula || '—')}
    </div>
    <div class="carrinha-badges">
      ${selectInline(c.id, 'carga', c.carga, CARGA_OPTS, 'badge-carga', CARGA_CLASS)}
      ${selectInline(c.id, 'status', c.status, STATUS_OPTS, 'badge-status', STATUS_CLASS)}
    </div>
    <div class="carrinha-fields">
      <textarea class="carrinha-input" placeholder="Estado..." onchange="updateCarrinha('${c.id}','estado',this.value)" oninput="autoResize(this)">${esc(c.estado || '')}</textarea>
      <textarea class="carrinha-input" placeholder="Notas..." onchange="updateCarrinha('${c.id}','notas',this.value)" oninput="autoResize(this)">${esc(c.notas || '')}</textarea>
    </div>
    <button class="carrinha-btn-del" onclick="eliminarCarrinha('${c.id}')">Remover</button>
  </div>`;

  grid.innerHTML = marcasOrdenadas.map(marca => `
    <div class="marca-grupo">
      <div class="marca-header">
        <span class="marca-nome">${esc(marca)}</span>
        <span class="marca-count">${grupos[marca].length} carrinha${grupos[marca].length !== 1 ? 's' : ''}</span>
      </div>
      <div class="marca-cards">${grupos[marca].map(carrinhaCard).join('')}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.carrinha-input').forEach(el => autoResize(el));
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
  await db.collection('perfis').doc(perfilAtual).collection('carrinhas').doc(id).update({ [field]: value });
}

async function eliminarCarrinha(id) {
  await db.collection('perfis').doc(perfilAtual).collection('carrinhas').doc(id).delete();
  toast('Removida.');
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
    if (snap.data().senha !== input) return false;
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
  document.getElementById('modal-carrinha').classList.add('open');
  setTimeout(() => document.getElementById('m-matricula').focus(), 100);
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('open');
}

function fecharModalPerfil(e) { if (e.target === e.currentTarget) fecharModal('modal-perfil'); }
function fecharModalCarrinha(e) { if (e.target === e.currentTarget) fecharModal('modal-carrinha'); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    fecharModal('modal-perfil');
    fecharModal('modal-carrinha');
    fecharModal('modal-senha');
    if (document.getElementById('view-calculadora').style.display !== 'none') fecharCalculadora();
  }
  if (e.key === 'Enter' && document.getElementById('modal-perfil').classList.contains('open')) criarPerfil();
  if (e.key === 'Enter' && document.getElementById('modal-carrinha').classList.contains('open')) adicionarCarrinha();
  if (e.key === 'Enter' && document.getElementById('modal-senha').classList.contains('open')) confirmarSenha();
});

// ─── UTILS ────────────────────────────────────────────

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2000);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

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
  const droga = DROGAS[document.getElementById('c-droga').value];
  const qtd = Math.max(1, parseInt(document.getElementById('c-qtd').value) || 1);
  const tipo = document.getElementById('c-tipo').value;
  const preco = droga[tipo];
  const total = preco * qtd;
  const tipoLabel = { civil: 'Civil', limpo: 'Contratado Limpo', sujo: 'Contratado Sujo' }[tipo];
  document.getElementById('calc-droga-total').textContent = fmt(total);
  document.getElementById('calc-droga-detail').textContent = `${fmt(preco)} × ${qtd} unidade${qtd !== 1 ? 's' : ''} — ${tipoLabel}`;
  salvarEstadoCalc();
}

function multiplicarMateriais(materiaisStr, qtd) {
  if (qtd === 1) return materiaisStr;
  return materiaisStr.replace(/(\d+)/g, n => parseInt(n) * qtd);
}

function calcArmas() {
  const arma = ARMAS[document.getElementById('c-arma').value];
  const tipo = document.getElementById('c-arma-tipo').value;
  const qtd = Math.max(1, parseInt(document.getElementById('c-arma-qtd').value) || 1);
  const preco = arma[tipo];
  const total = preco * qtd;
  const tipoLabel = { civil: 'Civil', com_mat: 'Contratado com Materiais', sem_mat: 'Contratado sem Materiais' }[tipo];
  document.getElementById('calc-arma-total').textContent = fmt(total);
  let detalhe = `${fmt(preco)} × ${qtd} unidade${qtd !== 1 ? 's' : ''} — ${tipoLabel}`;
  if (tipo === 'com_mat') detalhe += `\nMateriais necessários: ${multiplicarMateriais(arma.materiais, qtd)}`;
  document.getElementById('calc-arma-detail').textContent = detalhe;
  salvarEstadoCalc();
}

function calcAcessorios() {
  const ac = ACESSORIOS[document.getElementById('c-acessorio').value];
  const tipo = document.getElementById('c-acessorio-tipo').value;
  const qtd = Math.max(1, parseInt(document.getElementById('c-acessorio-qtd').value) || 1);
  const preco = ac[tipo];
  const total = preco * qtd;
  const tipoLabel = { civil: 'Civil', com_mat: 'Contratado com Materiais', sem_mat: 'Contratado sem Materiais' }[tipo];
  document.getElementById('calc-acessorio-total').textContent = fmt(total);
  let detalhe = `${fmt(preco)} × ${qtd} unidade${qtd !== 1 ? 's' : ''} — ${tipoLabel}`;
  if (tipo === 'com_mat') detalhe += `\nMateriais necessários: ${multiplicarMateriais(ac.materiais, qtd)}`;
  document.getElementById('calc-acessorio-detail').textContent = detalhe;
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