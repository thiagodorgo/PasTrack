// Roda as suítes de teste, consolida tests/results/latest/ e grava o snapshot versionado em
// tests/results/<AAAA-MM-DD>_<sha7>/, regenerando tests/results/HISTORICO.md.
// Uso e protocolo: tests/results/README.md ou "npm run test:relatorio -- --ajuda".

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  caminhosAbsolutosRestantes,
  contarAuditoria,
  dataIsoNoFuso,
  filtrarArvoreSuja,
  gerarHistoricoMd,
  gerarResumoMd,
  interpretarArgumentos,
  lerCobertura,
  lerJUnit,
  lerPadroes,
  montarResumo,
  nomeDaPasta,
  sanitizar,
  termosProibidos,
} from "./lib/relatorio.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PASTA_RESULTADOS = path.join(RAIZ, "tests", "results");
const PASTA_LATEST = path.join(PASTA_RESULTADOS, "latest");
const NO_WINDOWS = process.platform === "win32";
const SAIDA_SEM_GRAVAR = 2;
const SAIDA_INTERROMPIDA = 130;
// 130 é o código do Ctrl+C em shells POSIX; 3221225786 (STATUS_CONTROL_C_EXIT) é o do Windows.
const CODIGOS_DE_INTERRUPCAO = new Set([130, 3221225786]);

const COMPOSE_TESTE = ["docker", "compose", "-f", "docker-compose.test.yml"];
const COMPOSE_E2E = ["docker", "compose", "-f", "docker-compose.yml", "-f", "docker-compose.e2e.yml"];

const PLANOS = {
  backend: {
    arquivosCompose: ["docker-compose.test.yml"],
    subir: [...COMPOSE_TESTE, "up", "-d", "--wait"],
    testar: ["npm", "run", "test:cov", "--prefix", "backend"],
    descer: [...COMPOSE_TESTE, "down", "-v"],
  },
  frontend: {
    arquivosCompose: [],
    testar: ["npm", "run", "test:cov", "--prefix", "frontend"],
  },
  e2e: {
    arquivosCompose: ["docker-compose.yml", "docker-compose.e2e.yml"],
    subir: [...COMPOSE_E2E, "up", "-d", "--build", "--wait"],
    testar: ["npm", "run", "e2e"],
    descer: [...COMPOSE_E2E, "down", "-v"],
  },
};

const AJUDA = `Uso: npm run test:relatorio -- [opções]

Roda as suítes de teste, consolida tests/results/latest/ e grava tests/results/<AAAA-MM-DD>_<sha7>/.

Opções:
  --suites=LISTA    suítes separadas por vírgula entre backend, frontend e e2e (padrão: backend,frontend).
                    Também define quais arquivos de latest/ entram no relatório.
  --sem-executar    não roda testes nem npm audit; só consolida o que já está em latest/
  --permitir-sujo   aceita árvore com alterações não commitadas (o resumo registra "árvore suja")
  --ajuda, -h       mostra esta ajuda

Códigos de saída:
  0    todas as suítes consideradas passaram
  1    alguma suíte falhou (o snapshot é gravado mesmo assim, marcado como FALHA)
  2    nada foi gravado (opção inválida, árvore suja ou sanitização reprovada)
  130  execução interrompida (nada foi gravado)`;

class Recusa extends Error {}
class Interrupcao extends Error {}

function avisar(mensagem) {
  console.warn(`relatório: ${mensagem}`);
}

function relativo(caminho) {
  return path.relative(RAIZ, caminho).split(path.sep).join("/");
}

// ---------------------------------------------------------------- processos

function rodar(tokens, { capturar = false } = {}) {
  const opcoes = {
    cwd: RAIZ,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: capturar ? ["ignore", "pipe", "pipe"] : "inherit",
  };
  // No Windows o npm é um arquivo .cmd, que só roda por meio do shell.
  if (NO_WINDOWS) return spawnSync(tokens.join(" "), { ...opcoes, shell: true });
  return spawnSync(tokens[0], tokens.slice(1), opcoes);
}

