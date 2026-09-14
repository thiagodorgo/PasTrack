// Funções puras do relatório de testes (usadas por scripts/relatorio-testes.mjs).
// Nenhuma delas lê disco, rede, relógio ou variáveis de ambiente: tudo chega por parâmetro.

export const NOMES_DAS_SUITES = ["backend", "frontend", "e2e"];
export const SUITES_PADRAO = ["backend", "frontend"];
export const FUSO_HORARIO = "America/Sao_Paulo";

// ---------------------------------------------------------------- JUnit

const PADRAO_ATRIBUTO = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const CAMPOS_JUNIT = {
  testes: "tests",
  falhas: "failures",
  erros: "errors",
  ignorados: "skipped",
  duracaoSegundos: "time",
};

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function arredondar(valor, casas) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function lerAtributos(trecho) {
  const atributos = {};
  for (const [, nome, entreDuplas, entreSimples] of trecho.matchAll(PADRAO_ATRIBUTO)) {
    atributos[nome] = entreDuplas ?? entreSimples;
  }
  return atributos;
}

// Atributos de cada abertura da tag, em qualquer ordem e com aspas simples ou duplas.
function aberturasDaTag(xml, tag) {
  const padrao = new RegExp(`<${tag}((?:\\s+[\\w:.-]+\\s*=\\s*(?:"[^"]*"|'[^']*'))*)\\s*\\/?>`, "g");
  return [...xml.matchAll(padrao)].map(([, atributos]) => lerAtributos(atributos));
}

// Comentários e CDATA podem conter texto parecido com tags (saída de console, por exemplo).
const BLOCOS_LITERAIS = [
  ["<!--", "-->"],
  ["<![CDATA[", "]]>"],
];

// Uma passada: descarta cada bloco literal. Um bloco sem fechamento descarta o resto do texto,
// porque tudo depois dele faz parte do bloco.
function removerBlocosUmaVez(xml) {
  let saida = "";
  let posicao = 0;
  for (;;) {
    let achado = null;
    for (const [abertura, fechamento] of BLOCOS_LITERAIS) {
      const inicio = xml.indexOf(abertura, posicao);
      if (inicio !== -1 && (achado === null || inicio < achado.inicio)) {
        achado = { inicio, abertura, fechamento };
      }
    }
    if (achado === null) return saida + xml.slice(posicao);
    saida += xml.slice(posicao, achado.inicio);
    const fim = xml.indexOf(achado.fechamento, achado.inicio + achado.abertura.length);
    if (fim === -1) return saida;
    posicao = fim + achado.fechamento.length;
  }
}

// Repete até não mudar: um comentário montado por aninhamento só aparece depois da primeira passada.
// Cada passada que muda o texto o encurta, então o laço sempre termina.
function removerTrechosLiterais(xml) {
  let atual = xml;
  let anterior;
  do {
    anterior = atual;
    atual = removerBlocosUmaVez(atual);
  } while (atual !== anterior);
  return atual;
}

export function lerJUnit(xml) {
  const limpo = removerTrechosLiterais(xml);
  const [raiz] = aberturasDaTag(limpo, "testsuites");
  const suites = aberturasDaTag(limpo, "testsuite");
  if (!raiz && suites.length === 0) {
    throw new Error("JUnit sem <testsuites> nem <testsuite>");
  }
  const totais = {};
  for (const [campo, atributo] of Object.entries(CAMPOS_JUNIT)) {
    const somaDasSuites = suites.reduce((soma, suite) => soma + numero(suite[atributo]), 0);
    totais[campo] = raiz?.[atributo] !== undefined ? numero(raiz[atributo]) : somaDasSuites;
  }
  totais.duracaoSegundos = arredondar(totais.duracaoSegundos, 3);
  return totais;
}

// ---------------------------------------------------------------- sanitização

const SEPARADOR = "[\\\\/]+";
// Depois da raiz: separadores seguidos de mais caminho (viram relativo) ou fim do caminho (vira ".").
const FIM_DA_RAIZ = "(?:([\\\\/]+)(?=[^\\\\/\\s\"'`<>|:*?])|(?![\\w-]|\\.[\\w-]))";
const PADRAO_HOSTNAME = /\s+hostname\s*=\s*(?:"[^"]*"|'[^']*')/g;

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Aceita C:\..., C:/..., C:\\... (dentro de JSON), /c/... (Git Bash), /mnt/c/... e /cygdrive/c/...
function padraoDaRaiz(raiz) {
  const partes = raiz.split(/[\\/]+/).filter(Boolean);
  const unidade = /^([A-Za-z]):$/.exec(partes[0] ?? "");
  const resto = (unidade ? partes.slice(1) : partes).map(escaparRegex).join(SEPARADOR);
  if (!resto) return null;
  const inicio = unidade
    ? `(?:${unidade[1]}:|(?:\\/mnt|\\/cygdrive)?\\/${unidade[1]})${SEPARADOR}`
    : SEPARADOR;
  return new RegExp(`(?:file:\\/{2,3})?${inicio}${resto}${FIM_DA_RAIZ}`, unidade ? "gi" : "g");
}

