// ===== Estado global =====
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let secaoAtiva = 'dashboard';
let graficoInstancia = null;

// Estado do filtro da tabela
let filtro = { texto: '', categoriaId: '', valorMin: '', valorMax: '' };

// Estado do filtro de receitas
let filtroReceitas = { texto: '', valorMin: '', valorMax: '' };

// Aba ativa no dashboard
let abaAtivaDashboard = 'gastos';

// Estado da tela de comparar meses
let estadoComparar = null; // { mesA, anoA, mesB, anoB }

// Dados CSV temporários durante importação
let csvLinhas = [];
let csvCabecalhos = [];
let tipoImportacaoCSV = 'gastos'; // 'gastos' | 'receitas'

function selecionarCategoriaDropdown(idInput, catId) {
  const wrapper = document.getElementById(`wrapper-${idInput}`);
  if (!wrapper) return;
  const input = wrapper.querySelector(`#${idInput}`);
  const texto = wrapper.querySelector('.cat-select-texto');
  const bolinhaT = wrapper.querySelector('.cat-bolinha-trigger');
  if (!input) return;

  input.value = catId || '';
  const cat = catId ? carregarCategorias().find(c => c.id === catId) : null;
  texto.textContent = cat ? cat.nome : 'Selecione...';
  bolinhaT.style.background = cat ? cat.cor : 'transparent';
  bolinhaT.style.border = cat ? '' : '2px dashed var(--cor-borda)';
  wrapper.querySelectorAll('.cat-opcao').forEach(op => {
    op.classList.toggle('selecionada', op.dataset.valor === (catId || ''));
  });
}

// ===== Auto-categorização =====

function buscarCategoriaSugerida(descricao) {
  if (!descricao || descricao.length < 3) return null;
  const termo = descricao.toLowerCase();
  const gastos = carregarGastos();
  // Busca o gasto mais recente cuja descrição contenha o termo
  const match = gastos
    .filter(g => g.categoriaId && g.descricao.toLowerCase().includes(termo))
    .sort((a, b) => b.data.localeCompare(a.data));
  return match.length ? match[0].categoriaId : null;
}

// ===== Ícones SVG inline =====