function executar(tokens, comandos) {
  const comando = tokens.join(" ");
  console.log(`\n> ${comando}`);
  const resultado = rodar(tokens);
  if (resultado.error) avisar(`não foi possível iniciar "${comando}": ${resultado.error.message}`);
  const codigoSaida = resultado.status ?? 1;
  comandos.push({ comando, codigoSaida });
  if (resultado.signal === "SIGINT" || CODIGOS_DE_INTERRUPCAO.has(resultado.status)) {
    throw new Interrupcao(comando);
  }
  return codigoSaida;
}

function git(...argumentos) {
  const resultado = spawnSync("git", argumentos, { cwd: RAIZ, encoding: "utf8" });
  if (resultado.status !== 0) {
    throw new Recusa(`git ${argumentos.join(" ")} falhou: ${(resultado.stderr ?? "").trim()}`);
  }
  return resultado.stdout;
}

// ---------------------------------------------------------------- suítes e auditoria

function limparSaidasDaSuite(nome) {
  for (const alvo of [`${nome}-junit.xml`, `${nome}-coverage`]) {
    rmSync(path.join(PASTA_LATEST, alvo), { recursive: true, force: true });
  }
}

// Sobe as dependências, roda os testes e sempre derruba os containers, mesmo em falha.
function executarSuite(nome) {
  const plano = PLANOS[nome];
  const comandos = [];
  limparSaidasDaSuite(nome);
  const ausentes = plano.arquivosCompose.filter((arquivo) => !existsSync(path.join(RAIZ, arquivo)));
  if (ausentes.length > 0) {
    avisar(`${nome}: arquivo não encontrado (${ausentes.join(", ")}); a suíte fica como falha`);
    return { codigoSaida: 1, comandos };
  }
  try {
    const codigoAoSubir = plano.subir ? executar(plano.subir, comandos) : 0;
    if (codigoAoSubir !== 0) return { codigoSaida: codigoAoSubir, comandos };
    return { codigoSaida: executar(plano.testar, comandos), comandos };
  } finally {
    if (plano.descer) executar(plano.descer, comandos);
  }
}

function auditar(pacote, comandos) {
  const tokens = ["npm", "audit", "--omit=dev", "--json", "--prefix", pacote];
  const resultado = rodar(tokens, { capturar: true });
  // O npm audit sai com 1 quando encontra vulnerabilidades; a contagem vem do JSON.
  comandos.push({ comando: tokens.join(" "), codigoSaida: resultado.status ?? 1 });
  const contagem = contarAuditoria(resultado.stdout ?? "");
  if (!contagem) avisar(`npm audit do ${pacote} não trouxe contagem (sem rede?)`);
  return contagem;
}

// ---------------------------------------------------------------- ambiente e padrões

function descreverSistema() {
  if (!NO_WINDOWS) return `${os.type()} ${os.release()} (${os.arch()})`;
  // O Windows 11 ainda se apresenta como "Windows 10" nessa API; o build 22000 em diante é o 11.
  const build = Number(os.release().split(".")[2]);
  const nome = build >= 22000 ? os.version().replace("Windows 10", "Windows 11") : os.version();
  return `${nome} (build ${os.release()}, ${os.arch()})`;
}

function versaoDoDocker() {
  const resultado = rodar(["docker", "--version"], { capturar: true });
  return /version ([^\s,]+)/.exec(resultado.stdout ?? "")?.[1] ?? "indisponível";
}

function carregarPadroes() {
  const arquivo = process.env.PASTRACK_PADROES || path.join(os.homedir(), ".pastrack-local", "padroes.txt");
  if (!existsSync(arquivo)) {
    avisar("arquivo de padrões não encontrado; a verificação de termos proibidos foi pulada");
    return null;
  }
  const padroes = lerPadroes(readFileSync(arquivo, "utf8"));
  if (!padroes.termos && !padroes.termosMaiusculas) {
    avisar("arquivo de padrões sem as chaves termos e termos-maiusculas; verificação pulada");
    return null;
  }
  return padroes;
}

