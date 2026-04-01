# Minhas Finanças

## Visão geral do projeto

Aplicação web de gestão de gastos e receitas mensais. Funciona inteiramente no navegador, sem backend. Os dados ficam salvos no `localStorage`.

---

## Stack

- HTML + CSS + JavaScript puro (sem framework)
- Dados persistidos via `localStorage`
- Chart.js carregado via CDN para os gráficos
- Lucide Icons via CDN para ícones SVG (`lucide.createIcons()` chamado após cada render)

---

## Funcionalidades implementadas

### Dashboard (Visão Geral)
- 4 cards de resumo com ícones Lucide: Receitas (trending-up), Gastos (trending-down), Saldo (scale), Maior gasto (zap); valores animados com count-up ao carregar
- Gráfico de rosca (donut) com gastos por categoria — oculto na aba Receitas
- Abas **Gastos / Receitas** com animação fade — botões de ação sempre visíveis; Exportar CSV oculto na aba Receitas
- Botões "+ Gasto" / "+ Receita" estilizados com gradiente e borda em pílula (`.btn-add-dash`)
- Tabela de gastos: ordenável por coluna (data, descrição, valor), ícone SVG para recorrentes, badge de status clicável; campo obs exibido abaixo da descrição
- Tabela de receitas: ordenável, data, descrição, valor, editar/excluir
- Filtro de gastos: texto, categoria (dropdown customizado), valor mín/máx — persiste ao trocar de mês
- Filtro de receitas: texto, valor mín/máx — mesma aparência que o filtro de gastos (classe `.barra-filtro`)
- Multi-seleção com checkboxes + bulk delete em **ambas** as abas
- Exportar CSV do mês para gastos e para receitas
- Estado vazio ilustrado (`.estado-vazio` com SVG + título + subtítulo)
- Data padrão no modal = dia 1 do mês/ano visualizado
- **Tela de onboarding** exibida quando não há nenhum dado (gastos + receitas = 0)
- **FAB flutuante** (`#fab-btn`) com menu para adicionar gasto ou receita
- **Tema claro/escuro**: botão `#btn-tema` na sidebar; classe `body.tema-claro` sobrescreve as variáveis CSS; persistido em `localStorage('tema')`
- **Card de pendentes** atualiza em tempo real ao clicar no badge de status (`atualizarCardPendente()`)

### Adicionar / Editar / Duplicar Gasto
- Todos abrem modal direto na Visão Geral: `abrirModalGasto(gasto, isDuplicar)`
- Wrappers: `abrirModalAdicionarGasto()`, `abrirModalEdicao(id)`, `duplicarGasto(id)`
- Campos: valor, data, descrição, categoria, status (pago/pendente), recorrente, observação (campo `obs`)
- Botão "+ Nova" cria categoria sem fechar o modal; cancelar restaura o modal de gasto
- **Auto-categorização**: sugere categoria pelo histórico de descrições similares ("✦ Categoria sugerida: X")

### Receitas
- Estrutura: `{ id, data, descricao, valor, recorrente }` — sem status
- Adicionadas/editadas via `abrirModalReceita(id?)` — validação com toast de erro
- Botão "+ Nova categoria" dentro do modal de receita
- **Receitas recorrentes**: `projetarReceitasRecorrentes()` auto-cria cópias no mês; exclusões em `recorrentes_receitas_excluidos` (chave: `YYYY-MM|descrição`)
- Incluídas no backup/restaurar

### Gastos recorrentes
- `projetarGastosRecorrentes()` roda a cada render do dashboard — auto-cria cópias do mês atual se ausentes

### Confirmar exclusão / Desfazer
- `confirmarModal(titulo, mensagem, aoConfirmar)` — substitui `confirm()` nativo
- `mostrarToast(msg, tipo, aoDesfazer?)` — toast 4 s com botão Desfazer opcional; ícone SVG por tipo

### Importar CSV — três fluxos (auto-detectados) + aba Receitas
- Aba **Gastos / Receitas** na tela de importação (`tipoImportacaoCSV` global)
- Ao sair da seção de importação, `tipoImportacaoCSV` é resetado para `'gastos'`

**Fluxo 1 — CSV bancário:**
- Detecta delimitador (tab/;/,), mapeamento de colunas, revisão linha a linha, atribuição de categoria em lote
- Dropdowns de categoria customizados; auto-categorização por histórico (marca ✦)
- Exibe total selecionado antes de confirmar importação

**Fluxo 2 — Planilha anual (gastos):**
- Detecta colunas de meses em PT via `MESES_PT` (strings sem acento para comparação robusta com `semAcentos()`)
- "DIA PAGAR" + "TIPO", seletor de ano, dropdowns customizados por linha e em lote
- `mostrarImportacaoPlanilha()` — usa `secaoMap` como escopo para todos os `querySelector`
- Exibe total selecionado antes de confirmar