export function sanitizar(texto, raizes) {
  const padroes = [...new Set(raizes)]
    .sort((a, b) => b.length - a.length)
    .map(padraoDaRaiz)
    .filter(Boolean);
  let resultado = texto;
  for (const padrao of padroes) {
    resultado = resultado.replace(padrao, (_trecho, separador) => (separador ? "" : "."));
  }
  return resultado.replace(PADRAO_HOSTNAME, "");
}

const PADRAO_CAMINHO_WINDOWS = /(?:(?<![\w.-])[a-z]:[\\/]+|\/[a-z]\/)(?:users|home)[\\/][^\s"'`<>|]*/gi;
const PADRAO_CAMINHO_POSIX = /\/(?:home|Users)\/[^\s"'`<>|]*/g;

export function caminhosAbsolutosRestantes(texto) {
  const achados = new Set();
  const restante = texto.replace(PADRAO_CAMINHO_WINDOWS, (trecho) => {
    achados.add(trecho);
    return " ";
  });
  for (const [trecho] of restante.matchAll(PADRAO_CAMINHO_POSIX)) achados.add(trecho);
  return [...achados];
}

// ---------------------------------------------------------------- termos proibidos

// Os padrões do arquivo local seguem a sintaxe ERE do grep; estas são as diferenças que importam no JS.
const CLASSES_POSIX = {
  alpha: "A-Za-z",
  digit: "0-9",
  alnum: "A-Za-z0-9",
  upper: "A-Z",
  lower: "a-z",
  space: "\\s",
  blank: " \\t",
  punct: "!-\\/:-@\\[-`{-~",
  xdigit: "0-9A-Fa-f",
};

export function converterEreParaJs(ere) {
  return ere
    .replace(/\[:(\w+):\]/g, (trecho, nome) => CLASSES_POSIX[nome] ?? trecho)
    .replace(/\\[<>]/g, "\\b");
}

function compilarPadrao(valores, chave, flags) {
  const fonte = valores.get(chave);
  if (!fonte) return null;
  try {
    return new RegExp(converterEreParaJs(fonte), flags);
  } catch {
    throw new Error(`padrão inválido na chave "${chave}" do arquivo de padrões`);
  }
}

// Formato "<chave>: <regex>", uma por linha; vale a primeira ocorrência de cada chave.
export function lerPadroes(conteudo) {
  const valores = new Map();
  for (const linha of conteudo.split("\n")) {
    const casamento = /^([\w-]+): (.*)$/.exec(linha.replace(/\r$/, ""));
    if (casamento && !valores.has(casamento[1])) valores.set(casamento[1], casamento[2]);
  }
  return {
    termos: compilarPadrao(valores, "termos", "i"),
    termosMaiusculas: compilarPadrao(valores, "termos-maiusculas", ""),
  };
}

// Aceita o conteúdo do arquivo de padrões ou o resultado de lerPadroes.
export function termosProibidos(texto, padroes) {
  const regras = typeof padroes === "string" ? lerPadroes(padroes) : padroes;
  const expressoes = [regras.termos, regras.termosMaiusculas].filter(Boolean);
  const achados = [];
  texto.split("\n").forEach((linha, indice) => {
    if (expressoes.some((expressao) => expressao.test(linha))) {
      achados.push({ numero: indice + 1, linha: linha.replace(/\r$/, "") });
    }
  });
  return achados;
}

// ---------------------------------------------------------------- cobertura e auditoria

const CAMPOS_COBERTURA = {
  linhas: "lines",
  instrucoes: "statements",
  funcoes: "functions",
  branches: "branches",
};
const SEVERIDADES = {
  critica: "critical",
  alta: "high",
  moderada: "moderate",
  baixa: "low",
  info: "info",
  total: "total",
};

function percentual(valor) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export function lerCobertura(json) {
  const dados = typeof json === "string" ? JSON.parse(json) : json;
  const total = dados?.total ?? {};
  return Object.fromEntries(
    Object.entries(CAMPOS_COBERTURA).map(([campo, chave]) => [campo, percentual(total[chave]?.pct)])
  );
}

// Contagem por severidade da saída de "npm audit --json"; null se a auditoria não trouxe números.
export function contarAuditoria(json) {
  let dados;
  try {
    dados = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return null;
  }
  const contagem = dados?.metadata?.vulnerabilities;
  if (!contagem) return null;
  return Object.fromEntries(
    Object.entries(SEVERIDADES).map(([campo, chave]) => [campo, numero(contagem[chave])])
  );
}

// ---------------------------------------------------------------- apoio da linha de comando

function doisDigitos(valor) {
  return String(valor).padStart(2, "0");
}

function formatarDeslocamento(minutos) {
  const absoluto = Math.abs(minutos);
  const sinal = minutos < 0 ? "-" : "+";
  return `${sinal}${doisDigitos(Math.floor(absoluto / 60))}:${doisDigitos(absoluto % 60)}`;
}

// ISO 8601 com o deslocamento do fuso, por exemplo 2026-09-14T08:34:12-03:00.
export function dataIsoNoFuso(data, fuso = FUSO_HORARIO) {
  const formato = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const partes = Object.fromEntries(formato.formatToParts(data).map(({ type, value }) => [type, value]));
  const local = `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`;
  const instanteEmSegundos = Math.floor(data.getTime() / 1000) * 1000;
  const deslocamento = Math.round((Date.parse(`${local}Z`) - instanteEmSegundos) / 60000);
  return local + formatarDeslocamento(deslocamento);
}

function lerListaDeSuites(valor) {
  const pedidas = valor
    .split(",")
    .map((nome) => nome.trim())
    .filter(Boolean);
  const desconhecidas = pedidas.filter((nome) => !NOMES_DAS_SUITES.includes(nome));
  if (desconhecidas.length > 0) throw new Error(`suíte desconhecida: ${desconhecidas.join(", ")}`);
  if (pedidas.length === 0) throw new Error("--suites precisa de pelo menos uma suíte");
  return NOMES_DAS_SUITES.filter((nome) => pedidas.includes(nome));
}

export function interpretarArgumentos(argumentos) {
  const opcoes = { semExecutar: false, permitirSujo: false, ajuda: false, suites: [...SUITES_PADRAO] };
  for (const argumento of argumentos) {
    if (argumento === "--sem-executar") opcoes.semExecutar = true;
    else if (argumento === "--permitir-sujo") opcoes.permitirSujo = true;
    else if (argumento === "--ajuda" || argumento === "-h") opcoes.ajuda = true;
    else if (argumento.startsWith("--suites=")) opcoes.suites = lerListaDeSuites(argumento.slice(9));
    else throw new Error(`opção desconhecida: ${argumento}`);
  }
  return opcoes;
}

// Linhas de "git status --porcelain" que tornam a árvore suja; tests/results/latest não conta.
export function filtrarArvoreSuja(saidaPorcelain) {
  return saidaPorcelain
    .split("\n")
    .map((linha) => linha.replace(/\r$/, ""))
    .filter(Boolean)
    .filter((linha) => {
      const caminho = linha.slice(3).split(" -> ").pop().replace(/^"|"$/g, "");
      return !/^tests\/results\/latest(\/|$)/.test(caminho);
    });
}

// ---------------------------------------------------------------- resumo.json

function suiteSemResultado(nome, executada, status) {
  const vazio = { testes: null, ok: null, falhas: null, erros: null, ignorados: null, duracaoSegundos: null };
  return { nome, executada, status, ...vazio };
}

// Falha quando o JUnit tem falhas ou erros, ou quando a execução terminou com código diferente de zero
// (limite de cobertura, container que não subiu etc.). Sem JUnit e sem falha de execução: ausente.
function resumirSuite(nome, entrada = {}) {
  const { executada = false, codigoSaida = null, junit = null } = entrada;
  const falhouNaExecucao = executada && codigoSaida !== 0;
  if (!junit) return suiteSemResultado(nome, executada, falhouNaExecucao ? "falha" : "ausente");
  const { testes, falhas, erros, ignorados, duracaoSegundos } = junit;
  const status = falhas + erros > 0 || falhouNaExecucao ? "falha" : "ok";
  const ok = Math.max(0, testes - falhas - erros - ignorados);
  return { nome, executada, status, testes, ok, falhas, erros, ignorados, duracaoSegundos };
}

export function nomeDaPasta(resumo) {
  return `${resumo.data.slice(0, 10)}_${resumo.sha7}`;
}

export function montarResumo(dados) {
  const suites = NOMES_DAS_SUITES.map((nome) =>
    resumirSuite(
      nome,
      dados.suites?.find((suite) => suite.nome === nome)
    )
  );
  return {
    data: dados.data,
    sha: dados.sha,
    sha7: dados.sha.slice(0, 7),
    branch: dados.branch,
    arvoreSuja: Boolean(dados.arvoreSuja),
    situacao: suites.some((suite) => suite.status === "falha") ? "falha" : "ok",
    ambiente: {
      so: dados.ambiente?.so ?? null,
      node: dados.ambiente?.node ?? null,
      docker: dados.ambiente?.docker ?? null,
    },
    suites,
    cobertura: { backend: dados.cobertura?.backend ?? null, frontend: dados.cobertura?.frontend ?? null },
    npmAudit: { backend: dados.npmAudit?.backend ?? null, frontend: dados.npmAudit?.frontend ?? null },
    comandos: dados.comandos ?? [],
  };
}

// ---------------------------------------------------------------- Markdown

const FORMATO_NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const TEXTO_DA_SITUACAO = { ok: "ok", falha: "**FALHA**", ausente: "ausente" };

function vazio(valor) {
  return valor === null || valor === undefined;
}

function formatarNumero(valor) {
  return vazio(valor) ? "—" : FORMATO_NUMERO.format(valor);
}

function formatarPercentual(valor) {
  return vazio(valor) ? "—" : `${FORMATO_NUMERO.format(valor)}%`;
}

function formatarDuracao(segundos) {
  return vazio(segundos) ? "—" : `${FORMATO_NUMERO.format(segundos)} s`;
}

function formatarData(iso) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

function alinhar(texto, largura, alinhamento) {
  return alinhamento === "direita" ? texto.padStart(largura) : texto.padEnd(largura);
}

function tracos(largura, alinhamento) {
  return alinhamento === "direita" ? `${"-".repeat(largura - 1)}:` : "-".repeat(largura);
}

// Escapa a barra invertida antes da barra vertical, para o conteúdo não quebrar a célula da tabela.
export function escaparCelulaMd(texto) {
  return texto.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

// Tabela com colunas alinhadas, no mesmo formato que o Prettier produz.
function tabelaMd(cabecalho, linhas, alinhamentos = []) {
  const celulas = [cabecalho, ...linhas].map((linha) => linha.map((texto) => escaparCelulaMd(String(texto))));
  const larguras = cabecalho.map((_, coluna) => Math.max(3, ...celulas.map((linha) => linha[coluna].length)));
  const montar = (linha) =>
    `| ${linha.map((texto, coluna) => alinhar(texto, larguras[coluna], alinhamentos[coluna])).join(" | ")} |`;
  const separador = `| ${larguras.map((largura, coluna) => tracos(largura, alinhamentos[coluna])).join(" | ")} |`;
  return [montar(celulas[0]), separador, ...celulas.slice(1).map(montar)].join("\n");
}

function avisoDeFalha(suites) {
  const nomes = suites.filter((suite) => suite.status === "falha").map((suite) => suite.nome);
  return nomes.length > 0 ? `> **FALHA** — suítes com falha: ${nomes.join(", ")}.` : null;
}

function identificacao(resumo) {
  const { so, node, docker } = resumo.ambiente;
  const arvore = resumo.arvoreSuja
    ? "**árvore suja** (havia alterações não commitadas; o resultado pode não corresponder ao commit)"
    : "limpa";
  return [
    `- Commit testado: \`${resumo.sha}\``,
    `- Branch: \`${resumo.branch}\``,
    `- Data: ${resumo.data} (${FUSO_HORARIO})`,
    `- Ambiente: ${so ?? "—"}; Node ${node ?? "—"}; Docker ${docker ?? "—"}`,
    `- Árvore de trabalho: ${arvore}`,
  ].join("\n");
}

function tabelaDeSuites(suites) {
  const linhas = suites.map((suite) => [
    suite.nome,
    formatarNumero(suite.testes),
    formatarNumero(suite.ok),
    formatarNumero(vazio(suite.falhas) ? null : suite.falhas + suite.erros),
    formatarNumero(suite.ignorados),
    formatarDuracao(suite.duracaoSegundos),
    TEXTO_DA_SITUACAO[suite.status],
  ]);
  const cabecalho = ["suíte", "testes", "ok", "falhas", "ignorados", "duração", "situação"];
  return tabelaMd(cabecalho, linhas, [, "direita", "direita", "direita", "direita", "direita"]);
}

function tabelaDeCobertura(cobertura) {
  const linhas = ["backend", "frontend"].map((pacote) => {
    const valores = cobertura[pacote] ?? {};
    return [
      pacote,
      ...["linhas", "instrucoes", "funcoes", "branches"].map((campo) => formatarPercentual(valores[campo])),
    ];
  });
  const cabecalho = ["pacote", "linhas", "instruções", "funções", "branches"];
  return tabelaMd(cabecalho, linhas, [, "direita", "direita", "direita", "direita"]);
}

function tabelaDeAuditoria(auditoria) {
  const campos = ["critica", "alta", "moderada", "baixa", "info", "total"];
  const linhas = ["backend", "frontend"].map((pacote) => [
    pacote,
    ...campos.map((campo) => formatarNumero(auditoria[pacote]?.[campo])),
  ]);
  const cabecalho = ["pacote", "crítica", "alta", "moderada", "baixa", "info", "total"];
  return tabelaMd(cabecalho, linhas, [, "direita", "direita", "direita", "direita", "direita", "direita"]);
}

function listaDeComandos(comandos) {
  if (comandos.length === 0) {
    return "Nenhum comando executado: os resultados foram consolidados de `tests/results/latest/`.";
  }
  return comandos
    .map(({ comando, codigoSaida }) => `- \`${comando}\` (código ${codigoSaida ?? "—"})`)
    .join("\n");
}

export function gerarResumoMd(resumo) {
  const partes = [
    `# Resultados dos testes — ${formatarData(resumo.data)}`,
    avisoDeFalha(resumo.suites),
    identificacao(resumo),
    "## Suítes",
    tabelaDeSuites(resumo.suites),
    "Na coluna falhas entram também os erros do JUnit. Traço indica suíte sem resultado.",
    "## Cobertura",
    tabelaDeCobertura(resumo.cobertura),
    "## npm audit (dependências de produção)",
    tabelaDeAuditoria(resumo.npmAudit),
    "## Comandos executados",
    listaDeComandos(resumo.comandos),
  ];
  return `${partes.filter(Boolean).join("\n\n")}\n`;
}

function celulaDaSuite(suite) {
  if (!suite || suite.status === "ausente") return "—";
  const rotulo = suite.status === "falha" ? "FALHA" : "ok";
  return vazio(suite.testes) ? rotulo : `${rotulo} ${suite.ok}/${suite.testes}`;
}

function situacaoNoHistorico(resumo) {
  const falhou = resumo.suites.some((suite) => suite.status === "falha");
  const texto = falhou ? "**FALHA**" : "ok";
  return resumo.arvoreSuja ? `${texto} (árvore suja)` : texto;
}

function maisRecentePrimeiro(a, b) {
  return Date.parse(b.data) - Date.parse(a.data) || nomeDaPasta(b).localeCompare(nomeDaPasta(a));
}

export function gerarHistoricoMd(resumos) {
  const linhas = [...resumos]
    .sort(maisRecentePrimeiro)
    .map((resumo) => [
      `[${formatarData(resumo.data)}](${resumo.pasta ?? nomeDaPasta(resumo)}/)`,
      `\`${resumo.sha7}\``,
      ...NOMES_DAS_SUITES.map((nome) => celulaDaSuite(resumo.suites.find((suite) => suite.nome === nome))),
      formatarPercentual(resumo.cobertura?.backend?.linhas),
      formatarPercentual(resumo.cobertura?.frontend?.linhas),
      situacaoNoHistorico(resumo),
    ]);
  const cabecalho = [
    "Data",
    "Commit",
    "Backend",
    "Frontend",
    "E2E",
    "Cobertura backend",
    "Cobertura frontend",
    "Situação",
  ];
  const partes = [
    "# Histórico dos resultados de testes",
    "Gerado por `npm run test:relatorio` a partir do `resumo.json` de cada pasta. Não edite à mão.",
    "Suítes no formato ok/testes; cobertura é o percentual de linhas. Detalhes no `RESUMO.md` de cada pasta.",
    linhas.length > 0 ? tabelaMd(cabecalho, linhas) : "Nenhum resultado registrado ainda.",
  ];
  return `${partes.join("\n\n")}\n`;
}