const ICONES = {
  gastos:     `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  receitas:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:5px"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  recorrente: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:3px;opacity:0.7"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
};

// ===== Utilitários =====

function gerarId() {
  return crypto.randomUUID();
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataStr) {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function nomeMes(mes, ano) {
  const data = new Date(ano, mes, 1);
  return data.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

let _toastTimer = null;

function mostrarToast(msg, tipo = 'normal', aoDesfazer = null) {
  const toast = document.getElementById('toast');
  if (_toastTimer) clearTimeout(_toastTimer);

  toast.innerHTML = `<span>${msg}</span>`;
  if (aoDesfazer) {
    const btn = document.createElement('button');
    btn.id = 'toast-btn-desfazer';
    btn.textContent = 'Desfazer';
    btn.addEventListener('click', () => {
      toast.className = '';
      clearTimeout(_toastTimer);
      aoDesfazer();
    });
    toast.appendChild(btn);
  }

  toast.className = `visivel ${tipo}`;
  _toastTimer = setTimeout(() => { toast.className = ''; }, 4000);
}

function confirmarModal(titulo, mensagem, aoConfirmar) {
  const overlay = document.getElementById('overlay-modal');
  const modal = document.getElementById('modal');
  const htmlAnterior = modal.innerHTML;
  const visivel = overlay.classList.contains('visivel');

  modal.innerHTML = `
    <h2>${titulo}</h2>
    <p style="margin:14px 0;line-height:1.6;color:var(--cor-texto-suave)">${mensagem}</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
      <button id="btn-confirmar-cancelar" class="btn btn-secundario">Cancelar</button>
      <button id="btn-confirmar-ok" class="btn btn-perigo">Excluir</button>
    </div>
  `;
  overlay.classList.add('visivel');

  document.getElementById('btn-confirmar-cancelar').addEventListener('click', () => {
    if (visivel) { modal.innerHTML = htmlAnterior; }
    else { overlay.classList.remove('visivel'); }
  });

  document.getElementById('btn-confirmar-ok').addEventListener('click', () => {
    overlay.classList.remove('visivel');
    aoConfirmar();
  });
}

// ===== Persistência =====

function carregarCategorias() {
  return JSON.parse(localStorage.getItem('categorias') || '[]');
}

function salvarCategorias(categorias) {
  localStorage.setItem('categorias', JSON.stringify(categorias));
}

function carregarGastos() {
  return JSON.parse(localStorage.getItem('gastos') || '[]');
}

function salvarGastos(gastos) {
  localStorage.setItem('gastos', JSON.stringify(gastos));
}

function carregarReceitas() {
  return JSON.parse(localStorage.getItem('receitas') || '[]');
}

function salvarReceitas(receitas) {
  localStorage.setItem('receitas', JSON.stringify(receitas));
}

function inicializarCategoriasPadrao() {
  if (carregarCategorias().length === 0) {
    const padrao = [
      { id: gerarId(), nome: 'Alimentação',  cor: '#e67e22' },
      { id: gerarId(), nome: 'Transporte',   cor: '#3498db' },
      { id: gerarId(), nome: 'Moradia',      cor: '#9b59b6' },
      { id: gerarId(), nome: 'Saúde',        cor: '#e74c3c' },
      { id: gerarId(), nome: 'Lazer',        cor: '#1abc9c' },
      { id: gerarId(), nome: 'Educação',     cor: '#f39c12' },
      { id: gerarId(), nome: 'Outros',       cor: '#95a5a6' },
    ];
    salvarCategorias(padrao);
  }
}

// ===== Navegação =====

function irParaSecao(secao) {
  if (secao !== 'importar') tipoImportacaoCSV = 'gastos';
  secaoAtiva = secao;
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
  document.getElementById(`secao-${secao}`).classList.add('ativa');
  const menuItem = document.querySelector(`[data-secao="${secao}"]`);
  if (menuItem) menuItem.classList.add('ativo');
  renderizarSecao(secao);
}

function renderizarSecao(secao) {
  const mapa = {
    dashboard:  renderizarDashboard,
    adicionar:  renderizarFormularioGasto,
    importar:   renderizarImportarCSV,
    categorias: renderizarCategorias,
    resumo:     renderizarResumoAnual,
    busca:      renderizarBuscaGlobal,
    comparar:   renderizarCompararMeses,
  };
  if (mapa[secao]) mapa[secao]();
}

// ===== Seletor de mês =====

function labelMesFormatado() {
  return nomeMes(mesAtual, anoAtual).replace(/^\w/, c => c.toUpperCase());
}

function irParaMesAnterior() {
  if (mesAtual === 0) { mesAtual = 11; anoAtual--; }
  else mesAtual--;
  projetarGastosRecorrentes();
  projetarReceitasRecorrentes();
  renderizarDashboard();
}

function irParaProximoMes() {
  if (mesAtual === 11) { mesAtual = 0; anoAtual++; }
  else mesAtual++;
  projetarGastosRecorrentes();
  projetarReceitasRecorrentes();
  renderizarDashboard();
}

// ===== Recorrentes =====

function carregarExclusoesRecorrentes() {
  return JSON.parse(localStorage.getItem('recorrentes_excluidos') || '[]');
}

function salvarExclusoesRecorrentes(lista) {
  localStorage.setItem('recorrentes_excluidos', JSON.stringify(lista));
}

function registrarExclusaoRecorrente(gasto) {
  const mesStr = gasto.data.substring(0, 7);
  const chave = `${gasto.descricao}||${gasto.categoriaId}`;
  const lista = carregarExclusoesRecorrentes();
  const jaRegistrado = lista.some(e => e.mesAno === mesStr && e.chave === chave);
  if (!jaRegistrado) {
    lista.push({ mesAno: mesStr, chave });
    salvarExclusoesRecorrentes(lista);
  }
}

function carregarExclusoesRecorrentesReceitas() {
  return JSON.parse(localStorage.getItem('recorrentes_receitas_excluidos') || '[]');
}

function salvarExclusoesRecorrentesReceitas(lista) {
  localStorage.setItem('recorrentes_receitas_excluidos', JSON.stringify(lista));
}

function registrarExclusaoRecorrenteReceita(receita) {
  const mesStr = receita.data.substring(0, 7);
  const lista = carregarExclusoesRecorrentesReceitas();
  const jaRegistrado = lista.some(e => e.mesAno === mesStr && e.descricao === receita.descricao);
  if (!jaRegistrado) {
    lista.push({ mesAno: mesStr, descricao: receita.descricao });
    salvarExclusoesRecorrentesReceitas(lista);
  }
}

function projetarReceitasRecorrentes() {
  const mesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
  const todas = carregarReceitas();
  const doMes = todas.filter(r => r.data.startsWith(mesStr));
  const exclusoes = carregarExclusoesRecorrentesReceitas().filter(e => e.mesAno === mesStr);

  const templates = {};
  todas
    .filter(r => r.recorrente && !r.data.startsWith(mesStr))
    .sort((a, b) => b.data.localeCompare(a.data))
    .forEach(r => {
      if (!templates[r.descricao]) templates[r.descricao] = r;
    });

  const novas = [];
  Object.values(templates).forEach(r => {
    if (exclusoes.some(e => e.descricao === r.descricao)) return;
    if (doMes.some(m => m.descricao === r.descricao)) return;

    const dia = parseInt(r.data.split('-')[2]);
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const diaAjustado = Math.min(dia, diasNoMes);
    const dataStr = `${mesStr}-${String(diaAjustado).padStart(2, '0')}`;

    novas.push({ id: gerarId(), data: dataStr, descricao: r.descricao, valor: r.valor, recorrente: true });
  });

  if (novas.length) {
    novas.forEach(r => todas.push(r));
    salvarReceitas(todas);
  }
}

function projetarGastosRecorrentes() {
  const mesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
  const todos = carregarGastos();
  const doMes = todos.filter(g => g.data.startsWith(mesStr));
  const exclusoes = carregarExclusoesRecorrentes().filter(e => e.mesAno === mesStr);

  // Encontra os templates recorrentes mais recentes (por descricao+categoriaId)
  const templates = {};
  todos
    .filter(g => g.recorrente && !g.data.startsWith(mesStr))
    .sort((a, b) => b.data.localeCompare(a.data))
    .forEach(g => {
      const chave = `${g.descricao}||${g.categoriaId}`;
      if (!templates[chave]) templates[chave] = g;
    });

  const novos = [];
  Object.values(templates).forEach(g => {
    const chave = `${g.descricao}||${g.categoriaId}`;
    // Não projeta se foi excluído manualmente neste mês
    if (exclusoes.some(e => e.chave === chave)) return;
    const jaExiste = doMes.some(m => m.descricao === g.descricao && m.categoriaId === g.categoriaId);
    if (jaExiste) return;

    const dia = parseInt(g.data.split('-')[2]);
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const diaAjustado = Math.min(dia, diasNoMes);
    const dataStr = `${mesStr}-${String(diaAjustado).padStart(2, '0')}`;

    novos.push({ id: gerarId(), data: dataStr, descricao: g.descricao, valor: g.valor, categoriaId: g.categoriaId, recorrente: true, status: 'pendente' });
  });

  if (novos.length) {
    novos.forEach(g => todos.push(g));
    salvarGastos(todos);
  }
}

// ===== Filtros =====

function temFiltroAtivo() {
  return filtro.texto || filtro.categoriaId || filtro.valorMin || filtro.valorMax;
}

function aplicarFiltros(gastos) {
  return gastos.filter(g => {
    if (filtro.texto && !g.descricao.toLowerCase().includes(filtro.texto.toLowerCase())) return false;
    if (filtro.categoriaId && g.categoriaId !== filtro.categoriaId) return false;
    if (filtro.valorMin !== '' && g.valor < parseFloat(filtro.valorMin)) return false;
    if (filtro.valorMax !== '' && g.valor > parseFloat(filtro.valorMax)) return false;
    return true;
  });
}

function limparFiltros() {
  filtro = { texto: '', categoriaId: '', valorMin: '', valorMax: '' };
  renderizarDashboard();
}

function temFiltroReceitasAtivo() {
  return filtroReceitas.texto || filtroReceitas.valorMin || filtroReceitas.valorMax;
}

function aplicarFiltrosReceitas(receitas) {
  return receitas.filter(r => {
    if (filtroReceitas.texto && !r.descricao.toLowerCase().includes(filtroReceitas.texto.toLowerCase())) return false;
    if (filtroReceitas.valorMin !== '' && r.valor < parseFloat(filtroReceitas.valorMin)) return false;
    if (filtroReceitas.valorMax !== '' && r.valor > parseFloat(filtroReceitas.valorMax)) return false;
    return true;
  });
}

function limparFiltrosReceitas() {
  filtroReceitas = { texto: '', valorMin: '', valorMax: '' };
  renderizarDashboard();
}

// Atualiza o total de itens selecionados na tela de revisão de importação
function atualizarTotalSelecao(idTotal, selectorChk) {
  const el = document.getElementById(idTotal);
  if (!el) return;
  let total = 0;
  document.querySelectorAll(selectorChk).forEach(chk => {
    if (chk.checked) total += parseFloat(chk.dataset.valor) || 0;
  });
  el.textContent = `Total selecionado: ${formatarMoeda(total)}`;
}

// ===== Dashboard =====

function gastosDoMes() {
  const gastosStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
  return carregarGastos().filter(g => g.data.startsWith(gastosStr));
}

function receitasDoMes() {
  const mesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
  return carregarReceitas().filter(r => r.data.startsWith(mesStr));
}

function renderizarDashboard() {
  const secao = document.getElementById('secao-dashboard');
  const gastos = gastosDoMes();
  const gastosFiltrados = aplicarFiltros(gastos);
  const categorias = carregarCategorias();
  const receitas = receitasDoMes();
  const receitasFiltradas = aplicarFiltrosReceitas(receitas);
  const totalGastos = gastos.reduce((s, g) => s + g.valor, 0);
  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
  const saldo = totalReceitas - totalGastos;
  const qtd = gastos.length;

  // Agrupamento por categoria
  const porCategoria = {};
  gastos.forEach(g => {
    porCategoria[g.categoriaId] = (porCategoria[g.categoriaId] || 0) + g.valor;
  });

  const acentoSaldo = saldo >= 0 ? 'acento-verde' : 'acento-vermelho';

  secao.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1 class="titulo-secao" style="margin:0">Visão Geral</h1>
      <div id="seletor-mes">
        <button id="btn-mes-anterior" title="Mês anterior">&#8592;</button>
        <span id="label-mes">${labelMesFormatado()}</span>
        <button id="btn-proximo-mes" title="Próximo mês">&#8594;</button>
      </div>
    </div>
    <div id="grid-resumo">
      <div class="card-resumo acento-verde">
        <div class="card-resumo-topo">
          <span class="rotulo">Receitas do mês</span>
          <i data-lucide="trending-up" class="card-resumo-icone" style="color:var(--cor-sucesso)"></i>
        </div>
        <span class="valor">${formatarMoeda(totalReceitas)}</span>
        <span class="sub">${receitas.length} ${receitas.length === 1 ? 'receita' : 'receitas'}</span>
      </div>
      <div class="card-resumo acento-vermelho">
        <div class="card-resumo-topo">
          <span class="rotulo">Gastos do mês</span>
          <i data-lucide="trending-down" class="card-resumo-icone" style="color:var(--cor-perigo)"></i>
        </div>
        <span class="valor">${formatarMoeda(totalGastos)}</span>
        <span class="sub">${qtd} ${qtd === 1 ? 'gasto' : 'gastos'}</span>
      </div>
      <div class="card-resumo ${acentoSaldo}">
        <div class="card-resumo-topo">
          <span class="rotulo">Saldo</span>
          <i data-lucide="scale" class="card-resumo-icone" style="color:${saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'}"></i>
        </div>
        <span class="valor" style="color:${saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'}">${formatarMoeda(saldo)}</span>
        <span class="sub">${saldo >= 0 ? 'no positivo' : 'no negativo'}</span>
      </div>
      <div class="card-resumo acento-amarelo">
        <div class="card-resumo-topo">
          <span class="rotulo">Maior gasto</span>
          <i data-lucide="zap" class="card-resumo-icone" style="color:#f39c12"></i>
        </div>
        <span class="valor">${gastos.length ? formatarMoeda(Math.max(...gastos.map(g => g.valor))) : '—'}</span>
        <span class="sub">${gastos.length ? gastos.reduce((a, b) => a.valor > b.valor ? a : b).descricao : 'Nenhum gasto ainda'}</span>
      </div>
    </div>
    <div id="grid-dashboard">
      <div id="card-grafico" style="display:${abaAtivaDashboard === 'gastos' ? 'flex' : 'none'};flex-direction:column">
        <h2>Por categoria</h2>
        ${gastos.length ? `<canvas id="canvas-grafico"></canvas><div id="legenda-grafico"></div>` : '<p style="color:var(--cor-texto-suave);font-size:14px;margin-top:32px">Nenhum gasto neste mês</p>'}
      </div>
      <div id="card-lista" style="${abaAtivaDashboard === 'receitas' ? 'grid-column: 1 / -1' : ''}">
        <div id="abas-dashboard">
          <div id="abas-lista">
            <button class="aba-btn ${abaAtivaDashboard === 'gastos' ? 'ativa' : ''}" data-aba="gastos">
              ${ICONES.gastos}Gastos <span class="aba-badge">${qtd}</span>
            </button>
            <button class="aba-btn ${abaAtivaDashboard === 'receitas' ? 'ativa' : ''}" data-aba="receitas">
              ${ICONES.receitas}Receitas <span class="aba-badge">${receitas.length}</span>
            </button>
          </div>
          <div id="abas-acoes">
            <button id="btn-excluir-selecionados" class="btn btn-perigo"
              style="display:none;padding:7px 14px;font-size:13px">
              Excluir (<span id="contador-selecionados">0</span>)
            </button>
            <button id="btn-excluir-selecionados-receitas" class="btn btn-perigo"
              style="display:none;padding:7px 14px;font-size:13px">
              Excluir (<span id="contador-selecionados-receitas">0</span>)
            </button>
            <button id="btn-adicionar-rapido" class="btn btn-primario" style="display:${abaAtivaDashboard === 'gastos' ? 'flex' : 'none'};align-items:center;gap:6px">
              <span style="font-size:16px">＋</span> Adicionar Gasto
            </button>
            <button id="btn-adicionar-receita" class="btn btn-sucesso" style="display:${abaAtivaDashboard === 'receitas' ? 'flex' : 'none'};align-items:center;gap:6px">
              <span style="font-size:16px">＋</span> Adicionar Receita
            </button>
            <button id="btn-exportar-csv" class="btn btn-secundario" style="display:${abaAtivaDashboard === 'gastos' ? 'flex' : 'none'};align-items:center;gap:6px">
              <span>↓</span> Exportar CSV
            </button>
            <button id="btn-exportar-csv-receitas" class="btn btn-secundario" style="display:${abaAtivaDashboard === 'receitas' ? 'flex' : 'none'};align-items:center;gap:6px">
              <span>↓</span> Exportar CSV
            </button>
          </div>
        </div>

        <div id="aba-gastos" style="display:${abaAtivaDashboard === 'gastos' ? 'block' : 'none'}">
          <div id="barra-filtro" class="barra-filtro">
            <input type="text" id="filtro-texto" placeholder="Buscar descrição..." value="${filtro.texto}" />
            ${htmlSelectCategoria('filtro-categoria', categorias, filtro.categoriaId, 'Todas as categorias')}
            <input type="number" id="filtro-valor-min" placeholder="Valor mín." value="${filtro.valorMin}" step="0.01" min="0" />
            <input type="number" id="filtro-valor-max" placeholder="Valor máx." value="${filtro.valorMax}" step="0.01" min="0" />
            ${temFiltroAtivo() ? `<button id="btn-limpar-filtro" class="btn-limpar-filtro">✕ Limpar</button>` : ''}
          </div>
          <p id="info-filtro" style="font-size:12px;color:var(--cor-texto-suave);margin-bottom:8px">${temFiltroAtivo() ? `${gastosFiltrados.length} de ${qtd} gastos` : ''}</p>
          <div id="container-tabela">${renderizarTabelaGastos(gastosFiltrados, categorias)}</div>
        </div>

        <div id="aba-receitas" style="display:${abaAtivaDashboard === 'receitas' ? 'block' : 'none'}">
          <div id="barra-filtro-receitas" class="barra-filtro">
            <input type="text" id="filtro-texto-receitas" placeholder="Buscar descrição..." value="${filtroReceitas.texto}" />
            <input type="number" id="filtro-valor-min-receitas" placeholder="Valor mín." value="${filtroReceitas.valorMin}" step="0.01" min="0" />
            <input type="number" id="filtro-valor-max-receitas" placeholder="Valor máx." value="${filtroReceitas.valorMax}" step="0.01" min="0" />
            ${temFiltroReceitasAtivo() ? `<button id="btn-limpar-filtro-receitas" class="btn-limpar-filtro">✕ Limpar</button>` : ''}
          </div>
          <p id="info-filtro-receitas" style="font-size:12px;color:var(--cor-texto-suave);margin-bottom:8px">${temFiltroReceitasAtivo() ? `${receitasFiltradas.length} de ${receitas.length} receitas` : ''}</p>
          <div id="container-receitas">
            ${renderizarTabelaReceitas(receitasFiltradas)}
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();

  if (gastos.length) {
    desenharGrafico(porCategoria, categorias, totalGastos);
  }

  // Eventos da tabela
  const containerTabela = secao.querySelector('#container-tabela');
  if (containerTabela) registrarEventosTabela(containerTabela);

  const btnExcluirSel = secao.querySelector('#btn-excluir-selecionados');
  if (btnExcluirSel) btnExcluirSel.addEventListener('click', excluirSelecionados);
  const btnExcluirSelRec = secao.querySelector('#btn-excluir-selecionados-receitas');
  if (btnExcluirSelRec) btnExcluirSelRec.addEventListener('click', excluirSelecionadasReceitas);

  // Seletor de mês (recriado a cada render)
  secao.querySelector('#btn-mes-anterior').addEventListener('click', irParaMesAnterior);
  secao.querySelector('#btn-proximo-mes').addEventListener('click', irParaProximoMes);

  // Abas
  secao.querySelectorAll('.aba-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      abaAtivaDashboard = btn.dataset.aba;
      secao.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
      btn.classList.add('ativa');

      const abaGastos = secao.querySelector('#aba-gastos');
      const abaReceitas = secao.querySelector('#aba-receitas');
      const cardGrafico = secao.querySelector('#card-grafico');
      const cardLista = secao.querySelector('#card-lista');

      abaGastos.style.display = abaAtivaDashboard === 'gastos' ? 'block' : 'none';
      abaReceitas.style.display = abaAtivaDashboard === 'receitas' ? 'block' : 'none';
      secao.querySelector('#btn-adicionar-rapido').style.display = abaAtivaDashboard === 'gastos' ? 'flex' : 'none';
      secao.querySelector('#btn-adicionar-receita').style.display = abaAtivaDashboard === 'receitas' ? 'flex' : 'none';
      cardGrafico.style.display = abaAtivaDashboard === 'gastos' ? 'flex' : 'none';
      cardLista.style.gridColumn = abaAtivaDashboard === 'receitas' ? '1 / -1' : '';
      secao.querySelector('#btn-exportar-csv').style.display = abaAtivaDashboard === 'gastos' ? 'flex' : 'none';
      secao.querySelector('#btn-exportar-csv-receitas').style.display = abaAtivaDashboard === 'receitas' ? 'flex' : 'none';
      secao.querySelector('#btn-excluir-selecionados').style.display = 'none';
      secao.querySelector('#btn-excluir-selecionados-receitas').style.display = 'none';

      const abaAtiva = abaAtivaDashboard === 'gastos' ? abaGastos : abaReceitas;
      abaAtiva.classList.remove('aba-conteudo-ativo');
      void abaAtiva.offsetWidth; // força reflow para reiniciar a animação
      abaAtiva.classList.add('aba-conteudo-ativo');
    });
  });

  // Botão rápido de adicionar
  secao.querySelector('#btn-adicionar-rapido').addEventListener('click', abrirModalAdicionarGasto);

  // Receitas
  secao.querySelector('#btn-adicionar-receita').addEventListener('click', () => abrirModalReceita());
  registrarEventosReceitas(secao.querySelector('#container-receitas'));

  // Exportar CSV do mês
  secao.querySelector('#btn-exportar-csv').addEventListener('click', () => {
    const gastosExportar = aplicarFiltros(gastosDoMes());
    exportarCSV(gastosExportar, categorias, `gastos-${labelMesFormatado().toLowerCase().replace(' ', '-')}`);
  });

  // Filtros
  secao.querySelector('#filtro-texto').addEventListener('input', e => {
    filtro.texto = e.target.value;
    atualizarTabela();
  });
  inicializarSelectCategoria('filtro-categoria', valor => {
    filtro.categoriaId = valor;
    atualizarTabela();
  });
  secao.querySelector('#filtro-valor-min').addEventListener('input', e => {
    filtro.valorMin = e.target.value;
    atualizarTabela();
  });
  secao.querySelector('#filtro-valor-max').addEventListener('input', e => {
    filtro.valorMax = e.target.value;
    atualizarTabela();
  });
  const btnLimpar = secao.querySelector('#btn-limpar-filtro');
  if (btnLimpar) btnLimpar.addEventListener('click', limparFiltros);

  // Exportar CSV de receitas
  secao.querySelector('#btn-exportar-csv-receitas').addEventListener('click', () => {
    const receitasExportar = aplicarFiltrosReceitas(receitasDoMes());
    exportarCSVReceitas(receitasExportar, `receitas-${labelMesFormatado().toLowerCase().replace(' ', '-')}`);
  });

  // Filtros de receitas
  const atualizarTabelaReceitas = () => {
    const todas = receitasDoMes();
    const filtradas = aplicarFiltrosReceitas(todas);
    const container = secao.querySelector('#container-receitas');
    container.innerHTML = renderizarTabelaReceitas(filtradas);
    registrarEventosReceitas(container);
    const info = secao.querySelector('#info-filtro-receitas');
    if (info) info.textContent = temFiltroReceitasAtivo() ? `${filtradas.length} de ${todas.length} receitas` : '';
    const btnLimpar = secao.querySelector('#btn-limpar-filtro-receitas');
    if (btnLimpar) btnLimpar.addEventListener('click', limparFiltrosReceitas);
  };
  secao.querySelector('#filtro-texto-receitas').addEventListener('input', e => {
    filtroReceitas.texto = e.target.value;
    atualizarTabelaReceitas();
  });
  secao.querySelector('#filtro-valor-min-receitas').addEventListener('input', e => {
    filtroReceitas.valorMin = e.target.value;
    atualizarTabelaReceitas();
  });
  secao.querySelector('#filtro-valor-max-receitas').addEventListener('input', e => {
    filtroReceitas.valorMax = e.target.value;
    atualizarTabelaReceitas();
  });
  const btnLimparReceitas = secao.querySelector('#btn-limpar-filtro-receitas');
  if (btnLimparReceitas) btnLimparReceitas.addEventListener('click', limparFiltrosReceitas);
}

function atualizarTabela() {
  const secao = document.getElementById('secao-dashboard');
  const gastos = gastosDoMes();
  const gastosFiltrados = aplicarFiltros(gastos);
  const categorias = carregarCategorias();

  // Atualiza contagem
  const info = secao.querySelector('#info-filtro');
  if (info) info.textContent = temFiltroAtivo() ? `${gastosFiltrados.length} de ${gastos.length} gastos` : '';

  // Mostra/esconde botão limpar
  const container = secao.querySelector('#barra-filtro');
  let btnLimpar = secao.querySelector('#btn-limpar-filtro');
  if (temFiltroAtivo() && !btnLimpar) {
    btnLimpar = document.createElement('button');
    btnLimpar.id = 'btn-limpar-filtro';
    btnLimpar.className = 'btn-limpar-filtro';
    btnLimpar.textContent = '✕ Limpar';
    btnLimpar.addEventListener('click', limparFiltros);
    container.appendChild(btnLimpar);
  } else if (!temFiltroAtivo() && btnLimpar) {
    btnLimpar.remove();
  }

  // Substitui só o conteúdo da tabela
  const tabelaContainer = secao.querySelector('#container-tabela');
  if (tabelaContainer) {
    tabelaContainer.innerHTML = renderizarTabelaGastos(gastosFiltrados, categorias);
    registrarEventosTabela(tabelaContainer);
  }
}

function duplicarGasto(id) {
  const gasto = carregarGastos().find(g => g.id === id);
  if (!gasto) return;
  abrirModalGasto(gasto, true);
}

function toggleStatus(id) {
  const gastos = carregarGastos();
  const idx = gastos.findIndex(g => g.id === id);
  if (idx === -1) return;
  gastos[idx].status = gastos[idx].status === 'pendente' ? 'pago' : 'pendente';
  salvarGastos(gastos);
  atualizarTabela();
}

function registrarEventosTabela(container) {
  container.querySelectorAll('[data-editar]').forEach(btn =>
    btn.addEventListener('click', () => abrirModalEdicao(btn.dataset.editar)));
  container.querySelectorAll('[data-excluir]').forEach(btn =>
    btn.addEventListener('click', () => excluirGasto(btn.dataset.excluir)));
  container.querySelectorAll('[data-duplicar]').forEach(btn =>
    btn.addEventListener('click', () => duplicarGasto(btn.dataset.duplicar)));
  container.querySelectorAll('[data-toggle-status]').forEach(btn =>
    btn.addEventListener('click', () => toggleStatus(btn.dataset.toggleStatus)));
  container.querySelectorAll('.chk-gasto').forEach(chk =>
    chk.addEventListener('change', atualizarBotaoExclusao));
  const chkTodos = container.querySelector('#chk-todos-lista');
  if (chkTodos) {
    chkTodos.addEventListener('change', function () {
      container.querySelectorAll('.chk-gasto').forEach(c => { c.checked = this.checked; });
      atualizarBotaoExclusao();
    });
  }
}

function atualizarBotaoExclusao() {
  const secao = document.getElementById('secao-dashboard');
  const marcados = secao.querySelectorAll('.chk-gasto:checked');
  const btn = secao.querySelector('#btn-excluir-selecionados');
  const contador = secao.querySelector('#contador-selecionados');
  if (!btn) return;
  btn.style.display = marcados.length > 0 ? 'inline-block' : 'none';
  if (contador) contador.textContent = marcados.length;
}

function excluirSelecionados() {
  const secao = document.getElementById('secao-dashboard');
  const ids = [...secao.querySelectorAll('.chk-gasto:checked')].map(c => c.dataset.id);
  if (!ids.length) return;

  confirmarModal('Excluir gastos', `Deseja excluir <strong>${ids.length} gasto(s)</strong> selecionado(s)?`, () => {
    const todos = carregarGastos();
    const backup = [...todos];
    salvarGastos(todos.filter(g => !ids.includes(g.id)));
    renderizarDashboard();
    mostrarToast(`${ids.length} gasto(s) excluído(s).`, 'sucesso', () => {
      salvarGastos(backup);
      renderizarDashboard();
      mostrarToast('Exclusão desfeita.', 'sucesso');
    });
  });
}

function renderizarTabelaGastos(gastos, categorias) {
  if (!gastos.length) {
    return `
      <div class="estado-vazio">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="14" y="10" width="44" height="52" rx="5" stroke="currentColor" stroke-width="3"/>
          <path d="M24 26h24M24 36h24M24 46h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <p class="titulo-vazio">Nenhum gasto neste mês</p>
        <p class="sub-vazio">Adicione um gasto manualmente ou importe um arquivo CSV</p>
      </div>`;
  }

  const gastosOrdenados = [...gastos].sort((a, b) => b.data.localeCompare(a.data));

  const linhas = gastosOrdenados.map(g => {
    const cat = categorias.find(c => c.id === g.categoriaId);
    const nomeCat = cat ? cat.nome : 'Sem categoria';
    const corCat = cat ? cat.cor : '#aaa';
    const pendente = g.status === 'pendente';
    return `
      <tr class="${pendente ? 'linha-pendente' : ''}">
        <td><input type="checkbox" class="chk-gasto" data-id="${g.id}" /></td>
        <td>${formatarData(g.data)}</td>
        <td>
          ${g.recorrente ? `<span title="Gasto recorrente">${ICONES.recorrente}</span>` : ''}${g.descricao}
        </td>
        <td><span class="badge-categoria" style="background:${corCat}">${nomeCat}</span></td>
        <td><strong>${formatarMoeda(g.valor)}</strong></td>
        <td>
          <button class="badge-status ${pendente ? 'pendente' : 'pago'}" data-toggle-status="${g.id}" title="Clique para alternar status">
            ${pendente ? 'Pendente' : 'Pago'}
          </button>
        </td>
        <td>
          <div class="acoes-gasto">
            <button class="btn-acao" data-editar="${g.id}">Editar</button>
            <button class="btn-acao" data-duplicar="${g.id}" title="Duplicar gasto">Duplicar</button>
            <button class="btn-acao excluir" data-excluir="${g.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table class="tabela-gastos">
      <thead>
        <tr>
          <th><input type="checkbox" id="chk-todos-lista" title="Selecionar todos" /></th>
          <th>Data</th>
          <th>Descrição</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function desenharGraficoComparativo() {
  if (graficoComparativo) { graficoComparativo.destroy(); graficoComparativo = null; }
  const canvas = document.getElementById('canvas-comparativo');
  if (!canvas) return;

  const todosGastos = carregarGastos();
  const todasReceitas = carregarReceitas();
  const nomesMeses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Gera os últimos 6 meses (incluindo o atual)
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    let m = mesAtual - i;
    let a = anoAtual;
    if (m < 0) { m += 12; a--; }
    meses.push({ mes: m, ano: a, label: `${nomesMeses[m]}/${String(a).slice(2)}` });
  }

  const dadosGastos = meses.map(({ mes, ano }) => {
    const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    return todosGastos.filter(g => g.data.startsWith(prefixo)).reduce((s, g) => s + g.valor, 0);
  });
  const dadosReceitas = meses.map(({ mes, ano }) => {
    const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    return todasReceitas.filter(r => r.data.startsWith(prefixo)).reduce((s, r) => s + r.valor, 0);
  });

  graficoComparativo = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: meses.map(m => m.label),
      datasets: [
        {
          label: 'Gastos',
          data: dadosGastos,
          backgroundColor: dadosGastos.map((_, i) => i === 5 ? 'rgba(240,79,90,0.9)' : 'rgba(240,79,90,0.5)'),
          borderRadius: 5,
          borderSkipped: false,
        },
        {
          label: 'Receitas',
          data: dadosReceitas,
          backgroundColor: dadosReceitas.map((_, i) => i === 5 ? 'rgba(46,204,113,0.9)' : 'rgba(46,204,113,0.5)'),
          borderRadius: 5,
          borderSkipped: false,
        }
      ]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + formatarMoeda(ctx.parsed.y) } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6880' } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6880', callback: v => v === 0 ? '0' : 'R$' + (v/1000).toFixed(1) + 'k' } }
      }
    }
  });
}