// Raízes do repositório como aparecem nas ferramentas (caminho do script, do Git e o real).
function raizesDoRepositorio() {
  return [RAIZ, realpathSync.native(RAIZ), git("rev-parse", "--show-toplevel").trim()];
}

// ---------------------------------------------------------------- leitura de latest/

function lerSeExistir(caminho) {
  return existsSync(caminho) ? readFileSync(caminho, "utf8") : null;
}

// Lê um arquivo de latest/ com o leitor dado; guarda o conteúdo bruto para a cópia sanitizada.
function lerResultado(origem, nomeNoSnapshot, leitor, brutos) {
  const conteudo = lerSeExistir(path.join(PASTA_LATEST, origem));
  if (conteudo === null) return null;
  try {
    const dados = leitor(conteudo);
    brutos[nomeNoSnapshot] = conteudo;
    return dados;
  } catch (erro) {
    avisar(`${origem} ignorado: ${erro.message}`);
    return null;
  }
}

function coletarResultados(suites) {
  const brutos = {};
  const junits = {};
  const cobertura = {};
  for (const nome of suites) {
    junits[nome] = lerResultado(`${nome}-junit.xml`, `${nome}-junit.xml`, lerJUnit, brutos);
    if (nome === "e2e") continue;
    const origem = `${nome}-coverage/coverage-summary.json`;
    cobertura[nome] = lerResultado(origem, `${nome}-coverage-summary.json`, lerCobertura, brutos);
  }
  return { brutos, junits, cobertura };
}

// ---------------------------------------------------------------- snapshot

function normalizarFimDeLinha(texto) {
  const comLf = texto.replace(/\r\n/g, "\n");
  return comLf.endsWith("\n") ? comLf : `${comLf}\n`;
}

function prepararArquivos(brutos, resumo, raizes) {
  const arquivos = {};
  for (const [nome, conteudo] of Object.entries(brutos)) {
    arquivos[nome] = normalizarFimDeLinha(sanitizar(conteudo, raizes));
  }
  arquivos["resumo.json"] = `${JSON.stringify(resumo, null, 2)}\n`;
  arquivos["RESUMO.md"] = gerarResumoMd(resumo);
  return arquivos;
}

function problemasDoArquivo(nome, conteudo, padroes) {
  const problemas = caminhosAbsolutosRestantes(conteudo).map(
    (trecho) => `${nome}: caminho absoluto: ${trecho}`
  );
  for (const { numero, linha } of padroes ? termosProibidos(conteudo, padroes) : []) {
    problemas.push(`${nome}:${numero}: termo proibido: ${linha.trim().slice(0, 200)}`);
  }
  if (nome.endsWith(".json")) {
    try {
      JSON.parse(conteudo);
    } catch {
      problemas.push(`${nome}: JSON inválido depois da sanitização`);
    }
  }
  return problemas;
}

function lerResumosExistentes(pastaNova) {
  if (!existsSync(PASTA_RESULTADOS)) return [];
  const resumos = [];
  for (const entrada of readdirSync(PASTA_RESULTADOS, { withFileTypes: true })) {
    if (!entrada.isDirectory() || entrada.name === "latest" || entrada.name === pastaNova) continue;
    const conteudo = lerSeExistir(path.join(PASTA_RESULTADOS, entrada.name, "resumo.json"));
    if (conteudo === null) continue;
    try {
      resumos.push({ ...JSON.parse(conteudo), pasta: entrada.name });
    } catch {
      avisar(`${entrada.name}/resumo.json inválido; fica fora do histórico`);
    }
  }
  return resumos;
}

function gravar(pasta, arquivos, historico) {
  const destino = path.join(PASTA_RESULTADOS, pasta);
  if (existsSync(destino)) {
    avisar(`substituindo ${relativo(destino)}/`);
    rmSync(destino, { recursive: true, force: true });
  }
  mkdirSync(destino, { recursive: true });
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(path.join(destino, nome), conteudo);
  writeFileSync(path.join(PASTA_RESULTADOS, "HISTORICO.md"), historico);
  return destino;
}

// ---------------------------------------------------------------- fluxo principal

