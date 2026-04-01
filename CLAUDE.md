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
- 4 cards de resumo com ícones Lucide: Receitas (trending-up), Gastos (trending-down), Saldo (scale), Maior gasto (zap)
- Gráfico de rosca (donut) com gastos por categoria — oculto na aba Receitas
- Abas **Gastos / Receitas** com animação fade — botões de ação sempre visíveis; Exportar CSV oculto na aba Receitas
- Tabela de gastos: ordenada por data, ícone SVG para recorrentes, badge de status clicável
- Tabela de receitas: data, descrição, valor, editar/excluir
- Filtro de gastos: texto, categoria (dropdown customizado), valor mín/máx — persiste ao trocar de mês
- Filtro de receitas: texto, valor mín/máx — mesma aparência que o filtro de gastos (classe `.barra-filtro`)
- Multi-seleção com checkboxes + bulk delete em **ambas** as abas (gastos e receitas)
- Exportar CSV do mês para gastos e para receitas (cada um respeita seus filtros ativos)
- Estado vazio ilustrado (`.estado-vazio` com SVG + título + subtítulo) em gastos e receitas
- Data padrão no modal = dia 1 do mês/ano visualizado

### Adicionar / Editar / Duplicar Gasto
- Todos abrem modal direto na Visão Geral: `abrirModalGasto(gasto, isDuplicar)`
- Wrappers: `abrirModalAdicionarGasto()`, `abrirModalEdicao(id)`, `duplicarGasto(id)`
- Campos: valor, data, descrição, categoria, status (pago/pendente), recorrente
- Botão "+ Nova" cria categoria sem fechar o modal; cancelar restaura o modal de gasto
- **Auto-categorização**: sugere categoria pelo histórico de descrições similares ("✦ Categoria sugerida: X")

### Receitas
- Estrutura: `{ id, data, descricao, valor, recorrente }` — sem categoria, sem status
- Adicionadas/editadas via `abrirModalReceita(id?)` — validação com toast de erro igual aos gastos
- **Receitas recorrentes**: `projetarReceitasRecorrentes()` auto-cria cópias no mês; exclusões em `recorrentes_receitas_excluidos` (chave: `YYYY-MM|descrição`)
- Incluídas no backup/restaurar

### Gastos recorrentes
- `projetarGastosRecorrentes()` roda a cada render do dashboard — auto-cria cópias do mês atual se ausentes

### Confirmar exclusão / Desfazer
- `confirmarModal(titulo, mensagem, aoConfirmar)` — substitui `confirm()` nativo
- `mostrarToast(msg, tipo, aoDesfazer?)` — toast 4 s com botão Desfazer opcional

### Importar CSV — dois fluxos (auto-detectados) + aba Receitas
- Aba **Gastos / Receitas** na tela de importação (`tipoImportacaoCSV` global)
- Ao sair da seção de importação, `tipoImportacaoCSV` é resetado para `'gastos'`

**Fluxo 1 — CSV bancário:**
- Detecta delimitador (tab/;/,), mapeamento de colunas, revisão linha a linha, atribuição de categoria em lote
- Dropdowns de categoria customizados; auto-categorização por histórico (marca ✦)
- Exibe total selecionado antes de confirmar importação

**Fluxo 2 — Planilha anual (gastos):**
- Detecta colunas de meses em PT via `MESES_PT` (strings sem acento para comparação robusta com `semAcentos()`)
- "DIA PAGAR" + "TIPO", seletor de ano, dropdowns customizados por linha e em lote
- `mostrarImportacaoPlanilha()` — usa `secaoMap` como escopo para todos os `querySelector` (nunca `document.querySelector` solto)
- Exibe total selecionado antes de confirmar

**Fluxo 3 — Planilha anual (receitas):**
- Mesmo formato da planilha anual, mas sem coluna TIPO; detectado quando `tipoImportacaoCSV === 'receitas'`
- `mostrarImportacaoPlanilhaReceitas()` / `confirmarImportacaoPlanilhaReceitas()`

- Encoding automático: UTF-8 com fallback Windows-1252
- Stepper visual de 3 etapas

### Categorias
- Criar, renomear, excluir
- Cada categoria tem cor — usada no gráfico, dropdowns e listas
- Dropdown sempre **customizado** (`htmlSelectCategoria` + `inicializarSelectCategoria`) — nunca `<select>` nativo para categoria