function desenharGrafico(porCategoria, categorias, total) {
  if (graficoInstancia) {
    graficoInstancia.destroy();
    graficoInstancia = null;
  }

  const canvas = document.getElementById('canvas-grafico');
  if (!canvas) return;

  const labels = [];
  const dados = [];
  const cores = [];

  Object.entries(porCategoria).forEach(([catId, valor]) => {
    const cat = categorias.find(c => c.id === catId);
    labels.push(cat ? cat.nome : 'Sem categoria');
    dados.push(valor);
    cores.push(cat ? cat.cor : '#aaa');
  });

  graficoInstancia = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dados,
        backgroundColor: cores,
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      cutout: '65%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          label: ctx => ` ${formatarMoeda(ctx.parsed)}`
        }
      }},
    }
  });

  // Legenda manual
  const legenda = document.getElementById('legenda-grafico');
  if (legenda) {
    legenda.innerHTML = labels.map((label, i) => {
      const pct = total > 0 ? ((dados[i] / total) * 100).toFixed(1) : 0;
      return `
        <div class="item-legenda">
          <span class="cor-dot" style="background:${cores[i]}"></span>
          <span>${label}</span>
          <span class="pct-legenda">${pct}%</span>
          <span class="valor-legenda">${formatarMoeda(dados[i])}</span>
        </div>
      `;
    }).join('');
  }
}

// ===== Formulário — Adicionar / Editar Gasto =====

function htmlSelectCategoria(idInput, categorias, selectedId = null, placeholder = 'Selecione...') {
  const cats = [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const sel = selectedId ? cats.find(c => c.id === selectedId) : null;

  const opcoesHtml = cats.map(c => `
    <div class="cat-opcao ${c.id === selectedId ? 'selecionada' : ''}" data-valor="${c.id}" data-cor="${c.cor}" data-nome="${c.nome}">
      <span class="cat-bolinha" style="background:${c.cor}"></span>
      ${c.nome}
    </div>
  `).join('');

  return `
    <div class="cat-select-wrapper" id="wrapper-${idInput}">
      <div class="cat-select-trigger" tabindex="0">
        <span class="cat-bolinha-trigger" style="background:${sel ? sel.cor : 'transparent'};${!sel ? 'border:2px dashed var(--cor-borda)' : ''}"></span>
        <span class="cat-select-texto">${sel ? sel.nome : placeholder}</span>
        <span class="cat-select-seta">▾</span>
      </div>
      <div class="cat-select-dropdown">
        <div class="cat-opcao ${!selectedId ? 'selecionada' : ''}" data-valor="" data-cor="" data-nome="${placeholder}">
          <span class="cat-bolinha" style="background:transparent;border:2px dashed var(--cor-borda)"></span>
          ${placeholder}
        </div>
        ${opcoesHtml}
      </div>
      <input type="hidden" id="${idInput}" value="${selectedId || ''}" />
    </div>
  `;
}

function inicializarSelectCategoria(idInput, aoMudar = null) {
  const wrapper = document.getElementById(`wrapper-${idInput}`);
  if (!wrapper) return;

  const trigger = wrapper.querySelector('.cat-select-trigger');
  const dropdown = wrapper.querySelector('.cat-select-dropdown');
  const input = wrapper.querySelector(`#${idInput}`);
  const texto = wrapper.querySelector('.cat-select-texto');
  const bolinhaT = wrapper.querySelector('.cat-bolinha-trigger');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isAberto = wrapper.classList.contains('aberto');
    document.querySelectorAll('.cat-select-wrapper.aberto').forEach(w => {
      if (w !== wrapper) {
        w.querySelector('.cat-select-dropdown').style.cssText = '';
        w.classList.remove('aberto');
      }
    });
    if (!isAberto) {
      const rect = trigger.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = rect.width + 'px';
      dropdown.style.right = 'auto';
      dropdown.style.zIndex = '9999';
    }
    wrapper.classList.toggle('aberto');
  });

  wrapper.querySelectorAll('.cat-opcao').forEach(opcao => {
    opcao.addEventListener('click', () => {
      const valor = opcao.dataset.valor;
      const cor = opcao.dataset.cor;
      const nome = opcao.dataset.nome;

      input.value = valor;
      texto.textContent = nome;
      bolinhaT.style.background = cor || 'transparent';
      bolinhaT.style.border = cor ? 'none' : '2px dashed var(--cor-borda)';

      wrapper.querySelectorAll('.cat-opcao').forEach(o => o.classList.remove('selecionada'));
      opcao.classList.add('selecionada');
      dropdown.style.cssText = '';
      wrapper.classList.remove('aberto');

      if (aoMudar) aoMudar(valor);
    });
  });
}

function atualizarSelectCategorias(catIdSelecionada = null) {
  const wrapper = document.getElementById('wrapper-inp-categoria');
  if (!wrapper) return;
  const categorias = carregarCategorias();
  const temp = document.createElement('div');
  temp.innerHTML = htmlSelectCategoria('inp-categoria', categorias, catIdSelecionada);
  wrapper.replaceWith(temp.firstElementChild);
  inicializarSelectCategoria('inp-categoria');
}