**Fluxo 3 — Planilha anual (receitas):**
- Mesmo formato da planilha anual, mas sem coluna TIPO; detectado quando `tipoImportacaoCSV === 'receitas'`
- `mostrarImportacaoPlanilhaReceitas()` / `confirmarImportacaoPlanilhaReceitas()`

- Encoding automático: UTF-8 com fallback Windows-1252
- Stepper visual de 3 etapas

### Categorias
- Criar, renomear, excluir
- Seletor de cor customizado: paleta de 20 cores (`CORES_PALETA`) + opção de cor livre; funções `htmlSeletorCor()` / `inicializarSeletorCor()`
- Dropdown sempre **customizado** (`htmlSelectCategoria` + `inicializarSelectCategoria`) — nunca `<select>` nativo para categoria

### Resumo Anual
- Seletor de ano; cards: total gastos, total receitas, saldo anual, média mensal, mês mais/menos caro
- Gráfico de barras agrupado (gastos + receitas por mês, mês mais caro em vermelho)
- **Extrato por mês**: tabela com Gastos, Variação (↑/↓ % mês a mês), Receitas e Saldo
- Donut top-5 categorias de gastos; top 5 maiores gastos individuais do ano
- **Exportar Relatório**: botão `#btn-exportar-relatorio` gera HTML auto-contido dark theme (`exportarRelatorioAnual()`)

### Comparar Meses
- Seção dedicada (`renderizarCompararMeses()`) acessível pelo menu lateral
- `estadoComparar` global persiste seleção entre re-renders
- 3 cards comparativos: gastos, receitas, saldo
- Tabela de categorias lado a lado; top 5 gastos e top 5 receitas de cada mês

### Busca Global
- Busca em todos os meses e anos; destaca termo na descrição
- Painel de filtros avançados: tipo (gastos/receitas/todos), categoria, valor mín/máx (`filtroBusca` global)
- Resultados agrupados por mês (mais recente primeiro) com subtotais
- Editar e alterar status diretamente nos resultados; "Ver mês" via `irParaMesDoGasto()`

### Backup e Restaurar
- **Fazer Backup**: `backup-gastos-YYYY-MM-DD.json` com gastos, receitas e categorias (`versao: 2`)
- **Restaurar Backup**: modal de confirmação com contagens; compatível com v1 (sem receitas)
- **Apagar todos os dados**: exige digitar `EXCLUIR`; apaga gastos e receitas, preserva categorias

---

## Estrutura de dados (localStorage)

```json
// "categorias"
[{ "id": "uuid", "nome": "Alimentação", "cor": "#e67e22" }]

// "gastos"
[{
  "id": "uuid",
  "data": "YYYY-MM-DD",
  "descricao": "string",
  "valor": number,
  "categoriaId": "uuid",
  "recorrente": boolean,
  "status": "pago" | "pendente",
  "obs": "string | undefined"
}]

// "receitas"
[{
  "id": "uuid",
  "data": "YYYY-MM-DD",
  "descricao": "string",
  "valor": number,
  "recorrente": boolean
}]

// "recorrentes_receitas_excluidos"
// Set serializado: ["YYYY-MM|descrição", ...]

// "tema"  →  "claro" | "escuro"
```

---

## Navegação (menu lateral)

| Item | Seção | Função |
|---|---|---|
| Visão Geral | `dashboard` | `renderizarDashboard()` |
| Importar CSV | `importar` | `renderizarImportarCSV()` |
| Categorias | `categorias` | `renderizarCategorias()` |
| Resumo Anual | `resumo` | `renderizarResumoAnual()` |
| Busca Global | `busca` | `renderizarBuscaGlobal()` |
| Comparar Meses | `comparar` | `renderizarCompararMeses()` |

> `secao-adicionar` ainda existe no HTML para o fluxo de edição legado.

---

## Funções utilitárias principais

