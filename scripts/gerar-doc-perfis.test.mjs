import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { executar, extrairPermissoes, gerarDocumento } from "./gerar-doc-perfis.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fonte = readFileSync(path.join(raiz, "backend/src/config/permissoes.ts"), "utf8");

test("lê as ações sem executar o arquivo TypeScript", () => {
  const regras = extrairPermissoes(`process.exit(99);\n${fonte}`);
  assert.equal(regras.size, 8);
  assert.deepEqual(regras.get("gerenciarUsuarios"), ["ADMINISTRADOR"]);
  assert.deepEqual(regras.get("registrarEntrada"), ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"]);
});

test("monta uma linha por ação e marca os quatro perfis", () => {
  const documento = gerarDocumento(fonte);
  const linhas = documento.split("\n").filter((linha) => linha.startsWith("| `"));
  assert.equal(linhas.length, 8);
  assert.match(documento, /\| `gerenciarUsuarios`\s+\| ✔\s+\| —\s+\| —\s+\| —\s+\|/);
  assert.match(documento, /\| `registrarSaida`\s+\| ✔\s+\| ✔\s+\| ✔\s+\| —\s+\|/);
  assert.match(documento, /Resolve alertas de estoque manualmente\./);
});

test("recusa ação sem descrição e perfil desconhecido", () => {
  assert.throws(
    () => gerarDocumento(fonte.replace("  consultar:", '  novaAcao: ["GESTOR"],\n  consultar:')),
    /ações de PERMISSOES/
  );
  assert.throws(
    () => extrairPermissoes(fonte.replace('consultar: ["ADMINISTRADOR"', 'consultar: ["VISITANTE"')),
    /Perfil inválido/
  );
});

test("verificação recusa arquivo ausente ou desatualizado e aceita o conteúdo correto", () => {
  const pasta = mkdtempSync(path.join(os.tmpdir(), "pastrack-perfis-"));
  try {
    const origem = path.join(pasta, "permissoes.ts");
    const destino = path.join(pasta, "perfis.md");
    writeFileSync(origem, fonte);
    assert.throws(() => executar({ verificar: true, origem, destino }), /desatualizado/);
    executar({ origem, destino });
    assert.equal(readFileSync(destino, "utf8"), gerarDocumento(fonte));
    assert.doesNotThrow(() => executar({ verificar: true, origem, destino }));
    writeFileSync(destino, "versão antiga\n");
    assert.throws(() => executar({ verificar: true, origem, destino }), /desatualizado/);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});