function renderizarFormularioGasto(gasto = null) {
  const secao = document.getElementById('secao-adicionar');
  const edicao = !!gasto;
  const hoje = new Date().toISOString().split('T')[0];
  const categorias = carregarCategorias();

  secao.innerHTML = `
    <h1 class="titulo-secao">${edicao ? 'Editar Gasto' : 'Adicionar Gasto'}</h1>
    <div class="card" style="max-width:520px">
      <form id="form-gasto">
        <div class="form-linha">
          <div class="form-grupo">
            <label for="inp-valor">Valor</label>
            <div class="input-prefixo">
              <span>R$</span>
              <input type="number" id="inp-valor" step="0.01" min="0.01" placeholder="0,00"
                value="${gasto ? gasto.valor : ''}" required />
            </div>
          </div>
          <div class="form-grupo">
            <label for="inp-data">Data</label>
            <input type="date" id="inp-data" value="${gasto ? gasto.data : hoje}" required />
          </div>
        </div>
        <div class="form-grupo">
          <label for="inp-descricao">Descrição</label>
          <input type="text" id="inp-descricao" placeholder="Ex: Supermercado"
            value="${gasto ? gasto.descricao : ''}" required maxlength="120" />
        </div>
        <div class="form-grupo">
          <label>Categoria</label>
          <div style="display:flex;gap:8px;align-items:center">
            ${htmlSelectCategoria('inp-categoria', categorias, gasto ? gasto.categoriaId : null)}
            <button type="button" id="btn-nova-cat-rapido" class="btn btn-secundario" style="padding:9px 14px;white-space:nowrap">
              + Nova
            </button>
          </div>
        </div>
        <div class="form-linha">
          <div class="form-grupo">
            <label for="inp-status">Status</label>
            <select id="inp-status">
              <option value="pago" ${!gasto || gasto.status !== 'pendente' ? 'selected' : ''}>Pago</option>
              <option value="pendente" ${gasto && gasto.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            </select>
          </div>
          <div class="form-grupo" style="flex-direction:row;align-items:center;gap:10px;padding-top:22px">
            <input type="checkbox" id="inp-recorrente" style="width:16px;height:16px;cursor:pointer;accent-color:var(--cor-ativo)" ${gasto && gasto.recorrente ? 'checked' : ''} />
            <label for="inp-recorrente" style="cursor:pointer;font-weight:500;margin:0;font-size:13px">
              Recorrente <span style="font-size:11px;color:var(--cor-texto-suave);font-weight:400">(repete todo mês)</span>
            </label>
          </div>
        </div>
        <div class="acoes-form">
          <button type="submit" class="btn btn-primario">${edicao ? 'Salvar alterações' : 'Adicionar'}</button>
          <button type="button" class="btn btn-secundario" id="btn-cancelar-form">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-gasto').addEventListener('submit', e => {
    e.preventDefault();
    salvarGastoDoForm(gasto ? gasto.id : null);
  });

  document.getElementById('btn-cancelar-form').addEventListener('click', () => {
    irParaSecao('dashboard');
  });

  inicializarSelectCategoria('inp-categoria');

  document.getElementById('btn-nova-cat-rapido').addEventListener('click', () => {
    abrirModalCategoriaRapido();
  });
}

function abrirModalCategoriaRapido() {
  abrirModalNovaCategoria(novaId => atualizarSelectCategorias(novaId));
}

function abrirModalCategoriaCSV() {
  abrirModalNovaCategoria(novaId => {
    const categorias = carregarCategorias();

    // Atualiza dropdown de lote (CSV bancário)
    const slotLote = document.getElementById('slot-lote-cat');
    if (slotLote) {
      slotLote.innerHTML = htmlSelectCategoria('inp-cat-lote', categorias, null, '— selecione —');
      inicializarSelectCategoria('inp-cat-lote');
    }

    // Atualiza dropdowns individuais de cada linha (CSV bancário) preservando seleção atual
    document.querySelectorAll('#corpo-revisao tr').forEach(tr => {
      const idx = tr.dataset.idx;
      const idInput = `inp-cat-csv-${idx}`;
      const valorAtual = document.getElementById(idInput)?.value;
      const td = tr.querySelector('td:last-child');
      if (td) {
        td.innerHTML = htmlSelectCategoria(idInput, categorias, valorAtual || null, 'Selecione...');
        inicializarSelectCategoria(idInput);
      }
    });

    // Atualiza dropdown de lote (planilha anual)
    const slotLotePlan = document.getElementById('slot-lote-cat-planilha');
    if (slotLotePlan) {
      slotLotePlan.innerHTML = htmlSelectCategoria('inp-cat-lote-planilha', categorias, null, '— selecione —');
      inicializarSelectCategoria('inp-cat-lote-planilha');
    }

    // Atualiza dropdowns individuais de cada linha (planilha anual) preservando seleção atual
    document.querySelectorAll('.chk-plan').forEach(chk => {
      const i = chk.dataset.idx;
      const idInput = `inp-cat-plan-${i}`;
      const valorAtual = document.getElementById(idInput)?.value;
      const td = chk.closest('tr')?.querySelector('td:last-child');
      if (td) {
        td.innerHTML = htmlSelectCategoria(idInput, categorias, valorAtual || null, 'Selecione...');
        inicializarSelectCategoria(idInput);
      }
    });
  });
}

function abrirModalNovaCategoria(callback, aoCancelar = null) {
  const modal = document.getElementById('modal');
  const overlay = document.getElementById('overlay-modal');

  const cancelar = aoCancelar || fecharModal;

  modal.innerHTML = `
    <button id="btn-fechar-modal">✕</button>
    <h2>Nova categoria</h2>
    <form id="form-categoria-rapido">
      <div class="form-grupo">
        <label for="inp-nome-cat">Nome</label>
        <input type="text" id="inp-nome-cat" required maxlength="40" placeholder="Ex: Academia" />
      </div>
      <div class="form-grupo">
        <label for="inp-cor-cat">Cor</label>
        <input type="color" id="inp-cor-cat" value="#6c63ff" style="height:40px;padding:2px 6px" />
      </div>
      <div class="acoes-form">
        <button type="submit" class="btn btn-primario">Criar</button>
        <button type="button" class="btn btn-secundario" id="btn-cancelar-modal">Cancelar</button>
      </div>
    </form>
  `;

  overlay.classList.add('visivel');

  document.getElementById('btn-fechar-modal').addEventListener('click', cancelar);
  document.getElementById('btn-cancelar-modal').addEventListener('click', cancelar);
  overlay.addEventListener('click', e => { if (e.target === overlay) cancelar(); });

  document.getElementById('form-categoria-rapido').addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('inp-nome-cat').value.trim();
    const cor = document.getElementById('inp-cor-cat').value;
    if (!nome) { mostrarToast('Nome obrigatório.', 'erro'); return; }

    const categorias = carregarCategorias();
    const novaId = gerarId();
    categorias.push({ id: novaId, nome, cor });
    salvarCategorias(categorias);
    fecharModal();
    mostrarToast('Categoria criada!', 'sucesso');
    callback(novaId);
  });
}

function salvarGastoDoForm(idExistente, aoSalvar = null) {
  const valor = parseFloat(document.getElementById('inp-valor').value);
  const data = document.getElementById('inp-data').value;
  const descricao = document.getElementById('inp-descricao').value.trim();
  const categoriaId = document.getElementById('inp-categoria').value;
  const recorrente = document.getElementById('inp-recorrente').checked;
  const status = document.getElementById('inp-status').value;

  if (!valor || valor <= 0) { mostrarToast('Valor inválido.', 'erro'); return; }
  if (!data) { mostrarToast('Data inválida.', 'erro'); return; }
  if (!descricao) { mostrarToast('Descrição obrigatória.', 'erro'); return; }
  if (!categoriaId) { mostrarToast('Selecione uma categoria.', 'erro'); return; }

  const gastos = carregarGastos();

  if (idExistente) {
    const idx = gastos.findIndex(g => g.id === idExistente);
    if (idx !== -1) {
      gastos[idx] = { id: idExistente, data, descricao, valor, categoriaId, recorrente, status };
    }
    mostrarToast('Gasto atualizado!', 'sucesso');
  } else {
    gastos.push({ id: gerarId(), data, descricao, valor, categoriaId, recorrente, status });
    mostrarToast('Gasto adicionado!', 'sucesso');
  }

  salvarGastos(gastos);
  if (aoSalvar) aoSalvar();
  else irParaSecao('dashboard');
}

function abrirModalAdicionarGasto() {
  abrirModalGasto(null, false);
}

function abrirModalGasto(gasto = null, isDuplicar = false, aoSalvarExtra = null) {
  const diaHoje = new Date().getDate();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const dia = Math.min(diaHoje, diasNoMes);
  const hoje = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const overlay = document.getElementById('overlay-modal');
  const modal = document.getElementById('modal');
  const categorias = carregarCategorias();

  const isEdicao = !!gasto && !isDuplicar;
  const titulo = isEdicao ? 'Editar Gasto' : isDuplicar ? 'Duplicar Gasto' : 'Adicionar Gasto';
  const txtBotao = isEdicao ? 'Salvar' : isDuplicar ? 'Duplicar' : 'Adicionar';
  const idExistente = isEdicao ? gasto.id : null;

  const valorPreenchido = gasto ? gasto.valor : '';
  const dataPreenchida = gasto ? gasto.data : hoje;
  const descPreenchida = gasto ? gasto.descricao : '';
  const catPreenchida = gasto ? gasto.categoriaId : null;
  const statusPreenchido = gasto ? gasto.status : 'pago';
  const recorrentePreenchido = gasto ? gasto.recorrente : false;

  modal.innerHTML = `
    <h2>${titulo}</h2>
    <form id="form-modal-gasto" style="margin-top:16px">
      <div class="form-linha">
        <div class="form-grupo">
          <label for="inp-valor">Valor</label>
          <div class="input-prefixo">
            <span>R$</span>
            <input type="number" id="inp-valor" step="0.01" min="0.01" placeholder="0,00" value="${valorPreenchido}" required />
          </div>
        </div>
        <div class="form-grupo">
          <label for="inp-data">Data</label>
          <input type="date" id="inp-data" value="${dataPreenchida}" required />
        </div>
      </div>
      <div class="form-grupo">
        <label for="inp-descricao">Descrição</label>
        <input type="text" id="inp-descricao" placeholder="Ex: Supermercado" value="${descPreenchida}" required maxlength="120" />
        <div id="sugestao-categoria" style="font-size:12px;color:var(--cor-texto-suave);margin-top:5px;min-height:16px"></div>
      </div>
      <div class="form-grupo">
        <label>Categoria</label>
        <div style="display:flex;gap:8px;align-items:center">
          ${htmlSelectCategoria('inp-categoria', categorias, catPreenchida)}
          <button type="button" id="btn-nova-cat-rapido" class="btn btn-secundario" style="padding:9px 14px;white-space:nowrap">+ Nova</button>
        </div>
      </div>
      <div class="form-linha">
        <div class="form-grupo">
          <label for="inp-status">Status</label>
          <select id="inp-status">
            <option value="pago" ${statusPreenchido === 'pago' ? 'selected' : ''}>Pago</option>
            <option value="pendente" ${statusPreenchido === 'pendente' ? 'selected' : ''}>Pendente</option>
          </select>
        </div>
        <div class="form-grupo" style="flex-direction:row;align-items:center;gap:10px;padding-top:22px">
          <input type="checkbox" id="inp-recorrente" style="width:16px;height:16px;cursor:pointer;accent-color:var(--cor-ativo)" ${recorrentePreenchido ? 'checked' : ''} />
          <label for="inp-recorrente" style="cursor:pointer;font-weight:500;margin:0;font-size:13px">
            Recorrente <span style="font-size:11px;color:var(--cor-texto-suave);font-weight:400">(repete todo mês)</span>
          </label>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" id="btn-cancelar-modal-gasto" class="btn btn-secundario">Cancelar</button>
        <button type="submit" class="btn btn-primario">${txtBotao}</button>
      </div>
    </form>
  `;
  overlay.classList.add('visivel');

  inicializarSelectCategoria('inp-categoria');

  // Auto-categorização
  const inpDescricao = document.getElementById('inp-descricao');
  const divSugestao = document.getElementById('sugestao-categoria');
  let sugestaoAplicada = false;

  inpDescricao.addEventListener('input', () => {
    const catAtual = document.getElementById('inp-categoria').value;
    const catSugerida = buscarCategoriaSugerida(inpDescricao.value);

    if (catSugerida && !catAtual) {
      const categorias = carregarCategorias();
      const cat = categorias.find(c => c.id === catSugerida);
      if (cat) {
        atualizarSelectCategorias(catSugerida);
        divSugestao.innerHTML = `<span style="color:var(--cor-ativo)">✦</span> Categoria sugerida: <strong>${cat.nome}</strong>`;
        sugestaoAplicada = true;
      }
    } else if (!catSugerida && sugestaoAplicada) {
      atualizarSelectCategorias(null);
      divSugestao.textContent = '';
      sugestaoAplicada = false;
    } else if (!catSugerida) {
      divSugestao.textContent = '';
    }
  });

  document.getElementById('btn-cancelar-modal-gasto').addEventListener('click', () => {
    overlay.classList.remove('visivel');
  });

  document.getElementById('btn-nova-cat-rapido').addEventListener('click', () => {
    abrirModalNovaCategoria(
      novaId => { abrirModalGasto(gasto, isDuplicar); atualizarSelectCategorias(novaId); },
      () => abrirModalGasto(gasto, isDuplicar)
    );
  });

  document.getElementById('form-modal-gasto').addEventListener('submit', e => {
    e.preventDefault();
    salvarGastoDoForm(idExistente, () => {
      overlay.classList.remove('visivel');
      renderizarDashboard();
      if (aoSalvarExtra) aoSalvarExtra();
    });
  });
}

function excluirGasto(id) {
  const todos = carregarGastos();
  const gasto = todos.find(g => g.id === id);
  if (!gasto) return;

  confirmarModal('Excluir gasto', `Deseja excluir <strong>${gasto.descricao}</strong>?`, () => {
    const backup = [...todos];
    if (gasto.recorrente) registrarExclusaoRecorrente(gasto);
    salvarGastos(todos.filter(g => g.id !== id));
    renderizarDashboard();
    mostrarToast('Gasto excluído.', 'sucesso', () => {
      salvarGastos(backup);
      renderizarDashboard();
      mostrarToast('Exclusão desfeita.', 'sucesso');
    });
  });
}

// ===== Modal de edição =====

function abrirModalEdicao(id) {
  const gasto = carregarGastos().find(g => g.id === id);
  if (!gasto) return;
  abrirModalGasto(gasto, false);
}

// ===== Importar CSV =====

function atualizarStepperCSV(etapa) {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById(`csv-step-${n}`);
    if (!el) return;
    el.classList.remove('ativo', 'concluido');
    const num = el.querySelector('.step-numero');
    if (n < etapa) { el.classList.add('concluido'); num.textContent = '✓'; }
    else if (n === etapa) { el.classList.add('ativo'); num.textContent = n; }
    else { num.textContent = n; }
  });
  [1, 2].forEach(n => {
    const linha = document.getElementById(`csv-linha-${n}`);
    if (!linha) return;
    linha.classList.remove('ativa', 'concluida');
    if (n < etapa - 1) linha.classList.add('concluida');
    else if (n === etapa - 1) linha.classList.add('ativa');
  });
}

function renderizarImportarCSV() {
  const secao = document.getElementById('secao-importar');
  secao.innerHTML = `
    <h1 class="titulo-secao">Importar CSV</h1>

    <div style="display:flex;gap:8px;margin-bottom:20px">
      <button class="btn ${tipoImportacaoCSV === 'gastos' ? 'btn-primario' : 'btn-secundario'}" id="tab-importar-gastos">Gastos</button>
      <button class="btn ${tipoImportacaoCSV === 'receitas' ? 'btn-primario' : 'btn-secundario'}" id="tab-importar-receitas">Receitas</button>
    </div>

    <div class="card">
      <div class="stepper">
        <div class="step ativo" id="csv-step-1">
          <div class="step-numero">1</div><span>Upload</span>
        </div>
        <div class="step-linha" id="csv-linha-1"></div>
        <div class="step" id="csv-step-2">
          <div class="step-numero">2</div><span>Mapear colunas</span>
        </div>
        <div class="step-linha" id="csv-linha-2"></div>
        <div class="step" id="csv-step-3">
          <div class="step-numero">3</div><span>Revisar e importar</span>
        </div>
      </div>

      <div id="area-upload">
        <div class="icone-upload">📂</div>
        <p><strong>Clique para selecionar</strong> ou arraste o arquivo CSV aqui</p>
        <p style="margin-top:6px;font-size:12px">Compatível com qualquer banco — você mapeia as colunas</p>
        <input type="file" id="input-csv" accept=".csv,.txt" />
      </div>

      <div id="secao-mapeamento">
        <div class="titulo-etapa">
          <span class="badge-etapa">1</span> Mapear colunas
        </div>
        <div class="form-linha" style="max-width:600px">
          <div class="form-grupo">
            <label>Coluna de Data</label>
            <select id="map-data"></select>
          </div>
          <div class="form-grupo">
            <label>Formato da data</label>
            <select id="map-formato-data">
              <option value="dd/mm/yyyy">DD/MM/AAAA</option>
              <option value="yyyy-mm-dd">AAAA-MM-DD</option>
              <option value="mm/dd/yyyy">MM/DD/AAAA</option>
            </select>
          </div>
          <div class="form-grupo">
            <label>Coluna de Valor</label>
            <select id="map-valor"></select>
          </div>
          <div class="form-grupo">
            <label>Coluna de Descrição</label>
            <select id="map-descricao"></select>
          </div>
        </div>
        <button class="btn btn-primario" id="btn-avancar-mapeamento">Avançar ›</button>
      </div>

      <div id="secao-revisao">
        <div class="titulo-etapa" style="margin-top:24px">
          <span class="badge-etapa">2</span> Revisar e categorizar
        </div>
        <div class="acoes-revisao">
          <div class="select-lote">
            <span>Aplicar categoria em lote:</span>
            <div id="slot-lote-cat" style="min-width:180px"></div>
            <button class="btn btn-secundario" id="btn-aplicar-lote" style="padding:6px 14px">Aplicar aos selecionados</button>
            <button class="btn btn-secundario" id="btn-nova-cat-csv" style="padding:6px 14px">+ Nova categoria</button>
          </div>
        </div>
        <div style="overflow-x:auto;margin-top:12px">
          <table class="tabela-gastos" id="tabela-revisao">
            <thead>
              <tr>
                <th><input type="checkbox" id="chk-todos" checked /></th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
              </tr>
            </thead>
            <tbody id="corpo-revisao"></tbody>
          </table>
        </div>
        <div class="acoes-form" style="margin-top:20px">
          <button class="btn btn-sucesso" id="btn-confirmar-importacao">Importar selecionados</button>
          <button class="btn btn-secundario" id="btn-cancelar-importacao">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  // Injeta dropdown customizado de lote
  const slotLote = document.getElementById('slot-lote-cat');
  const categorias = carregarCategorias();
  slotLote.innerHTML = htmlSelectCategoria('inp-cat-lote', categorias, null, '— selecione —');
  inicializarSelectCategoria('inp-cat-lote');

  configurarEventosUpload();

  document.getElementById('tab-importar-gastos').addEventListener('click', () => {
    tipoImportacaoCSV = 'gastos';
    renderizarImportarCSV();
  });
  document.getElementById('tab-importar-receitas').addEventListener('click', () => {
    tipoImportacaoCSV = 'receitas';
    renderizarImportarCSV();
  });
}

function configurarEventosUpload() {
  const areaUpload = document.getElementById('area-upload');
  const inputCsv = document.getElementById('input-csv');

  areaUpload.addEventListener('click', () => inputCsv.click());

  areaUpload.addEventListener('dragover', e => {
    e.preventDefault();
    areaUpload.classList.add('dragover');
  });

  areaUpload.addEventListener('dragleave', () => areaUpload.classList.remove('dragover'));

  areaUpload.addEventListener('drop', e => {
    e.preventDefault();
    areaUpload.classList.remove('dragover');
    const arquivo = e.dataTransfer.files[0];
    if (arquivo) processarArquivoCSV(arquivo);
  });

  inputCsv.addEventListener('change', () => {
    if (inputCsv.files[0]) processarArquivoCSV(inputCsv.files[0]);
  });
}

// Detecta o delimitador mais provável do CSV
function detectarDelimitador(linha) {
  const candidatos = ['\t', ';', ','];
  let melhor = ',';
  let maiorContagem = 0;
  candidatos.forEach(sep => {
    const contagem = (linha.match(new RegExp('\\' + (sep === '\t' ? 't' : sep), 'g')) || []).length;
    // para tab usamos split direto
    const count = sep === '\t' ? (linha.split('\t').length - 1) : contagem;
    if (count > maiorContagem) { maiorContagem = count; melhor = sep; }
  });
  return melhor;
}

function parsearLinhaCsv(linha, delimitador = ',') {
  const resultado = [];
  let campo = '';
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      dentroAspas = !dentroAspas;
    } else if (c === delimitador && !dentroAspas) {
      resultado.push(campo.trim());
      campo = '';
    } else {
      campo += c;
    }
  }
  resultado.push(campo.trim());
  return resultado;
}

// Nomes dos meses em português (índice = número do mês 0-11)
const MESES_PT = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

// Remove acentos para comparação robusta (resolve encoding Windows-1252 vs UTF-8)
function semAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Verifica se o CSV é uma planilha anual (colunas = meses)
function detectarFormatoPlanilha(cabecalhos) {
  const lower = cabecalhos.map(semAcentos);
  return MESES_PT.some(m => lower.includes(m));
}

// Converte "R$ 1.234,56" → 1234.56
function exportarCSV(gastos, categorias, nomeArquivo) {
  if (!gastos.length) {
    mostrarToast('Nenhum gasto para exportar.', 'erro');
    return;
  }

  const cabecalho = ['Data', 'Descrição', 'Categoria', 'Valor', 'Status', 'Recorrente'];

  const linhas = gastos
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(g => {
      const cat = categorias.find(c => c.id === g.categoriaId);
      const [ano, mes, dia] = g.data.split('-');
      return [
        `${dia}/${mes}/${ano}`,
        `"${(g.descricao || '').replace(/"/g, '""')}"`,
        `"${cat ? cat.nome.replace(/"/g, '""') : 'Sem categoria'}"`,
        g.valor.toFixed(2).replace('.', ','),
        g.status === 'pendente' ? 'Pendente' : 'Pago',
        g.recorrente ? 'Sim' : 'Não',
      ].join(';');
    });

  // BOM UTF-8 para o Excel reconhecer acentos corretamente
  const conteudo = '\uFEFF' + cabecalho.join(';') + '\n' + linhas.join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  mostrarToast(`${gastos.length} gasto(s) exportado(s).`, 'sucesso');
}

function exportarCSVReceitas(receitas, nomeArquivo) {
  if (!receitas.length) {
    mostrarToast('Nenhuma receita para exportar.', 'erro');
    return;
  }
  const cabecalho = ['Data', 'Descrição', 'Valor', 'Recorrente'];
  const linhas = receitas
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .map(r => {
      const [ano, mes, dia] = r.data.split('-');
      return [
        `${dia}/${mes}/${ano}`,
        `"${(r.descricao || '').replace(/"/g, '""')}"`,
        r.valor.toFixed(2).replace('.', ','),
        r.recorrente ? 'Sim' : 'Não',
      ].join(';');
    });
  const conteudo = '\uFEFF' + cabecalho.join(';') + '\n' + linhas.join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  mostrarToast(`${receitas.length} receita(s) exportada(s).`, 'sucesso');
}

// ===== Receitas =====

function renderizarTabelaReceitas(receitas) {
  if (!receitas.length) {
    return `
      <div class="estado-vazio">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="36" cy="36" r="22" stroke="currentColor" stroke-width="3"/>
          <path d="M36 26v10l6 4" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M28 20l-6-4M44 20l6-4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <p class="titulo-vazio">Nenhuma receita neste mês</p>
        <p class="sub-vazio">Adicione uma receita manualmente ou importe um arquivo CSV</p>
      </div>`;
  }
  const linhas = receitas
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .map(r => `
      <tr>
        <td><input type="checkbox" class="chk-receita" data-id="${r.id}" /></td>
        <td>${formatarData(r.data)}</td>
        <td>${r.recorrente ? `<span title="Receita recorrente">${ICONES.recorrente}</span>` : ''}${r.descricao}</td>
        <td style="color:var(--cor-sucesso);font-weight:600">${formatarMoeda(r.valor)}</td>
        <td>
          <div style="display:flex;gap:8px">
            <button class="btn-acao btn-editar-receita" data-id="${r.id}">Editar</button>
            <button class="btn-acao excluir btn-excluir-receita" data-id="${r.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `).join('');

  return `
    <table class="tabela-gastos">
      <thead>
        <tr>
          <th><input type="checkbox" id="chk-todos-receitas" title="Selecionar todos" /></th>
          <th>Data</th>
          <th>Descrição</th>
          <th>Valor</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  `;
}

function atualizarBotaoExclusaoReceitas() {
  const secao = document.getElementById('secao-dashboard');
  const marcados = secao.querySelectorAll('.chk-receita:checked');
  const btn = secao.querySelector('#btn-excluir-selecionados-receitas');
  const contador = secao.querySelector('#contador-selecionados-receitas');
  if (!btn) return;
  btn.style.display = marcados.length > 0 ? 'inline-block' : 'none';
  if (contador) contador.textContent = marcados.length;
}