- `htmlSelectCategoria(idInput, categorias, selectedId, placeholder)` — HTML do dropdown customizado com bolinhas coloridas
- `inicializarSelectCategoria(idInput, aoMudar)` — registra eventos; usa `position: fixed` + `getBoundingClientRect()`
- `selecionarCategoriaDropdown(idInput, catId)` — seleção programática sem recriar o HTML
- `atualizarSelectCategorias(catIdSelecionada)` — re-renderiza o dropdown após criar nova categoria
- `htmlSeletorCor(corSelecionada)` / `inicializarSeletorCor()` — paleta de cores customizada para modais de categoria
- `abrirModalGasto(gasto, isDuplicar)` — modal unificado de novo/editar/duplicar gasto
- `abrirModalAdicionarGasto()` / `abrirModalEdicao(id)` / `duplicarGasto(id)` — atalhos
- `abrirModalReceita(id?)` — modal de nova/editar receita (valida com toast de erro)
- `abrirModalNovaCategoria(callback, aoCancelar?)` — `aoCancelar` restaura modal anterior
- `confirmarModal(titulo, mensagem, aoConfirmar)` — modal de confirmação
- `mostrarToast(msg, tipo, aoDesfazer?)` — toast com Desfazer opcional e ícone SVG
- `buscarCategoriaSugerida(descricao)` — retorna `categoriaId` do gasto mais recente com descrição similar
- `fazerBackup()` / `restaurarBackup(arquivo)` — backup completo em JSON
- `exportarCSV(gastos, categorias, nomeArquivo)` — CSV com BOM UTF-8, separador `;`, formato BR; inclui coluna Observação
- `exportarCSVReceitas(receitas, nomeArquivo)` — CSV de receitas com BOM UTF-8
- `exportarRelatorioAnual(ano, ...)` — gera HTML dark theme com extrato mensal, categorias e top 5 gastos
- `projetarGastosRecorrentes()` / `projetarReceitasRecorrentes()` — auto-projeta recorrentes no mês atual
- `aplicarFiltros(gastos)` / `aplicarFiltrosReceitas(receitas)` — aplicam estados globais `filtro` / `filtroReceitas`
- `atualizarTabela()` — re-renderiza só a tabela de gastos sem full re-render do dashboard
- `atualizarCardPendente()` — atualiza o card de pendentes em tempo real sem re-render completo
- `animarContador(el, valorFinal, formatFn, duracao)` — count-up com ease-out via requestAnimationFrame
- `atualizarTotalSelecao(idTotal, selectorChk)` — soma `data-valor` dos checkboxes marcados e exibe
- `registrarEventosTabela(container)` — eventos da tabela de gastos (editar, excluir, duplicar, status, checkboxes, sort)
- `registrarEventosReceitas(container)` — eventos da tabela de receitas (editar, excluir, checkboxes, sort)
- `salvarGastoDoForm(idExistente, aoSalvar?)` — salva do formulário; `aoSalvar` substitui navegação padrão
- `parsearMoedaBR(str)` — "R$ 1.234,56" → 1234.56
- `semAcentos(str)` — remove diacríticos (usado para comparação de meses no CSV)
- `irParaMesDoGasto(data)` — navega para o mês/ano de uma data específica

---

## Estado global relevante

```javascript
let mesAtual, anoAtual          // mês/ano visualizado no dashboard
let abaAtivaDashboard           // 'gastos' | 'receitas'
let filtro                      // { texto, categoriaId, valorMin, valorMax }
let filtroReceitas              // { texto, valorMin, valorMax }
let filtroBusca                 // { tipo, categoriaId, valorMin, valorMax }
let tipoImportacaoCSV           // 'gastos' | 'receitas' — resetado ao sair da seção
let estadoComparar              // { mesA, anoA, mesB, anoB }
let ordenacaoGastos             // { col: 'data'|'descricao'|'valor', dir: 'asc'|'desc' }
let ordenacaoReceitas           // { col: 'data'|'descricao'|'valor', dir: 'asc'|'desc' }
let csvLinhas, csvCabecalhos    // dados brutos do CSV em memória durante importação
```

---

## Padrões de código

- Código todo em **português** (variáveis, funções, comentários)
- IDs via `crypto.randomUUID()`
- Sempre validar entradas do usuário antes de salvar no `localStorage` — usar `mostrarToast(..., 'erro')` para feedback
- Dropdowns de categoria: sempre `htmlSelectCategoria` + `inicializarSelectCategoria` — nunca `<select>` nativo
- Dentro de funções de render de CSV, usar sempre o escopo local (`secaoMap.querySelector`) em vez de `document.querySelector` solto
- Modais reutilizam `#overlay-modal` / `#modal` — ao abrir modal a partir de outro, salvar `modal.innerHTML` e restaurar no cancelar
- Ícones: Lucide via `<i data-lucide="nome">` no HTML estático; SVG inline via objeto `ICONES` para conteúdo gerado dinamicamente
- Sempre chamar `lucide.createIcons()` após injetar HTML com `<i data-lucide="...">` no DOM — inclusive após `secao.innerHTML = ...` em cada `renderizar*`
- Estado vazio: usar `.estado-vazio` com SVG + `.titulo-vazio` + `.sub-vazio` (não `<p>` simples)
- Animação de modal: usar `margin-top` em vez de `transform` — `transform` em elemento pai cria novo stacking context e quebra `position: fixed` dos dropdowns de categoria

---

## Roadmap (não implementado)

- Perfis de banco para CSV (Nubank, Itaú, Inter...)
- Metas de gastos por categoria
- Backend + banco de dados