function verificarArvore(permitirSujo) {
  const sujas = filtrarArvoreSuja(git("status", "--porcelain"));
  if (sujas.length > 0 && !permitirSujo) {
    throw new Recusa(`árvore suja; faça commit das alterações ou use --permitir-sujo:\n${sujas.join("\n")}`);
  }
  if (sujas.length > 0) avisar("árvore suja: o resumo vai registrar isso");
  return sujas.length > 0;
}

function executarTudo(suites) {
  // Mantém o processo vivo no Ctrl+C para que os containers sejam derrubados.
  process.on("SIGINT", () => {});
  const comandos = [];
  const codigos = {};
  for (const nome of suites) {
    const execucao = executarSuite(nome);
    codigos[nome] = execucao.codigoSaida;
    comandos.push(...execucao.comandos);
  }
  const npmAudit = { backend: auditar("backend", comandos), frontend: auditar("frontend", comandos) };
  return { comandos, codigos, npmAudit };
}

// Erros de entrada (opção inválida, padrão inválido) viram recusa com mensagem curta, sem pilha.
function comoRecusa(funcao, complemento = "") {
  try {
    return funcao();
  } catch (erro) {
    throw new Recusa(`${erro.message}${complemento}`);
  }
}

function principal() {
  const opcoes = comoRecusa(() => interpretarArgumentos(process.argv.slice(2)), " (veja --ajuda)");
  if (opcoes.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  const arvoreSuja = verificarArvore(opcoes.permitirSujo);
  const padroes = comoRecusa(carregarPadroes);
  const data = dataIsoNoFuso(new Date());
  const sha = git("rev-parse", "HEAD").trim();
  const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim();

  let execucao = { comandos: [], codigos: {}, npmAudit: {} };
  if (opcoes.semExecutar) {
    avisar("--sem-executar: os arquivos de latest/ serão atribuídos ao commit atual; confira se vieram dele");
  } else {
    execucao = executarTudo(opcoes.suites);
  }

  const { brutos, junits, cobertura } = coletarResultados(opcoes.suites);
  const resumo = montarResumo({
    data,
    sha,
    branch,
    arvoreSuja,
    ambiente: { so: descreverSistema(), node: process.version, docker: versaoDoDocker() },
    suites: opcoes.suites.map((nome) => ({
      nome,
      executada: nome in execucao.codigos,
      codigoSaida: execucao.codigos[nome] ?? null,
      junit: junits[nome],
    })),
    cobertura,
    npmAudit: execucao.npmAudit,
    comandos: execucao.comandos,
  });

  const pasta = nomeDaPasta(resumo);
  const arquivos = prepararArquivos(brutos, resumo, raizesDoRepositorio());
  const historico = gerarHistoricoMd([...lerResumosExistentes(pasta), { ...resumo, pasta }]);
  const problemas = Object.entries({ ...arquivos, "HISTORICO.md": historico }).flatMap(([nome, conteudo]) =>
    problemasDoArquivo(nome, conteudo, padroes)
  );
  if (problemas.length > 0) {
    throw new Recusa(
      `sanitização reprovada; nada foi gravado:\n${problemas.map((p) => `  ${p}`).join("\n")}`
    );
  }

  const destino = gravar(pasta, arquivos, historico);
  const situacao = resumo.situacao === "falha" ? "FALHA" : "ok";
  console.log(`\nrelatório: snapshot gravado em ${relativo(destino)}/ (situação: ${situacao})`);
  console.log("relatório: histórico atualizado em tests/results/HISTORICO.md");
  return resumo.situacao === "falha" ? 1 : 0;
}

try {
  process.exitCode = principal();
} catch (erro) {
  if (erro instanceof Interrupcao) {
    avisar(`interrompido durante "${erro.message}"; nada foi gravado`);
    process.exitCode = SAIDA_INTERROMPIDA;
  } else {
    console.error(`relatório: ${erro instanceof Recusa ? erro.message : erro.stack}`);
    process.exitCode = SAIDA_SEM_GRAVAR;
  }
}