function excluirSelecionadasReceitas() {
  const secao = document.getElementById('secao-dashboard');
  const ids = [...secao.querySelectorAll('.chk-receita:checked')].map(c => c.dataset.id);
  if (!ids.length) return;
  confirmarModal('Excluir receitas', `Deseja excluir <strong>${ids.length} receita(s)</strong> selecionada(s)?`, () => {
    const todas = carregarReceitas();
    const backup = [...todas];
    salvarReceitas(todas.filter(r => !ids.includes(r.id)));
    renderizarDashboard();
    mostrarToast(`${ids.length} receita(s) excluída(s).`, 'sucesso', () => {
      salvarReceitas(backup);
      renderizarDashboard();
      mostrarToast('Exclusão desfeita.', 'sucesso');
    });
  });
}

function registrarEventosReceitas(container) {
  if (!container) return;

  container.querySelectorAll('.chk-receita').forEach(chk =>
    chk.addEventListener('change', atualizarBotaoExclusaoReceitas));
  const chkTodos = container.querySelector('#chk-todos-receitas');
  if (chkTodos) {
    chkTodos.addEventListener('change', function () {
      container.querySelectorAll('.chk-receita').forEach(c => { c.checked = this.checked; });
      atualizarBotaoExclusaoReceitas();
    });
  }

  container.querySelectorAll('.btn-editar-receita').forEach(btn => {
    btn.addEventListener('click', () => abrirModalReceita(btn.dataset.id));
  });

  container.querySelectorAll('.btn-excluir-receita').forEach(btn => {
    btn.addEventListener('click', () => {
      const todas = carregarReceitas();
      const receita = todas.find(r => r.id === btn.dataset.id);
      if (!receita) return;

      confirmarModal('Excluir receita', `Deseja excluir <strong>${receita.descricao}</strong>?`, () => {
        const backup = [...todas];
        if (receita.recorrente) registrarExclusaoRecorrenteReceita(receita);
        salvarReceitas(todas.filter(r => r.id !== btn.dataset.id));
        renderizarDashboard();
        mostrarToast('Receita excluída.', 'sucesso', () => {
          salvarReceitas(backup);
          renderizarDashboard();
          mostrarToast('Exclusão desfeita.', 'sucesso');
        });
      });
    });
  });
}

function abrirModalReceita(id = null) {
  const receitas = carregarReceitas();
  const receita = id ? receitas.find(r => r.id === id) : null;
  const diaHoje = new Date().getDate();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const dia = Math.min(diaHoje, diasNoMes);
  const hoje = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  const overlay = document.getElementById('overlay-modal');
  const modal = document.getElementById('modal');

  modal.innerHTML = `
    <h2>${receita ? 'Editar Receita' : 'Adicionar Receita'}</h2>
    <form id="form-receita" style="margin-top:16px">
      <div class="form-linha">
        <div class="form-grupo">
          <label for="rec-valor">Valor</label>
          <div class="input-prefixo">
            <span>R$</span>
            <input type="number" id="rec-valor" step="0.01" min="0.01" placeholder="0,00"
              value="${receita ? receita.valor : ''}" required />
          </div>
        </div>
        <div class="form-grupo">
          <label for="rec-data">Data</label>
          <input type="date" id="rec-data" value="${receita ? receita.data : hoje}" required />
        </div>
      </div>
      <div class="form-grupo">
        <label for="rec-descricao">Descrição</label>
        <input type="text" id="rec-descricao" placeholder="Ex: Salário, Freelance..."
          value="${receita ? receita.descricao : ''}" required maxlength="120" />
      </div>
      <div class="form-grupo" style="flex-direction:row;align-items:center;gap:10px">
        <input type="checkbox" id="rec-recorrente" style="width:16px;height:16px;cursor:pointer;accent-color:var(--cor-ativo)" ${receita && receita.recorrente ? 'checked' : ''} />
        <label for="rec-recorrente" style="cursor:pointer;font-weight:500;margin:0;font-size:13px">
          Recorrente <span style="font-size:11px;color:var(--cor-texto-suave);font-weight:400">(repete todo mês)</span>
        </label>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" id="btn-cancelar-receita" class="btn btn-secundario">Cancelar</button>
        <button type="submit" class="btn btn-sucesso">${receita ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  `;
  overlay.classList.add('visivel');

  document.getElementById('btn-cancelar-receita').addEventListener('click', () => {
    overlay.classList.remove('visivel');
  });

  document.getElementById('form-receita').addEventListener('submit', e => {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('rec-valor').value);
    const data = document.getElementById('rec-data').value;
    const descricao = document.getElementById('rec-descricao').value.trim();
    const recorrente = document.getElementById('rec-recorrente').checked;

    if (!valor || valor <= 0) { mostrarToast('Valor inválido.', 'erro'); return; }
    if (!data) { mostrarToast('Data inválida.', 'erro'); return; }
    if (!descricao) { mostrarToast('Descrição obrigatória.', 'erro'); return; }

    const todas = carregarReceitas();
    if (receita) {
      const idx = todas.findIndex(r => r.id === id);
      todas[idx] = { ...todas[idx], valor, data, descricao, recorrente };
    } else {
      todas.push({ id: gerarId(), valor, data, descricao, recorrente });
    }
    salvarReceitas(todas);
    overlay.classList.remove('visivel');
    mostrarToast(receita ? 'Receita atualizada.' : 'Receita adicionada.', 'sucesso');
    renderizarDashboard();
  });
}

// ===== Backup / Restaurar =====

function fazerBackup() {
  const gastos = carregarGastos();
  const categorias = carregarCategorias();
  const receitas = carregarReceitas();

  const backup = {
    versao: 2,
    dataBackup: new Date().toISOString(),
    gastos,
    categorias,
    receitas,
  };

  const conteudo = JSON.stringify(backup, null, 2);
  const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const hoje = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `backup-gastos-${hoje}.json`;
  link.click();
  URL.revokeObjectURL(url);
  mostrarToast(`Backup realizado: ${gastos.length} gastos e ${categorias.length} categorias.`, 'sucesso');
}

function restaurarBackup(arquivo) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let backup;
    try {
      backup = JSON.parse(e.target.result);
    } catch {
      mostrarToast('Arquivo inválido. Selecione um backup .json gerado por este app.', 'erro');
      return;
    }

    if (!backup.gastos || !backup.categorias || !Array.isArray(backup.gastos) || !Array.isArray(backup.categorias)) {
      mostrarToast('Arquivo de backup inválido ou corrompido.', 'erro');
      return;
    }

    const dataBackup = backup.dataBackup
      ? new Date(backup.dataBackup).toLocaleString('pt-BR')
      : 'data desconhecida';

    const overlay = document.getElementById('overlay-modal');
    const modal = document.getElementById('modal');
    modal.innerHTML = `
      <h2>Restaurar Backup</h2>
      <p style="margin:12px 0;line-height:1.6">
        Backup de <strong>${dataBackup}</strong><br>
        <strong>${backup.gastos.length}</strong> gastos · <strong>${backup.categorias.length}</strong> categorias
      </p>
      <p style="color:var(--cor-perigo);font-size:0.9rem;margin-bottom:16px">
        ⚠️ Os dados atuais serão substituídos. Esta ação não pode ser desfeita.
      </p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button id="btn-cancelar-restaurar" class="btn btn-secundario">Cancelar</button>
        <button id="btn-confirmar-restaurar" class="btn btn-perigo">Restaurar</button>
      </div>
    `;
    overlay.classList.add('visivel');

    document.getElementById('btn-cancelar-restaurar').addEventListener('click', () => {
      overlay.classList.remove('visivel');
    });

    document.getElementById('btn-confirmar-restaurar').addEventListener('click', () => {
      salvarCategorias(backup.categorias);
      salvarGastos(backup.gastos);
      if (Array.isArray(backup.receitas)) salvarReceitas(backup.receitas);
      overlay.classList.remove('visivel');
      mostrarToast(`Backup restaurado: ${backup.gastos.length} gastos carregados.`, 'sucesso');
      irParaSecao('dashboard');
    });
  };
  reader.readAsText(arquivo, 'UTF-8');
}

function apagarTodosOsGastos() {
  const overlay = document.getElementById('overlay-modal');
  const modal = document.getElementById('modal');
  const totalGastos = carregarGastos().length;
  const totalReceitas = carregarReceitas().length;

  modal.innerHTML = `
    <h2 style="color:var(--cor-perigo)">⚠️ Apagar todos os dados</h2>
    <p style="margin:14px 0;line-height:1.6">
      Esta ação vai apagar permanentemente <strong>${totalGastos} gasto(s)</strong> e <strong>${totalReceitas} receita(s)</strong>.<br>
      As categorias <strong>não</strong> serão apagadas.
    </p>
    <p style="margin-bottom:6px;font-size:0.9rem;color:var(--cor-texto-suave)">
      Digite <strong style="color:var(--cor-texto)">EXCLUIR</strong> para confirmar:
    </p>
    <input id="input-confirmar-exclusao" type="text" placeholder="EXCLUIR"
      style="width:100%;padding:9px 12px;background:var(--cor-fundo);border:1px solid var(--cor-borda);
             border-radius:8px;color:var(--cor-texto);font-size:1rem;margin-bottom:16px" />
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button id="btn-cancelar-apagar" class="btn btn-secundario">Cancelar</button>
      <button id="btn-confirmar-apagar" class="btn btn-perigo" disabled>Apagar tudo</button>
    </div>
  `;
  overlay.classList.add('visivel');

  const inputConfirmar = document.getElementById('input-confirmar-exclusao');
  const btnConfirmar = document.getElementById('btn-confirmar-apagar');

  inputConfirmar.addEventListener('input', () => {
    btnConfirmar.disabled = inputConfirmar.value.trim() !== 'EXCLUIR';
  });

  document.getElementById('btn-cancelar-apagar').addEventListener('click', () => {
    overlay.classList.remove('visivel');
  });

  btnConfirmar.addEventListener('click', () => {
    salvarGastos([]);
    salvarReceitas([]);
    overlay.classList.remove('visivel');
    mostrarToast('Todos os dados foram apagados.', 'sucesso');
    irParaSecao('dashboard');
  });
}

function parsearMoedaBR(str) {
  if (!str) return 0;
  const limpo = str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(limpo);
  return isNaN(val) ? 0 : val;
}

function processarTextoCSV(texto) {
  const linhas = texto.trim().split(/\r?\n/);
  if (linhas.length < 2) { mostrarToast('CSV vazio ou inválido.', 'erro'); return; }

  const delimitador = detectarDelimitador(linhas[0]);
  csvCabecalhos = parsearLinhaCsv(linhas[0], delimitador);
  csvLinhas = linhas.slice(1).filter(l => l.trim()).map(l => parsearLinhaCsv(l, delimitador));

  if (csvCabecalhos.length === 0) { mostrarToast('Não foi possível ler o cabeçalho do CSV.', 'erro'); return; }

  if (detectarFormatoPlanilha(csvCabecalhos)) {
    if (tipoImportacaoCSV === 'receitas') mostrarImportacaoPlanilhaReceitas();
    else mostrarImportacaoPlanilha();
  } else {
    mostrarMapeamento();
  }
}

function processarArquivoCSV(arquivo) {
  const reader = new FileReader();
  reader.onload = e => {
    const texto = e.target.result;
    // Se UTF-8 produziu caracteres de substituição, tenta Windows-1252 (padrão Excel BR)
    if (texto.includes('\uFFFD')) {
      const reader2 = new FileReader();
      reader2.onload = e2 => processarTextoCSV(e2.target.result);
      reader2.readAsText(arquivo, 'windows-1252');
    } else {
      processarTextoCSV(texto);
    }
  };
  reader.readAsText(arquivo, 'UTF-8');
}

function mostrarMapeamento() {
  atualizarStepperCSV(2);
  const secaoMap = document.getElementById('secao-mapeamento');
  secaoMap.classList.add('visivel');

  const opcoes = csvCabecalhos.map((h, i) => `<option value="${i}">${h}</option>`).join('');
  ['map-data', 'map-valor', 'map-descricao'].forEach(id => {
    document.getElementById(id).innerHTML = opcoes;
  });

  // Heurística para pré-selecionar colunas
  csvCabecalhos.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (/data|date|dt/.test(hl)) document.getElementById('map-data').value = i;
    if (/valor|value|amount|quantia|debito|crédito/.test(hl)) document.getElementById('map-valor').value = i;
    if (/descri|hist|memo|lançamento/.test(hl)) document.getElementById('map-descricao').value = i;
  });

  document.getElementById('btn-avancar-mapeamento').addEventListener('click', mostrarRevisao);
}