### Resumo Anual
- Seletor de ano; cards: total gastos, total receitas, saldo anual, média mensal, mês mais/menos caro
- Gráfico de barras agrupado (gastos + receitas por mês, mês mais caro em vermelho)
- **Coluna Variação** na tabela mensal: badge ↑/↓ com % de variação mês a mês nos gastos
- Donut top-5 categorias de gastos
- Top 5 maiores gastos individuais do ano

### Comparar Meses
- Seção dedicada (`renderizarCompararMeses()`) acessível pelo menu lateral
- Dois dropdowns (mês A e mês B) com `estadoComparar` global para persistir seleção entre re-renders
- 3 cards comparativos: gastos, receitas, saldo
- Tabela de categorias lado a lado
- Top 5 gastos de cada mês

### Busca Global
- Busca em todos os meses e anos; destaca termo na descrição
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
  "status": "pago" | "pendente"
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
- `inicializarSelectCategoria(idInput, aoMudar)` — registra eventos; usa `position: fixed` + `getBoundingClientRect()` para não ser clipado por `overflow: auto`
- `selecionarCategoriaDropdown(idInput, catId)` — seleção programática sem recriar o HTML
- `atualizarSelectCategorias(catIdSelecionada)` — re-renderiza o dropdown após criar nova categoria
- `abrirModalGasto(gasto, isDuplicar)` — modal unificado de novo/editar/duplicar gasto
- `abrirModalAdicionarGasto()` / `abrirModalEdicao(id)` / `duplicarGasto(id)` — atalhos
- `abrirModalReceita(id?)` — modal de nova/editar receita (valida com toast de erro)
- `abrirModalNovaCategoria(callback, aoCancelar?)` — `aoCancelar` restaura modal anterior
- `confirmarModal(titulo, mensagem, aoConfirmar)` — modal de confirmação
- `mostrarToast(msg, tipo, aoDesfazer?)` — toast com Desfazer opcional
- `buscarCategoriaSugerida(descricao)` — retorna `categoriaId` do gasto mais recente com descrição similar
- `fazerBackup()` / `restaurarBackup(arquivo)` — backup completo em JSON
- `exportarCSV(gastos, categorias, nomeArquivo)` — CSV com BOM UTF-8, separador `;`, formato BR
- `exportarCSVReceitas(receitas, nomeArquivo)` — CSV de receitas com BOM UTF-8
- `projetarGastosRecorrentes()` / `projetarReceitasRecorrentes()` — auto-projeta recorrentes no mês atual
- `aplicarFiltros(gastos)` / `aplicarFiltrosReceitas(receitas)` — aplicam estados globais `filtro` / `filtroReceitas`
- `atualizarTabela()` — re-renderiza só a tabela de gastos sem full re-render do dashboard
- `atualizarTotalSelecao(idTotal, selectorChk)` — soma `data-valor` dos checkboxes marcados e exibe
- `registrarEventosTabela(container)` — eventos da tabela de gastos (editar, excluir, duplicar, status, checkboxes)
- `registrarEventosReceitas(container)` — eventos da tabela de receitas (editar, excluir, checkboxes)
- `salvarGastoDoForm(idExistente, aoSalvar?)` — salva do formulário; `aoSalvar` substitui navegação padrão
- `parsearMoedaBR(str)` — "R$ 1.234,56" → 1234.56
- `semAcentos(str)` — remove diacríticos (usado para comparação de meses no CSV)
- `irParaMesDoGasto(data)` — navega para o mês/ano de uma data específica
- `renderizarCompararMeses()` — seção de comparação entre dois meses selecionados via dropdown

---

## Estado global relevante

```javascript
let mesAtual, anoAtual          // mês/ano visualizado no dashboard
let abaAtivaDashboard           // 'gastos' | 'receitas'
let filtro                      // { texto, categoriaId, valorMin, valorMax }
let filtroReceitas              // { texto, valorMin, valorMax }
let tipoImportacaoCSV           // 'gastos' | 'receitas' — resetado ao sair da seção
let estadoComparar              // { mesA, anoA, mesB, anoB }
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

---

## Roadmap (não implementado)

- Perfis de banco para CSV (Nubank, Itaú, Inter...)
- Metas de gastos por categoria
- Backend + banco de dados
