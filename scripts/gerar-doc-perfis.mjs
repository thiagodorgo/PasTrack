import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEM = path.join(RAIZ, "backend/src/config/permissoes.ts");
const DESTINO = path.join(RAIZ, "docs/perfis-e-permissoes.md");

const PERFIS = ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"];
const DESCRICOES = {
  consultar: "Consulta os dados do sistema.",
  gerenciarPastilhas: "Cria e atualiza cadastros de pastilhas.",
  gerenciarFabricantes: "Cria e atualiza cadastros de fabricantes.",
  gerenciarFornecedores: "Cria e atualiza cadastros de fornecedores.",
  registrarEntrada: "Registra entradas no estoque.",
  registrarSaida: "Registra saídas do estoque.",
  resolverAlerta: "Resolve alertas de estoque manualmente.",
  gerenciarUsuarios: "Gerencia os cadastros e o acesso dos usuários.",
};

/** Lê somente os tokens do objeto literal. O código TypeScript nunca é executado. */
export function extrairPermissoes(fonte) {
  const atribuicao = /export\s+const\s+PERMISSOES\s*=\s*\{/.exec(fonte);
  if (!atribuicao) throw new Error("Objeto PERMISSOES não encontrado.");
  let posicao = atribuicao.index + atribuicao[0].length;

  function proximo() {
    while (posicao < fonte.length) {
      if (/\s/.test(fonte[posicao])) {
        posicao++;
      } else if (fonte.startsWith("//", posicao)) {
        const fim = fonte.indexOf("\n", posicao);
        posicao = fim < 0 ? fonte.length : fim + 1;
      } else if (fonte.startsWith("/*", posicao)) {
        const fim = fonte.indexOf("*/", posicao + 2);
        if (fim < 0) throw new Error("Comentário sem fechamento em PERMISSOES.");
        posicao = fim + 2;
      } else {
        break;
      }
    }
    if (posicao >= fonte.length) throw new Error("Objeto PERMISSOES incompleto.");
    const atual = fonte[posicao];
    if ("{}[]:,".includes(atual)) {
      posicao++;
      return { tipo: atual, valor: atual };
    }
    if (atual === '"') {
      const inicio = posicao++;
      while (posicao < fonte.length) {
        if (fonte[posicao] === "\\") {
          posicao += 2;
        } else if (fonte[posicao++] === '"') {
          return { tipo: "texto", valor: JSON.parse(fonte.slice(inicio, posicao)) };
        }
      }
      throw new Error("Texto sem fechamento em PERMISSOES.");
    }
    const nome = /^[A-Za-z_$][\w$]*/.exec(fonte.slice(posicao));
    if (nome) {
      posicao += nome[0].length;
      return { tipo: "nome", valor: nome[0] };
    }
    throw new Error(`Token inesperado em PERMISSOES na posição ${posicao}.`);
  }

  function exigir(tipo) {
    const token = proximo();
    if (token.tipo !== tipo) throw new Error(`Esperado ${tipo} em PERMISSOES.`);
    return token.valor;
  }

  const permissoes = new Map();
  let token = proximo();
  while (token.tipo !== "}") {
    if (token.tipo !== "nome") throw new Error("Ação inválida em PERMISSOES.");
    const acao = token.valor;
    if (permissoes.has(acao)) throw new Error(`Ação repetida: ${acao}.`);
    exigir(":");
    exigir("[");
    const perfis = [];
    token = proximo();
    while (token.tipo !== "]") {
      if (token.tipo !== "texto" || !PERFIS.includes(token.valor)) {
        throw new Error(`Perfil inválido na ação ${acao}.`);
      }
      if (perfis.includes(token.valor)) throw new Error(`Perfil repetido na ação ${acao}.`);
      perfis.push(token.valor);
      token = proximo();
      if (token.tipo === ",") token = proximo();
      else if (token.tipo !== "]") throw new Error(`Lista inválida na ação ${acao}.`);
    }
    permissoes.set(acao, perfis);
    token = proximo();
    if (token.tipo === ",") token = proximo();
    else if (token.tipo !== "}") throw new Error(`Separador inválido após ${acao}.`);
  }
  return permissoes;
}

export function gerarDocumento(fonte) {
  const permissoes = extrairPermissoes(fonte);
  const acoes = Object.keys(DESCRICOES);
  if (permissoes.size !== acoes.length || acoes.some((acao) => !permissoes.has(acao))) {
    throw new Error("As ações de PERMISSOES e suas descrições estão diferentes.");
  }
  const cabecalho = ["Ação", ...PERFIS, "Descrição"];
  const dados = acoes.map((acao) => [
    "`" + acao + "`",
    ...PERFIS.map((perfil) => (permissoes.get(acao).includes(perfil) ? "✔" : "—")),
    DESCRICOES[acao],
  ]);
  const larguras = cabecalho.map((titulo, indice) =>
    Math.max(3, titulo.length, ...dados.map((colunas) => colunas[indice].length))
  );
  const linha = (colunas) =>
    "| " + colunas.map((valor, indice) => valor.padEnd(larguras[indice])).join(" | ") + " |";
  const linhas = [
    "# Perfis e permissões",
    "",
    "Esta tabela reflete o objeto PERMISSOES em [config/permissoes.ts](../backend/src/config/permissoes.ts).",
    "",
    linha(cabecalho),
    linha(larguras.map((largura) => "-".repeat(largura))),
    ...dados.map(linha),
    "",
  ];
  return linhas.join("\n");
}

export function executar({ verificar = false, origem = ORIGEM, destino = DESTINO } = {}) {
  const documento = gerarDocumento(readFileSync(origem, "utf8"));
  if (verificar) {
    let atual;
    try {
      atual = readFileSync(destino, "utf8");
    } catch (erro) {
      if (erro.code !== "ENOENT") throw erro;
    }
    if (atual !== documento) {
      throw new Error(`Documento desatualizado: ${destino}. Rode npm run docs:perfis.`);
    }
    return;
  }
  writeFileSync(destino, documento);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== "--verificar")) {
      throw new Error("Uso: node scripts/gerar-doc-perfis.mjs [--verificar]");
    }
    executar({ verificar: process.argv[2] === "--verificar" });
    console.log(
      process.argv[2] === "--verificar" ? "Documento de perfis atualizado." : "Documento de perfis gerado."
    );
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  }
}