function parsearData(str, formato) {
  str = str.trim();
  let dia, mes, ano;
  if (formato === 'dd/mm/yyyy') {
    [dia, mes, ano] = str.split(/[\/\-]/);
  } else if (formato === 'mm/dd/yyyy') {
    [mes, dia, ano] = str.split(/[\/\-]/);
  } else {
    [ano, mes, dia] = str.split(/[\/\-]/);
  }
  if (!dia || !mes || !ano) return null;
  return `${String(ano).padStart(4,'0')}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}

function mostrarRevisao() {
  const colData = parseInt(document.getElementById('map-data').value);
  const colValor = parseInt(document.getElementById('map-valor').value);
  const colDescricao = parseInt(document.getElementById('map-descricao').value);
  const formatoData = document.getElementById('map-formato-data').value;

  const linhasValidas = csvLinhas.map((cols, idx) => {
    const dataStr = parsearData(cols[colData] || '', formatoData);
    const valorRaw = (cols[colValor] || '').replace(/[^\d,.\-]/g, '').replace(',', '.');
    const valor = parseFloat(valorRaw);
    const descricao = (cols[colDescricao] || '').trim();

    if (!dataStr || isNaN(valor) || valor <= 0 || !descricao) return null;

    return { idx, data: dataStr, descricao, valor };
  }).filter(Boolean);

  if (!linhasValidas.length) {
    mostrarToast('Nenhuma linha válida encontrada. Verifique o mapeamento.', 'erro');
    return;
  }

  const esReceita = tipoImportacaoCSV === 'receitas';

  atualizarStepperCSV(3);
  document.getElementById('secao-revisao').classList.add('visivel');

  // Para receitas: esconde seção de categoria em lote e coluna Categoria
  if (esReceita) {
    const acoesRevisao = document.querySelector('.acoes-revisao');
    if (acoesRevisao) acoesRevisao.style.display = 'none';
    const thCategoria = document.querySelector('#tabela-revisao thead tr th:last-child');
    if (thCategoria) thCategoria.style.display = 'none';
  }

  const corpo = document.getElementById('corpo-revisao');
  const categoriasCSV = carregarCategorias();
  corpo.innerHTML = linhasValidas.map(item => {
    const catSugerida = esReceita ? null : buscarCategoriaSugerida(item.descricao);
    const idInput = `inp-cat-csv-${item.idx}`;
    return `
    <tr data-idx="${item.idx}">
      <td><input type="checkbox" class="chk-item" data-valor="${item.valor}" checked /></td>
      <td>${formatarData(item.data)}</td>
      <td>${item.descricao}${catSugerida ? ' <span style="font-size:11px;color:var(--cor-ativo)" title="Categoria sugerida pelo histórico">✦</span>' : ''}</td>
      <td>${formatarMoeda(item.valor)}</td>
      ${esReceita ? '' : `<td style="min-width:160px">${htmlSelectCategoria(idInput, categoriasCSV, catSugerida, 'Selecione...')}</td>`}
    </tr>`;
  }).join('');

  if (!esReceita) {
    linhasValidas.forEach(item => {
      inicializarSelectCategoria(`inp-cat-csv-${item.idx}`);
    });
  }

  if (!esReceita) {
    document.getElementById('btn-aplicar-lote').addEventListener('click', () => {
      const catId = document.getElementById('inp-cat-lote').value;
      if (!catId) { mostrarToast('Selecione uma categoria.', 'erro'); return; }
      let aplicados = 0;
      document.querySelectorAll('#corpo-revisao tr').forEach(tr => {
        if (tr.querySelector('.chk-item')?.checked) {
          const idx = tr.dataset.idx;
          selecionarCategoriaDropdown(`inp-cat-csv-${idx}`, catId);
          aplicados++;
        }
      });
      if (!aplicados) mostrarToast('Nenhuma linha selecionada.', 'erro');
      else mostrarToast(`Categoria aplicada a ${aplicados} item(ns).`, 'sucesso');
    });

    document.getElementById('btn-nova-cat-csv').addEventListener('click', () => {
      abrirModalCategoriaCSV();
    });
  }

  // Total selecionado
  const pTotal = document.createElement('p');
  pTotal.id = 'total-selecao';
  pTotal.style.cssText = 'font-size:13px;color:var(--cor-texto-suave);margin-top:8px';
  document.querySelector('.acoes-form').before(pTotal);
  atualizarTotalSelecao('total-selecao', '.chk-item');

  document.getElementById('chk-todos').addEventListener('change', function () {
    document.querySelectorAll('.chk-item').forEach(chk => { chk.checked = this.checked; });
    atualizarTotalSelecao('total-selecao', '.chk-item');
  });
  document.getElementById('corpo-revisao').addEventListener('change', e => {
    if (e.target.classList.contains('chk-item')) atualizarTotalSelecao('total-selecao', '.chk-item');
  });

  document.getElementById('btn-confirmar-importacao').addEventListener('click', () => {
    if (esReceita) confirmarImportacaoReceitas(linhasValidas);
    else confirmarImportacao(linhasValidas);
  });

  document.getElementById('btn-cancelar-importacao').addEventListener('click', () => {
    renderizarImportarCSV();
  });
}

function confirmarImportacao(linhasValidas) {
  const linhasSelecionadas = [];

  linhasValidas.forEach(item => {
    const tr = document.querySelector(`[data-idx="${item.idx}"]`);
    if (!tr) return;
    const marcado = tr.querySelector('.chk-item').checked;
    if (!marcado) return;
    const categoriaId = document.getElementById(`inp-cat-csv-${item.idx}`)?.value;
    if (!categoriaId) return;
    linhasSelecionadas.push({ ...item, categoriaId });
  });

  if (!linhasSelecionadas.length) {
    mostrarToast('Nenhum item selecionado ou sem categoria.', 'erro');
    return;
  }

  const gastos = carregarGastos();
  linhasSelecionadas.forEach(item => {
    gastos.push({
      id: gerarId(),
      data: item.data,
      descricao: item.descricao,
      valor: item.valor,
      categoriaId: item.categoriaId,
    });
  });
  salvarGastos(gastos);

  mostrarToast(`${linhasSelecionadas.length} gastos importados!`, 'sucesso');
  irParaSecao('dashboard');
}

function confirmarImportacaoReceitas(linhasValidas) {
  const linhasSelecionadas = [];
  linhasValidas.forEach(item => {
    const tr = document.querySelector(`[data-idx="${item.idx}"]`);
    if (!tr || !tr.querySelector('.chk-item').checked) return;
    linhasSelecionadas.push(item);
  });

  if (!linhasSelecionadas.length) {
    mostrarToast('Nenhum item selecionado.', 'erro');
    return;
  }

  const receitas = carregarReceitas();
  linhasSelecionadas.forEach(item => {
    receitas.push({ id: gerarId(), data: item.data, descricao: item.descricao, valor: item.valor, recorrente: false });
  });
  salvarReceitas(receitas);
  mostrarToast(`${linhasSelecionadas.length} receitas importadas!`, 'sucesso');
  irParaSecao('dashboard');
}

// ===== Importar — Planilha Anual de Receitas =====

function mostrarImportacaoPlanilhaReceitas() {
  const lower = csvCabecalhos.map(semAcentos);
  const colDia = lower.findIndex(h => h.startsWith('dia'));
  const mesesIndices = MESES_PT.map((m, idx) => ({ mes: idx, colIdx: lower.findIndex(h => h === m) }))
                               .filter(m => m.colIdx !== -1);

  const entradas = [];
  csvLinhas.forEach(cols => {
    const diaStr = (cols[colDia] || '').trim();
    const dia = parseInt(diaStr);
    if (isNaN(dia) || dia < 1 || dia > 31) return;
    mesesIndices.forEach(({ mes, colIdx }) => {
      const valor = parsearMoedaBR(cols[colIdx]);
      if (valor <= 0) return;
      entradas.push({ dia, mes, valor });
    });
  });

  if (!entradas.length) {
    mostrarToast('Nenhum valor encontrado na planilha.', 'erro');
    return;
  }

  const anoSugerido = new Date().getFullYear();
  const nomesExibicao = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  atualizarStepperCSV(3);
  const secaoMap = document.getElementById('secao-mapeamento');
  secaoMap.classList.add('visivel');
  secaoMap.innerHTML = `
    <div class="titulo-etapa">
      <span class="badge-etapa">📅</span> Planilha anual de receitas — ${entradas.length} lançamentos com valor
    </div>
    <div style="display:flex;align-items:center;gap:16px;margin:16px 0;flex-wrap:wrap">
      <div class="form-grupo" style="margin:0">
        <label style="font-size:13px;font-weight:600">Ano da planilha</label>
        <input type="number" id="inp-ano-planilha-rec" value="${anoSugerido}"
          min="2000" max="2100" style="width:110px;margin-top:4px;padding:8px 12px;border:1px solid var(--cor-borda);border-radius:8px;font-size:14px" />
      </div>
      <div class="form-grupo" style="margin:0">
        <label style="font-size:13px;font-weight:600">Preencher descrição dos selecionados</label>
        <div style="display:flex;gap:8px;margin-top:4px">
          <input type="text" id="inp-descricao-lote-rec" placeholder="Ex: Salário, Freelance..."
            style="padding:8px 12px;border:1px solid var(--cor-borda);border-radius:8px;font-size:14px;width:220px" />
          <button class="btn btn-secundario" id="btn-aplicar-descricao-lote" style="padding:6px 14px">Aplicar</button>
        </div>
      </div>
    </div>
    <div style="overflow-x:auto">
      <table class="tabela-gastos">
        <thead>
          <tr>
            <th><input type="checkbox" id="chk-todos-plan-rec" checked title="Selecionar todos" /></th>
            <th>Mês / Dia</th>
            <th>Valor</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          ${entradas.map((e, i) => `
            <tr data-idx="${i}">
              <td><input type="checkbox" class="chk-plan-rec" data-idx="${i}" data-valor="${e.valor}" checked /></td>
              <td>${nomesExibicao[e.mes]} / dia ${e.dia}</td>
              <td><strong>${formatarMoeda(e.valor)}</strong></td>
              <td><input type="text" class="inp-desc-rec" data-idx="${i}" value="${nomesExibicao[e.mes]}"
                style="padding:6px 10px;border:1px solid var(--cor-borda);border-radius:6px;font-size:13px;width:160px;background:var(--cor-fundo);color:var(--cor-texto)" /></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="acoes-form" style="margin-top:20px">
      <button class="btn btn-sucesso" id="btn-confirmar-planilha-rec">Importar selecionados</button>
      <button class="btn btn-secundario" id="btn-cancelar-planilha-rec">Cancelar</button>
    </div>
  `;

  // Total selecionado
  const pTotalRec = document.createElement('p');
  pTotalRec.id = 'total-selecao-plan-rec';
  pTotalRec.style.cssText = 'font-size:13px;color:var(--cor-texto-suave);margin-top:8px';
  document.getElementById('btn-confirmar-planilha-rec').closest('.acoes-form').before(pTotalRec);
  atualizarTotalSelecao('total-selecao-plan-rec', '.chk-plan-rec');

  document.getElementById('chk-todos-plan-rec').addEventListener('change', function () {
    document.querySelectorAll('.chk-plan-rec').forEach(c => { c.checked = this.checked; });
    atualizarTotalSelecao('total-selecao-plan-rec', '.chk-plan-rec');
  });
  secaoMap.querySelector('tbody').addEventListener('change', e => {
    if (e.target.classList.contains('chk-plan-rec')) atualizarTotalSelecao('total-selecao-plan-rec', '.chk-plan-rec');
  });

  document.getElementById('btn-aplicar-descricao-lote').addEventListener('click', () => {
    const desc = document.getElementById('inp-descricao-lote-rec').value.trim();
    if (!desc) return;
    document.querySelectorAll('.chk-plan-rec').forEach(chk => {
      if (chk.checked) {
        const inp = secaoMap.querySelector(`.inp-desc-rec[data-idx="${chk.dataset.idx}"]`);
        if (inp) inp.value = desc;
      }
    });
  });

  document.getElementById('btn-confirmar-planilha-rec').addEventListener('click', () => {
    confirmarImportacaoPlanilhaReceitas(entradas);
  });

  document.getElementById('btn-cancelar-planilha-rec').addEventListener('click', () => {
    renderizarImportarCSV();
  });
}

function confirmarImportacaoPlanilhaReceitas(entradas) {
  const ano = parseInt(document.getElementById('inp-ano-planilha-rec').value) || new Date().getFullYear();
  const nomesExibicao = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const novasReceitas = [];

  document.querySelectorAll('.chk-plan-rec').forEach(chk => {
    if (!chk.checked) return;
    const idx = parseInt(chk.dataset.idx);
    const e = entradas[idx];
    const descricao = document.querySelector(`.inp-desc-rec[data-idx="${idx}"]`)?.value.trim() || nomesExibicao[e.mes];
    const diasNoMes = new Date(ano, e.mes + 1, 0).getDate();
    const dia = Math.min(e.dia, diasNoMes);
    const dataStr = `${ano}-${String(e.mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    novasReceitas.push({ id: gerarId(), data: dataStr, descricao, valor: e.valor, recorrente: false });
  });

  if (!novasReceitas.length) {
    mostrarToast('Nenhum item selecionado.', 'erro');
    return;
  }

  const receitas = carregarReceitas();
  novasReceitas.forEach(r => receitas.push(r));
  salvarReceitas(receitas);
  mostrarToast(`${novasReceitas.length} receitas importadas com sucesso!`, 'sucesso');
  irParaSecao('dashboard');
}

// ===== Importar — Formato Planilha Anual =====

function mostrarImportacaoPlanilha() {
  const lower = csvCabecalhos.map(semAcentos);
  const colDia   = lower.findIndex(h => h.startsWith('dia'));
  const colTipo  = lower.findIndex(h => h === 'tipo' || h.startsWith('tipo'));
  const mesesIndices = MESES_PT.map((m, idx) => ({ mes: idx, colIdx: lower.findIndex(h => h === m) }))
                               .filter(m => m.colIdx !== -1);

  // Montar entradas: uma por célula não-zero
  const entradas = [];
  csvLinhas.forEach(cols => {
    const tipo   = (cols[colTipo] || '').trim();
    const diaStr = (cols[colDia]  || '').trim();
    if (!tipo || /^total$/i.test(tipo) || !diaStr) return;
    const dia = parseInt(diaStr);
    if (isNaN(dia) || dia < 1 || dia > 31) return;

    mesesIndices.forEach(({ mes, colIdx }) => {
      const valor = parsearMoedaBR(cols[colIdx]);
      if (valor <= 0) return;
      entradas.push({ tipo, dia, mes, valor });
    });
  });

  if (!entradas.length) {
    mostrarToast('Nenhum valor encontrado na planilha.', 'erro');
    return;
  }

  const categoriasCSV = carregarCategorias();
  const anoSugerido = new Date().getFullYear();
  const nomesExibicao = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Substitui o conteúdo da seção de mapeamento para exibir o fluxo de planilha
  atualizarStepperCSV(3);
  const secaoMap = document.getElementById('secao-mapeamento');
  secaoMap.classList.add('visivel');
  secaoMap.innerHTML = `
    <div class="titulo-etapa">
      <span class="badge-etapa">📅</span> Planilha anual detectada — ${entradas.length} lançamentos com valor
    </div>
    <div style="display:flex;align-items:center;gap:16px;margin:16px 0;flex-wrap:wrap">
      <div class="form-grupo" style="margin:0">
        <label style="font-size:13px;font-weight:600">Ano da planilha</label>
        <input type="number" id="inp-ano-planilha" value="${anoSugerido}"
          min="2000" max="2100" style="width:110px;margin-top:4px;padding:8px 12px;border:1px solid var(--cor-borda);border-radius:8px;font-size:14px" />
      </div>
      <div class="select-lote" style="margin-top:18px">
        <span>Categoria em lote:</span>
        <div id="slot-lote-cat-planilha" style="min-width:180px"></div>
        <button class="btn btn-secundario" id="btn-lote-planilha" style="padding:6px 14px">Aplicar aos selecionados</button>
        <button class="btn btn-secundario" id="btn-nova-cat-planilha" style="padding:6px 14px">+ Nova categoria</button>
      </div>
    </div>

    <div style="overflow-x:auto">
      <table class="tabela-gastos">
        <thead>
          <tr>
            <th><input type="checkbox" id="chk-todos-planilha" checked title="Selecionar todos" /></th>
            <th>Descrição</th>
            <th>Mês / Dia</th>
            <th>Valor</th>
            <th>Categoria</th>
          </tr>
        </thead>
        <tbody>
          ${entradas.map((e, i) => `
              <tr data-idx="${i}">
                <td><input type="checkbox" class="chk-plan" data-idx="${i}" data-valor="${e.valor}" checked /></td>
                <td>${e.tipo}</td>
                <td>${nomesExibicao[e.mes]} / dia ${e.dia}</td>
                <td><strong>${formatarMoeda(e.valor)}</strong></td>
                <td style="min-width:160px">${htmlSelectCategoria(`inp-cat-plan-${i}`, categoriasCSV, null, 'Selecione...')}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>

    <div class="acoes-form" style="margin-top:20px">
      <button class="btn btn-sucesso" id="btn-confirmar-planilha">Importar selecionados</button>
      <button class="btn btn-secundario" id="btn-cancelar-planilha">Cancelar</button>
    </div>
  `;

  // Injeta dropdown customizado de lote e inicializa dropdowns de cada linha
  const slotLotePlan = document.getElementById('slot-lote-cat-planilha');
  slotLotePlan.innerHTML = htmlSelectCategoria('inp-cat-lote-planilha', categoriasCSV, null, '— selecione —');
  inicializarSelectCategoria('inp-cat-lote-planilha');
  entradas.forEach((e, i) => inicializarSelectCategoria(`inp-cat-plan-${i}`));

  // Total selecionado
  const pTotalPlan = document.createElement('p');
  pTotalPlan.id = 'total-selecao-plan';
  pTotalPlan.style.cssText = 'font-size:13px;color:var(--cor-texto-suave);margin-top:8px';
  secaoMap.querySelector('#btn-confirmar-planilha').closest('.acoes-form').before(pTotalPlan);
  atualizarTotalSelecao('total-selecao-plan', '.chk-plan');

  secaoMap.querySelector('#chk-todos-planilha').addEventListener('change', function () {
    secaoMap.querySelectorAll('.chk-plan').forEach(c => { c.checked = this.checked; });
    atualizarTotalSelecao('total-selecao-plan', '.chk-plan');
  });
  secaoMap.querySelector('tbody').addEventListener('change', e => {
    if (e.target.classList.contains('chk-plan')) atualizarTotalSelecao('total-selecao-plan', '.chk-plan');
  });

  document.getElementById('btn-lote-planilha').addEventListener('click', () => {
    const catId = document.getElementById('inp-cat-lote-planilha').value;
    if (!catId) { mostrarToast('Selecione uma categoria.', 'erro'); return; }
    let aplicados = 0;
    document.querySelectorAll('.chk-plan').forEach(chk => {
      if (chk.checked) {
        selecionarCategoriaDropdown(`inp-cat-plan-${chk.dataset.idx}`, catId);
        aplicados++;
      }
    });
    if (!aplicados) mostrarToast('Nenhuma linha selecionada.', 'erro');
    else mostrarToast(`Categoria aplicada a ${aplicados} item(ns).`, 'sucesso');
  });

  document.getElementById('btn-nova-cat-planilha').addEventListener('click', () => {
    abrirModalCategoriaCSV();
  });

  document.getElementById('btn-confirmar-planilha').addEventListener('click', () => {
    confirmarImportacaoPlanilha(entradas);
  });

  document.getElementById('btn-cancelar-planilha').addEventListener('click', () => {
    renderizarImportarCSV();
  });
}

function confirmarImportacaoPlanilha(entradas) {
  const ano = parseInt(document.getElementById('inp-ano-planilha').value) || new Date().getFullYear();
  const novosGastos = [];

  document.querySelectorAll('.chk-plan').forEach(chk => {
    if (!chk.checked) return;
    const idx = parseInt(chk.dataset.idx);
    const catId = document.getElementById(`inp-cat-plan-${idx}`)?.value;
    if (!catId) return;

    const e = entradas[idx];
    // Garante que o dia não ultrapassa o limite do mês (ex: 30 de fevereiro → 28/29)
    const diasNoMes = new Date(ano, e.mes + 1, 0).getDate();
    const dia = Math.min(e.dia, diasNoMes);
    const dataStr = `${ano}-${String(e.mes + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;

    novosGastos.push({ id: gerarId(), data: dataStr, descricao: e.tipo, valor: e.valor, categoriaId: catId });
  });

  if (!novosGastos.length) {
    mostrarToast('Nenhum item selecionado ou sem categoria atribuída.', 'erro');
    return;
  }

  const gastos = carregarGastos();
  novosGastos.forEach(g => gastos.push(g));
  salvarGastos(gastos);
  mostrarToast(`${novosGastos.length} gastos importados com sucesso!`, 'sucesso');
  irParaSecao('dashboard');
}

// ===== Categorias =====

function renderizarCategorias() {
  const secao = document.getElementById('secao-categorias');
  const categorias = carregarCategorias();

  secao.innerHTML = `
    <h1 class="titulo-secao">Categorias</h1>
    <div id="lista-categorias">
      ${categorias.map(c => `
        <div class="item-categoria" data-id="${c.id}">
          <span class="amostra-cor" style="background:${c.cor}"></span>
          <span class="nome-categoria">${c.nome}</span>
          <div class="acoes-categoria">
            <button class="btn-acao" data-editar-cat="${c.id}">Editar</button>
            <button class="btn-acao excluir" data-excluir-cat="${c.id}">Excluir</button>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primario" id="btn-nova-categoria">+ Nova categoria</button>
  `;

  document.getElementById('btn-nova-categoria').addEventListener('click', () => abrirModalCategoria());

  secao.querySelectorAll('[data-editar-cat]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalCategoria(btn.dataset.editarCat));
  });

  secao.querySelectorAll('[data-excluir-cat]').forEach(btn => {
    btn.addEventListener('click', () => excluirCategoria(btn.dataset.excluirCat));
  });
}

function abrirModalCategoria(id = null) {
  const categorias = carregarCategorias();
  const cat = id ? categorias.find(c => c.id === id) : null;

  const modal = document.getElementById('modal');
  const overlay = document.getElementById('overlay-modal');

  modal.innerHTML = `
    <button id="btn-fechar-modal">✕</button>
    <h2>${cat ? 'Editar categoria' : 'Nova categoria'}</h2>
    <form id="form-categoria">
      <div class="form-grupo">
        <label for="inp-nome-cat">Nome</label>
        <input type="text" id="inp-nome-cat" value="${cat ? cat.nome : ''}" required maxlength="40" placeholder="Ex: Academia" />
      </div>
      <div class="form-grupo">
        <label for="inp-cor-cat">Cor</label>
        <input type="color" id="inp-cor-cat" value="${cat ? cat.cor : '#7c6af7'}" style="height:40px;padding:2px 6px" />
      </div>
      <div class="acoes-form">
        <button type="submit" class="btn btn-primario">${cat ? 'Salvar' : 'Criar'}</button>
        <button type="button" class="btn btn-secundario" id="btn-cancelar-modal">Cancelar</button>
      </div>
    </form>
  `;

  overlay.classList.add('visivel');

  document.getElementById('btn-fechar-modal').addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-modal').addEventListener('click', fecharModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) fecharModal(); });

  document.getElementById('form-categoria').addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('inp-nome-cat').value.trim();
    const cor = document.getElementById('inp-cor-cat').value;
    if (!nome) { mostrarToast('Nome obrigatório.', 'erro'); return; }
    salvarCategoria(id, nome, cor);
  });
}

function salvarCategoria(id, nome, cor) {
  const categorias = carregarCategorias();
  if (id) {
    const idx = categorias.findIndex(c => c.id === id);
    if (idx !== -1) categorias[idx] = { id, nome, cor };
    mostrarToast('Categoria atualizada!', 'sucesso');
  } else {
    categorias.push({ id: gerarId(), nome, cor });
    mostrarToast('Categoria criada!', 'sucesso');
  }
  salvarCategorias(categorias);
  fecharModal();
  renderizarCategorias();
}

function excluirCategoria(id) {
  const gastos = carregarGastos();
  const emUso = gastos.some(g => g.categoriaId === id);
  if (emUso) {
    mostrarToast('Categoria em uso — remova os gastos primeiro.', 'erro');
    return;
  }
  const cat = carregarCategorias().find(c => c.id === id);
  confirmarModal('Excluir categoria', `Deseja excluir a categoria <strong>${cat ? cat.nome : ''}</strong>?`, () => {
    const categorias = carregarCategorias().filter(c => c.id !== id);
    salvarCategorias(categorias);
    mostrarToast('Categoria excluída.', 'sucesso');
    renderizarCategorias();
  });
}

function fecharModal() {
  document.getElementById('overlay-modal').classList.remove('visivel');
}

// ===== Resumo Anual =====

let graficoBarras = null;
let graficoPizzaAnual = null;
let graficoComparativo = null;
let graficoTendencia = null;

function renderizarResumoAnual() {
  const secao = document.getElementById('secao-resumo');
  const todos = carregarGastos();
  const todasReceitas = carregarReceitas();
  const categorias = carregarCategorias();

  // Seletor de ano: anos com dados + ano atual
  const anosComDados = [...new Set([
    ...todos.map(g => g.data.substring(0, 4)),
    ...todasReceitas.map(r => r.data.substring(0, 4)),
  ])].sort();
  if (!anosComDados.includes(String(anoAtual))) anosComDados.push(String(anoAtual));
  const anoSelecionado = window._anoResumo || String(anoAtual);
  window._anoResumo = anoSelecionado;

  const gastoAno = todos.filter(g => g.data.startsWith(anoSelecionado));
  const receitaAno = todasReceitas.filter(r => r.data.startsWith(anoSelecionado));

  // Total por mês
  const nomesMeses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const nomesMesesCompletos = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const totalPorMes = Array(12).fill(0);
  gastoAno.forEach(g => {
    const m = parseInt(g.data.substring(5, 7)) - 1;
    totalPorMes[m] += g.valor;
  });
  const receitaPorMes = Array(12).fill(0);
  receitaAno.forEach(r => {
    const m = parseInt(r.data.substring(5, 7)) - 1;
    receitaPorMes[m] += r.valor;
  });

  // Estatísticas gerais
  const totalAnual = gastoAno.reduce((s, g) => s + g.valor, 0);
  const totalReceitaAnual = receitaAno.reduce((s, r) => s + r.valor, 0);
  const saldoAnual = totalReceitaAnual - totalAnual;
  const mesesComGasto = totalPorMes.filter(v => v > 0);
  const mediaMensal = mesesComGasto.length ? totalAnual / mesesComGasto.length : 0;
  const maiorMesIdx = totalPorMes.indexOf(Math.max(...totalPorMes));
  const menorMesIdx = totalPorMes.reduce((iMin, v, i) => v > 0 && (iMin === -1 || v < totalPorMes[iMin]) ? i : iMin, -1);

  // Top categorias do ano
  const porCategoria = {};
  gastoAno.forEach(g => {
    porCategoria[g.categoriaId] = (porCategoria[g.categoriaId] || 0) + g.valor;
  });
  const topCats = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, val]) => ({ cat: categorias.find(c => c.id === id), val }));

  // Top 5 maiores gastos do ano
  const top5Gastos = [...gastoAno].sort((a, b) => b.valor - a.valor).slice(0, 5);

  secao.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <h1 class="titulo-secao" style="margin:0">Resumo Anual</h1>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:13px;color:var(--cor-texto-suave)">Ano:</label>
        <select id="sel-ano-resumo" style="padding:8px 14px;border:1px solid var(--cor-borda);border-radius:8px;background:var(--cor-card);color:var(--cor-texto);font-size:14px;font-weight:600">
          ${anosComDados.map(a => `<option value="${a}" ${a === anoSelecionado ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Cards de resumo -->
    <div id="grid-resumo" style="margin-bottom:24px">
      <div class="card-resumo acento-roxo">
        <span class="rotulo">Total gastos</span>
        <span class="valor">${formatarMoeda(totalAnual)}</span>
        <span class="sub">${gastoAno.length} lançamentos</span>
      </div>
      <div class="card-resumo acento-verde">
        <span class="rotulo">Total receitas</span>
        <span class="valor">${formatarMoeda(totalReceitaAnual)}</span>
        <span class="sub">${receitaAno.length} lançamentos</span>
      </div>
      <div class="card-resumo ${saldoAnual >= 0 ? 'acento-azul' : 'acento-vermelho'}">
        <span class="rotulo">Saldo anual</span>
        <span class="valor" style="color:${saldoAnual >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'}">${formatarMoeda(saldoAnual)}</span>
        <span class="sub">${saldoAnual >= 0 ? 'no positivo' : 'no negativo'}</span>
      </div>
      <div class="card-resumo acento-amarelo">
        <span class="rotulo">Média mensal gastos</span>
        <span class="valor">${formatarMoeda(mediaMensal)}</span>
        <span class="sub">${mesesComGasto.length} meses com gasto</span>
      </div>
      <div class="card-resumo acento-vermelho">
        <span class="rotulo">Mês mais caro</span>
        <span class="valor" style="font-size:20px">${totalPorMes[maiorMesIdx] > 0 ? nomesMesesCompletos[maiorMesIdx] : '—'}</span>
        <span class="sub">${totalPorMes[maiorMesIdx] > 0 ? formatarMoeda(totalPorMes[maiorMesIdx]) : 'Sem dados'}</span>
      </div>
      <div class="card-resumo acento-azul">
        <span class="rotulo">Mês mais barato</span>
        <span class="valor" style="font-size:20px">${menorMesIdx >= 0 ? nomesMesesCompletos[menorMesIdx] : '—'}</span>
        <span class="sub">${menorMesIdx >= 0 ? formatarMoeda(totalPorMes[menorMesIdx]) : 'Sem dados'}</span>
      </div>
    </div>

    <!-- Gráfico de barras -->
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;flex-wrap:wrap">
        <h2 style="font-size:15px;font-weight:600;margin:0">Gastos vs Receitas por mês</h2>
        <div style="display:flex;gap:14px;font-size:12px">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#f04f5a;display:inline-block"></span>Gastos</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#2ecc71;display:inline-block"></span>Receitas</span>
        </div>
      </div>
      ${(gastoAno.length || receitaAno.length) ? `<canvas id="canvas-barras" height="90"></canvas>` : '<p class="sem-gastos">Nenhum dado para ' + anoSelecionado + '</p>'}
    </div>

    <!-- Gráfico de tendência -->
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;flex-wrap:wrap">
        <h2 style="font-size:15px;font-weight:600;margin:0">Tendência do ano</h2>
        <div style="display:flex;gap:14px;font-size:12px">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:24px;height:2px;background:#f04f5a;display:inline-block;border-radius:2px"></span>Gastos</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:24px;height:2px;background:#2ecc71;display:inline-block;border-radius:2px"></span>Receitas</span>
        </div>
      </div>
      ${(gastoAno.length || receitaAno.length) ? `<canvas id="canvas-tendencia" height="80"></canvas>` : '<p class="sem-gastos">Nenhum dado para ' + anoSelecionado + '</p>'}
    </div>

    <!-- Grid inferior -->
    <div id="grid-resumo-inferior">
      <!-- Top categorias -->
      <div class="card">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:16px">Top categorias</h2>
        ${topCats.length ? `
          <canvas id="canvas-pizza-anual" style="max-width:200px;max-height:200px;margin:0 auto 16px;display:block"></canvas>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${topCats.map(({ cat, val }) => {
              const nome = cat ? cat.nome : 'Sem categoria';
              const cor = cat ? cat.cor : '#aaa';
              const pct = totalAnual > 0 ? ((val / totalAnual) * 100).toFixed(1) : 0;
              return `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                  <span class="cor-dot" style="background:${cor}"></span>
                  <span style="flex:1">${nome}</span>
                  <span style="color:var(--cor-texto-suave)">${pct}%</span>
                  <span style="font-weight:600">${formatarMoeda(val)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : '<p class="sem-gastos">Sem dados</p>'}
      </div>

      <!-- Top 5 maiores gastos -->
      <div class="card">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:16px">Maiores gastos do ano</h2>
        ${top5Gastos.length ? `
          <div style="display:flex;flex-direction:column;gap:4px">
            ${top5Gastos.map((g, i) => {
              const cat = categorias.find(c => c.id === g.categoriaId);
              const cor = cat ? cat.cor : '#aaa';
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--cor-borda)">
                  <span style="font-size:18px;font-weight:800;color:var(--cor-texto-suave);min-width:24px">${i + 1}</span>
                  <span class="cor-dot" style="background:${cor}"></span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.descricao}</div>
                    <div style="font-size:11px;color:var(--cor-texto-suave)">${formatarData(g.data)}</div>
                  </div>
                  <span style="font-weight:700;font-size:14px;color:var(--cor-perigo)">${formatarMoeda(g.valor)}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : '<p class="sem-gastos">Sem dados</p>'}
      </div>

      <!-- Tabela mensal -->
      <div class="card">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:16px">Extrato por mês</h2>
        <table class="tabela-gastos">
          <thead>
            <tr>
              <th>Mês</th>
              <th style="color:var(--cor-perigo)">Gastos</th>
              <th style="font-size:11px;color:var(--cor-texto-suave)">Variação</th>
              <th style="color:var(--cor-sucesso)">Receitas</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${nomesMesesCompletos.map((nome, i) => {
              const gasto = totalPorMes[i];
              const receita = receitaPorMes[i];
              const saldo = receita - gasto;
              const temDados = gasto > 0 || receita > 0;
              const prevGasto = i > 0 ? totalPorMes[i - 1] : 0;
              let variacaoHtml = '<span style="color:var(--cor-texto-suave)">—</span>';
              if (i > 0 && prevGasto > 0 && gasto > 0) {
                const pct = (gasto - prevGasto) / prevGasto * 100;
                const cor = pct >= 0 ? 'var(--cor-perigo)' : 'var(--cor-sucesso)';
                const seta = pct >= 0 ? '↑' : '↓';
                variacaoHtml = `<span style="color:${cor};font-weight:600;font-size:12px">${seta} ${Math.abs(pct).toFixed(1)}%</span>`;
              }
              return `
                <tr>
                  <td>${nome}</td>
                  <td style="color:var(--cor-perigo);font-weight:600">${gasto > 0 ? formatarMoeda(gasto) : '—'}</td>
                  <td>${variacaoHtml}</td>
                  <td style="color:var(--cor-sucesso);font-weight:600">${receita > 0 ? formatarMoeda(receita) : '—'}</td>
                  <td style="font-weight:700;color:${!temDados ? 'var(--cor-texto-suave)' : saldo >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'}">
                    ${temDados ? formatarMoeda(saldo) : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Evento seletor de ano
  document.getElementById('sel-ano-resumo').addEventListener('change', function () {
    window._anoResumo = this.value;
    renderizarResumoAnual();
  });

  if (!gastoAno.length && !receitaAno.length) return;

  // Gráfico de barras — gastos vs receitas por mês
  if (graficoBarras) { graficoBarras.destroy(); graficoBarras = null; }
  const ctxBarras = document.getElementById('canvas-barras');
  if (ctxBarras) {
    graficoBarras = new Chart(ctxBarras, {
      type: 'bar',
      data: {
        labels: nomesMeses,
        datasets: [
          {
            label: 'Gastos',
            data: totalPorMes,
            backgroundColor: totalPorMes.map((v, i) =>
              i === maiorMesIdx && v > 0 ? '#f04f5a' : 'rgba(240,79,90,0.6)'
            ),
            borderRadius: 5,
            borderSkipped: false,
          },
          {
            label: 'Receitas',
            data: receitaPorMes,
            backgroundColor: 'rgba(46,204,113,0.7)',
            borderRadius: 5,
            borderSkipped: false,
          }
        ]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + formatarMoeda(ctx.parsed.y) } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6880' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6880', callback: v => 'R$' + (v/1000).toFixed(1) + 'k' } }
        }
      }
    });
  }

  // Gráfico de tendência
  if (graficoTendencia) { graficoTendencia.destroy(); graficoTendencia = null; }
  const ctxTendencia = document.getElementById('canvas-tendencia');
  if (ctxTendencia && (gastoAno.length || receitaAno.length)) {
    graficoTendencia = new Chart(ctxTendencia, {
      type: 'line',
      data: {
        labels: nomesMeses,
        datasets: [
          {
            label: 'Gastos',
            data: totalPorMes.map(v => v || null),
            borderColor: '#f04f5a',
            backgroundColor: 'rgba(240,79,90,0.1)',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Receitas',
            data: receitaPorMes.map(v => v || null),
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46,204,113,0.08)',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          }
        ]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + ctx.dataset.label + ': ' + formatarMoeda(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b6880' } },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#6b6880', callback: v => v === 0 ? '0' : 'R$' + (v / 1000).toFixed(1) + 'k' },
            beginAtZero: true,
          }
        }
      }
    });
  }

  // Gráfico de pizza — top categorias
  if (graficoPizzaAnual) { graficoPizzaAnual.destroy(); graficoPizzaAnual = null; }
  const ctxPizza = document.getElementById('canvas-pizza-anual');
  if (ctxPizza && topCats.length) {
    graficoPizzaAnual = new Chart(ctxPizza, {
      type: 'doughnut',
      data: {
        labels: topCats.map(({ cat }) => cat ? cat.nome : 'Sem categoria'),
        datasets: [{
          data: topCats.map(({ val }) => val),
          backgroundColor: topCats.map(({ cat }) => cat ? cat.cor : '#aaa'),
          borderWidth: 2,
          borderColor: '#1a1a28',
        }]
      },
      options: {
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + formatarMoeda(ctx.parsed) } }
        }
      }
    });
  }
}

// ===== Comparar Meses =====

function renderizarCompararMeses() {
  const secao = document.getElementById('secao-comparar');
  const todos = carregarGastos();
  const todasReceitas = carregarReceitas();
  const categorias = carregarCategorias();

  // Anos disponíveis
  const anos = [...new Set([
    ...todos.map(g => g.data.substring(0, 4)),
    ...todasReceitas.map(r => r.data.substring(0, 4)),
    String(anoAtual),
  ])].sort();

  // Inicializa estado com mês atual vs mês anterior
  if (!estadoComparar) {
    const mesAnt = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnt = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    estadoComparar = { mesA: mesAnt, anoA: String(anoAnt), mesB: mesAtual, anoB: String(anoAtual) };
  }

  const { mesA, anoA, mesB, anoB } = estadoComparar;
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const prefA = `${anoA}-${String(mesA + 1).padStart(2, '0')}`;
  const prefB = `${anoB}-${String(mesB + 1).padStart(2, '0')}`;

  const gastosA = todos.filter(g => g.data.startsWith(prefA));
  const gastosB = todos.filter(g => g.data.startsWith(prefB));
  const receitasA = todasReceitas.filter(r => r.data.startsWith(prefA));
  const receitasB = todasReceitas.filter(r => r.data.startsWith(prefB));

  const totalGastosA = gastosA.reduce((s, g) => s + g.valor, 0);
  const totalGastosB = gastosB.reduce((s, g) => s + g.valor, 0);
  const totalReceitasA = receitasA.reduce((s, r) => s + r.valor, 0);
  const totalReceitasB = receitasB.reduce((s, r) => s + r.valor, 0);
  const saldoA = totalReceitasA - totalGastosA;
  const saldoB = totalReceitasB - totalGastosB;

  function badgeVar(a, b, inverso = false) {
    if (a === 0 && b === 0) return '';
    if (a === 0 || b === 0) return '';
    const pct = (b - a) / a * 100;
    const subiu = pct >= 0;
    const bom = inverso ? !subiu : subiu;
    const cor = bom ? 'var(--cor-sucesso)' : 'var(--cor-perigo)';
    const seta = subiu ? '↑' : '↓';
    return `<span style="font-size:12px;color:${cor};font-weight:600;margin-left:6px">${seta} ${Math.abs(pct).toFixed(1)}%</span>`;
  }

  // Categorias combinadas dos dois meses
  const catIds = [...new Set([
    ...gastosA.map(g => g.categoriaId),
    ...gastosB.map(g => g.categoriaId),
  ])];
  const porCatA = {};
  const porCatB = {};
  gastosA.forEach(g => { porCatA[g.categoriaId] = (porCatA[g.categoriaId] || 0) + g.valor; });
  gastosB.forEach(g => { porCatB[g.categoriaId] = (porCatB[g.categoriaId] || 0) + g.valor; });
  const catRows = catIds
    .map(id => ({ cat: categorias.find(c => c.id === id), a: porCatA[id] || 0, b: porCatB[id] || 0 }))
    .sort((x, y) => (y.a + y.b) - (x.a + x.b));

  // Top 5 gastos de cada mês
  const top5A = [...gastosA].sort((a, b) => b.valor - a.valor).slice(0, 5);
  const top5B = [...gastosB].sort((a, b) => b.valor - a.valor).slice(0, 5);

  const opsMeses = nomesMeses.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  const opsAnos = anos.map(a => `<option value="${a}">${a}</option>`).join('');

  function seletorMes(prefixo, mesSel, anoSel) {
    return `
      <div class="seletor-mes-comparar">
        <select id="sel-mes-${prefixo}" class="sel-comparar">
          ${nomesMeses.map((n, i) => `<option value="${i}" ${i === mesSel ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <select id="sel-ano-${prefixo}" class="sel-comparar">
          ${anos.map(a => `<option value="${a}" ${a === anoSel ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
    `;
  }

  function cardComparativo(rotulo, valA, valB, inverso = false) {
    const diff = valB - valA;
    const temDiff = valA > 0 || valB > 0;
    const corDiff = diff === 0 ? 'var(--cor-texto-suave)' : (inverso ? (diff < 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)') : (diff > 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)'));
    return `
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-size:12px;color:var(--cor-texto-suave);margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${rotulo}</div>
        <div style="display:flex;justify-content:space-around;align-items:center;gap:16px">
          <div>
            <div style="font-size:11px;color:var(--cor-texto-suave);margin-bottom:4px">${nomesMeses[mesA]} ${anoA}</div>
            <div style="font-size:16px;font-weight:700">${formatarMoeda(valA)}</div>
          </div>
          <div style="font-size:16px;font-weight:700;color:var(--cor-texto-suave)">vs</div>
          <div>
            <div style="font-size:11px;color:var(--cor-texto-suave);margin-bottom:4px">${nomesMeses[mesB]} ${anoB}</div>
            <div style="font-size:16px;font-weight:700">${formatarMoeda(valB)}</div>
          </div>
        </div>
        ${temDiff ? `<div style="margin-top:12px;font-size:13px;color:${corDiff};font-weight:600">
          ${diff >= 0 ? '+' : ''}${formatarMoeda(diff)} ${badgeVar(valA, valB, inverso)}
        </div>` : ''}
      </div>
    `;
  }

  function listaTop5(gastos) {
    if (!gastos.length) return '<p style="color:var(--cor-texto-suave);font-size:13px;padding:8px 0">Sem gastos</p>';
    return gastos.map((g, i) => {
      const cat = categorias.find(c => c.id === g.categoriaId);
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--cor-borda)">
          <span style="font-size:16px;font-weight:800;color:var(--cor-texto-suave);min-width:20px">${i + 1}</span>
          <span class="cor-dot" style="background:${cat ? cat.cor : '#aaa'}"></span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.descricao}</div>
            <div style="font-size:11px;color:var(--cor-texto-suave)">${formatarData(g.data)}</div>
          </div>
          <span style="font-weight:700;font-size:13px;color:var(--cor-perigo)">${formatarMoeda(g.valor)}</span>
        </div>
      `;
    }).join('');
  }

  secao.innerHTML = `
    <h1 class="titulo-secao">Comparar Meses</h1>

    <!-- Seletores -->
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;padding:8px 0">
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:700;color:var(--cor-texto-suave);letter-spacing:1px;margin-bottom:10px">MÊS A</div>
          ${seletorMes('a', mesA, anoA)}
        </div>
        <div style="font-size:20px;font-weight:700;color:var(--cor-texto-suave);padding-top:20px">vs</div>
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:700;color:var(--cor-texto-suave);letter-spacing:1px;margin-bottom:10px">MÊS B</div>
          ${seletorMes('b', mesB, anoB)}
        </div>
      </div>
    </div>

    <!-- Cards comparativos -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px">
      ${cardComparativo('Gastos', totalGastosA, totalGastosB, true)}
      ${cardComparativo('Receitas', totalReceitasA, totalReceitasB, false)}
      ${cardComparativo('Saldo', saldoA, saldoB, false)}
    </div>

    <!-- Tabela de categorias -->
    <div class="card" style="margin-bottom:24px">
      <h2 style="font-size:15px;font-weight:600;margin-bottom:16px">Gastos por categoria</h2>
      ${catRows.length ? `
        <table class="tabela-gastos">
          <thead>
            <tr>
              <th>Categoria</th>
              <th style="text-align:right">${nomesMeses[mesA]} ${anoA}</th>
              <th style="text-align:right">${nomesMeses[mesB]} ${anoB}</th>
              <th style="text-align:right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            ${catRows.map(({ cat, a, b }) => {
              const diff = b - a;
              const corDiff = diff === 0 ? 'var(--cor-texto-suave)' : diff < 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)';
              const nomeCat = cat ? cat.nome : 'Sem categoria';
              const corCat = cat ? cat.cor : '#aaa';
              return `
                <tr>
                  <td style="display:flex;align-items:center;gap:8px">
                    <span class="cor-dot" style="background:${corCat}"></span>${nomeCat}
                  </td>
                  <td style="text-align:right;font-weight:600">${a > 0 ? formatarMoeda(a) : '—'}</td>
                  <td style="text-align:right;font-weight:600">${b > 0 ? formatarMoeda(b) : '—'}</td>
                  <td style="text-align:right;font-weight:700;color:${corDiff}">
                    ${a > 0 || b > 0 ? (diff >= 0 ? '+' : '') + formatarMoeda(diff) : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : '<p style="color:var(--cor-texto-suave);font-size:14px">Nenhum gasto em nenhum dos meses.</p>'}
    </div>

    <!-- Top gastos lado a lado -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:12px">Maiores gastos — ${nomesMeses[mesA]} ${anoA}</h2>
        ${listaTop5(top5A)}
      </div>
      <div class="card">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:12px">Maiores gastos — ${nomesMeses[mesB]} ${anoB}</h2>
        ${listaTop5(top5B)}
      </div>
    </div>
  `;

  lucide.createIcons();

  ['a', 'b'].forEach(p => {
    ['sel-mes', 'sel-ano'].forEach(id => {
      document.getElementById(`${id}-${p}`).addEventListener('change', () => {
        estadoComparar = {
          mesA: parseInt(document.getElementById('sel-mes-a').value),
          anoA: document.getElementById('sel-ano-a').value,
          mesB: parseInt(document.getElementById('sel-mes-b').value),
          anoB: document.getElementById('sel-ano-b').value,
        };
        renderizarCompararMeses();
      });
    });
  });
}

// ===== Busca Global =====

function renderizarBuscaGlobal() {
  const secao = document.getElementById('secao-busca');
  secao.innerHTML = `
    <h1 class="titulo-secao">Busca Global</h1>
    <div class="card" style="margin-bottom:24px">
      <input type="text" id="inp-busca-global" placeholder="Buscar em todos os meses e anos..."
        style="width:100%;padding:12px 16px;border:1px solid var(--cor-borda);border-radius:8px;background:var(--cor-fundo);color:var(--cor-texto);font-size:15px;outline:none" />
    </div>
    <div id="resultados-busca"></div>
  `;

  const inp = document.getElementById('inp-busca-global');
  inp.focus();
  inp.addEventListener('input', () => executarBuscaGlobal(inp.value.trim()));
}

function executarBuscaGlobal(termo) {
  const container = document.getElementById('resultados-busca');
  if (!termo) { container.innerHTML = ''; return; }

  const categorias = carregarCategorias();
  const todos = carregarGastos().filter(g =>
    g.descricao.toLowerCase().includes(termo.toLowerCase())
  );

  if (!todos.length) {
    container.innerHTML = `<p class="sem-gastos">Nenhum resultado para "<strong>${termo}</strong>"</p>`;
    return;
  }

  // Agrupa por ano-mês
  const porMes = {};
  todos.forEach(g => {
    const chave = g.data.substring(0, 7);
    if (!porMes[chave]) porMes[chave] = [];
    porMes[chave].push(g);
  });

  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const html = Object.keys(porMes).sort().reverse().map(chave => {
    const [ano, mes] = chave.split('-');
    const nomeMesStr = nomesMeses[parseInt(mes) - 1];
    const gastosMes = porMes[chave].sort((a, b) => b.data.localeCompare(a.data));
    const totalMes = gastosMes.reduce((s, g) => s + g.valor, 0);

    const linhas = gastosMes.map(g => {
      const cat = categorias.find(c => c.id === g.categoriaId);
      const corCat = cat ? cat.cor : '#aaa';
      const nomeCat = cat ? cat.nome : 'Sem categoria';
      const pendente = g.status === 'pendente';
      // Destaca o termo buscado
      const regex = new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const descHighlight = g.descricao.replace(regex, '<mark style="background:var(--cor-ativo);color:#fff;border-radius:3px;padding:0 2px">$1</mark>');
      return `
        <tr class="${pendente ? 'linha-pendente' : ''}">
          <td>${formatarData(g.data)}</td>
          <td>${g.recorrente ? `<span title="Recorrente">${ICONES.recorrente}</span>` : ''}${descHighlight}</td>
          <td><span class="badge-categoria" style="background:${corCat}">${nomeCat}</span></td>
          <td><strong>${formatarMoeda(g.valor)}</strong></td>
          <td><span class="badge-status ${pendente ? 'pendente' : 'pago'}" style="cursor:pointer" data-toggle-status-busca="${g.id}">${pendente ? 'Pendente' : 'Pago'}</span></td>
          <td>
            <div class="acoes-gasto">
              <button class="btn-acao" data-editar-busca="${g.id}">Editar</button>
              <button class="btn-acao" onclick="irParaMesDoGasto('${g.data}')">Ver mês</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h3 style="font-size:14px;font-weight:700;color:var(--cor-texto-suave)">${nomeMesStr} ${ano}</h3>
          <span style="font-size:13px;color:var(--cor-texto-suave)">${gastosMes.length} resultado(s) · ${formatarMoeda(totalMes)}</span>
        </div>
        <div class="card" style="padding:0;overflow:hidden">
          <table class="tabela-gastos">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  const total = todos.reduce((s, g) => s + g.valor, 0);
  container.innerHTML = `
    <p style="font-size:13px;color:var(--cor-texto-suave);margin-bottom:16px">
      ${todos.length} resultado(s) em ${Object.keys(porMes).length} mês(es) · Total: <strong>${formatarMoeda(total)}</strong>
    </p>
    ${html}`;

  container.querySelectorAll('[data-toggle-status-busca]').forEach(badge => {
    badge.addEventListener('click', () => {
      const gastos = carregarGastos();
      const idx = gastos.findIndex(g => g.id === badge.dataset.toggleStatusBusca);
      if (idx === -1) return;
      gastos[idx].status = gastos[idx].status === 'pendente' ? 'pago' : 'pendente';
      salvarGastos(gastos);
      executarBuscaGlobal(termo);
    });
  });

  container.querySelectorAll('[data-editar-busca]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gasto = carregarGastos().find(g => g.id === btn.dataset.editarBusca);
      if (!gasto) return;
      abrirModalGasto(gasto, false, () => executarBuscaGlobal(termo));
    });
  });
}

function irParaMesDoGasto(dataStr) {
  const [ano, mes] = dataStr.split('-');
  anoAtual = parseInt(ano);
  mesAtual = parseInt(mes) - 1;
  irParaSecao('dashboard');
}

// ===== Inicialização =====

function inicializar() {
  inicializarCategoriasPadrao();
  projetarGastosRecorrentes();
  projetarReceitasRecorrentes();
  renderizarDashboard();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Menu lateral
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => irParaSecao(item.dataset.secao));
  });

  // Backup / Restaurar
  document.getElementById('btn-fazer-backup').addEventListener('click', fazerBackup);
  document.getElementById('btn-restaurar-backup').addEventListener('click', () => {
    document.getElementById('input-restaurar').click();
  });
  document.getElementById('btn-apagar-tudo').addEventListener('click', apagarTodosOsGastos);

  document.getElementById('input-restaurar').addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      restaurarBackup(arquivo);
      e.target.value = '';
    }
  });

  // Fechar dropdowns de categoria ao clicar fora
  document.addEventListener('click', () => {
    document.querySelectorAll('.cat-select-wrapper.aberto').forEach(w => {
      w.querySelector('.cat-select-dropdown').style.cssText = '';
      w.classList.remove('aberto');
    });
  });

  // Adiciona toast ao DOM
  if (!document.getElementById('toast')) {
    const toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  // Adiciona modal ao DOM
  if (!document.getElementById('overlay-modal')) {
    const overlay = document.createElement('div');
    overlay.id = 'overlay-modal';
    overlay.innerHTML = '<div id="modal"></div>';
    document.body.appendChild(overlay);
  }
}

document.addEventListener('DOMContentLoaded', inicializar);
