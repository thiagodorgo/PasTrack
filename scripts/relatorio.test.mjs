import { describe, test } from "node:test";
import assert from "node:assert/strict";

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
  sanitizar,
  termosProibidos,
} from "./lib/relatorio.mjs";

// Saídas reais do Vitest 4 e do Playwright 1.63, reduzidas e com dados fictícios.
const JUNIT_VITEST = `<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests" tests="4" failures="1" errors="0" time="0.0151061">
    <testsuite name="src/outro.test.ts" timestamp="2026-09-14T11:44:40.399Z" hostname="MAQUINA-01" tests="1" failures="0" errors="0" skipped="0" time="0.00504">
        <testcase classname="src/outro.test.ts" name="outro arquivo" time="0.0027135">
        </testcase>
    </testsuite>
    <testsuite name="src/soma.test.ts" timestamp="2026-09-14T11:44:40.401Z" hostname="MAQUINA-01" tests="3" failures="1" errors="0" skipped="1" time="0.0100661">
        <testcase classname="src/soma.test.ts" name="soma &gt; falha de propósito" time="0.0061135">
            <failure message="expected 2 to be 3 // Object.is equality" type="AssertionError">
AssertionError: expected 2 to be 3
 ❯ src/soma.test.ts:5:57
            </failure>
        </testcase>
        <testcase classname="src/soma.test.ts" name="soma &gt; ignorado" time="0">
            <skipped/>
        </testcase>
    </testsuite>
</testsuites>`;

const SUITES_PLAYWRIGHT = `<testsuite name="login.spec.ts" timestamp="2026-09-14T11:44:44.992Z" hostname="chromium" tests="3" failures="1" skipped="1" time="0.014" errors="0">
<testcase name="falha" classname="login.spec.ts" time="0.005">
<system-out>
<![CDATA[
saída do console com <testsuite tests="99" failures="99"> que não deve contar
]]>
</system-out>
<failure message="expect(received).toBe(expected)" type="expect.toBe">
<![CDATA[    at C:\\Users\\fulano\\projetos\\PasTrack\\e2e\\tests\\login.spec.ts:3:39]]>
</failure>
</testcase>
</testsuite>`;

const JUNIT_PLAYWRIGHT = `<testsuites id="" name="" tests="3" failures="1" skipped="1" errors="0" time="0.9747520000000002">
${SUITES_PLAYWRIGHT}
</testsuites>`;

describe("lerJUnit", () => {
  test("Vitest com <testsuites>: usa os totais da raiz e soma os ignorados das suítes", () => {
    assert.deepEqual(lerJUnit(JUNIT_VITEST), {
      testes: 4,
      falhas: 1,
      erros: 0,
      ignorados: 1,
      duracaoSegundos: 0.015,
    });
  });

  test("sem <testsuites>: soma as suítes, com atributos em qualquer ordem e aspas simples", () => {
    const xml = `<testsuite skipped='2' tests='5' name='a' failures='0' time='1.5' errors='1'></testsuite>
<testsuite name="b" tests="3" failures="2" errors="0" skipped="0" time="0.25"/>`;
    assert.deepEqual(lerJUnit(xml), { testes: 8, falhas: 2, erros: 1, ignorados: 2, duracaoSegundos: 1.75 });
  });

  test("Playwright com <testsuites>: a raiz prevalece e o CDATA é ignorado", () => {
    assert.deepEqual(lerJUnit(JUNIT_PLAYWRIGHT), {
      testes: 3,
      falhas: 1,
      erros: 0,
      ignorados: 1,
      duracaoSegundos: 0.975,
    });
  });

  test("Playwright sem <testsuites>: soma as suítes", () => {
    assert.deepEqual(lerJUnit(SUITES_PLAYWRIGHT), {
      testes: 3,
      falhas: 1,
      erros: 0,
      ignorados: 1,
      duracaoSegundos: 0.014,
    });
  });

  test("recusa XML sem suítes", () => {
    assert.throws(() => lerJUnit("<html></html>"), /sem <testsuites>/);
  });
});

describe("sanitizar", () => {
  const raizWindows = String.raw`C:\Users\fulano\projetos\PasTrack`;

  test("converte as formas Windows em caminho relativo", () => {
    const casos = [
      [
        String.raw`at C:\Users\fulano\projetos\PasTrack\backend\src\app.ts:10:5`,
        String.raw`at backend\src\app.ts:10:5`,
      ],
      ["c:/Users/fulano/projetos/PasTrack/frontend/src/App.tsx", "frontend/src/App.tsx"],
      ["/c/Users/fulano/projetos/PasTrack/e2e/login.spec.ts", "e2e/login.spec.ts"],
      ["file:///C:/Users/fulano/projetos/PasTrack/backend/src/a.ts", "backend/src/a.ts"],
      [String.raw`C:\users\FULANO\Projetos\pastrack\backend`, "backend"],
      [String.raw`C:/Users\fulano/projetos\PasTrack/backend`, "backend"],
      [String.raw`cwd: C:\Users\fulano\projetos\PasTrack`, "cwd: ."],
    ];
    for (const [entrada, esperado] of casos) {
      assert.equal(sanitizar(entrada, [raizWindows]), esperado, entrada);
    }
  });

  test("mantém o JSON válido com barras invertidas escapadas", () => {
    const json = JSON.stringify({ [String.raw`C:\Users\fulano\projetos\PasTrack\backend\src\a.ts`]: 1 });
    assert.deepEqual(JSON.parse(sanitizar(json, [raizWindows])), { [String.raw`backend\src\a.ts`]: 1 });
  });

  test("não confunde a raiz com uma pasta vizinha de nome parecido", () => {
    const texto = String.raw`C:\Users\fulano\projetos\PasTrack-wt\x.ts`;
    assert.equal(sanitizar(texto, [raizWindows]), texto);
  });

  test("converte caminhos POSIX", () => {
    const texto = "at /home/fulano/pastrack/backend/src/a.ts:3:1 (/home/fulano/pastrack)";
    assert.equal(sanitizar(texto, ["/home/fulano/pastrack"]), "at backend/src/a.ts:3:1 (.)");
  });

  test("remove o atributo hostname", () => {
    const xml = `<testsuite name="a" hostname="MAQUINA-01" tests="1"><testsuite hostname='outra' tests="2">`;
    assert.equal(sanitizar(xml, []), `<testsuite name="a" tests="1"><testsuite tests="2">`);
  });
});

describe("caminhosAbsolutosRestantes", () => {
  test("encontra caminhos de usuário em Windows, Git Bash e POSIX", () => {
    const texto = [
      String.raw`em C:\Users\fulano\AppData\cache.js:1`,
      String.raw`"d:\\home\\fulano\\x"`,
      "/c/Users/fulano/x.ts",
      "/home/fulano/.npm/a",
      "/Users/fulana/Library/b",
    ].join("\n");
    assert.deepEqual(caminhosAbsolutosRestantes(texto), [
      String.raw`C:\Users\fulano\AppData\cache.js:1`,
      String.raw`d:\\home\\fulano\\x`,
      "/c/Users/fulano/x.ts",
      "/home/fulano/.npm/a",
      "/Users/fulana/Library/b",
    ]);
  });

  test("não acusa caminhos relativos, URLs nem rotas da API", () => {
    const texto = String.raw`backend\src\app.ts https://home.exemplo.com/x /api/usuarios/1 D:\dados\x.txt`;
    assert.deepEqual(caminhosAbsolutosRestantes(texto), []);
  });
});

describe("termosProibidos", () => {
  const PADROES =
    "# padrões de exemplo\ntermos: proibid[oa]|\\<vetado\\>\r\ntermos-maiusculas: \\bXPTO\\b\r\n";

  test("usa termos sem diferenciar maiúsculas e termos-maiusculas diferenciando", () => {
    const texto =
      "linha limpa\nisto é PROIBIDO aqui\nxpto minúsculo passa\nXPTO maiúsculo não passa\nvetados passa";
    assert.deepEqual(termosProibidos(texto, PADROES), [
      { numero: 2, linha: "isto é PROIBIDO aqui" },
      { numero: 4, linha: "XPTO maiúsculo não passa" },
    ]);
  });

  test("aceita os padrões já interpretados e classes POSIX", () => {
    const padroes = lerPadroes("termos: [[:digit:]]{3}-proibida\n");
    assert.deepEqual(termosProibidos("a\n123-proibida", padroes), [{ numero: 2, linha: "123-proibida" }]);
    assert.equal(padroes.termosMaiusculas, null);
  });

  test("sem padrões não acusa nada e padrão inválido é recusado", () => {
    assert.deepEqual(termosProibidos("proibido", "outra-chave: x"), []);
    assert.throws(() => lerPadroes("termos: (sem-fechar"), /termos/);
  });
});

describe("lerCobertura e contarAuditoria", () => {
  test("lê os percentuais do total e troca 'Unknown' por null", () => {
    const json = JSON.stringify({
      total: {
        lines: { total: 2, covered: 1, skipped: 0, pct: 50 },
        statements: { total: 2, covered: 1, skipped: 0, pct: 50 },
        functions: { total: 0, covered: 0, skipped: 0, pct: "Unknown" },
        branches: { total: 4, covered: 3, skipped: 0, pct: 75 },
      },
      [String.raw`C:\Users\fulano\projetos\PasTrack\backend\src\a.ts`]: {},
    });
    assert.deepEqual(lerCobertura(json), { linhas: 50, instrucoes: 50, funcoes: null, branches: 75 });
  });

  test("conta vulnerabilidades por severidade", () => {
    const saida = {
      metadata: { vulnerabilities: { info: 0, low: 1, moderate: 2, high: 0, critical: 0, total: 3 } },
    };
    assert.deepEqual(contarAuditoria(JSON.stringify(saida)), {
      critica: 0,
      alta: 0,
      moderada: 2,
      baixa: 1,
      info: 0,
      total: 3,
    });
    assert.equal(contarAuditoria('{"error":{"code":"ENOTFOUND"}}'), null);
    assert.equal(contarAuditoria("não é json"), null);
  });
});

describe("apoio da linha de comando", () => {
  test("data local em America/Sao_Paulo, inclusive perto da meia-noite", () => {
    assert.equal(dataIsoNoFuso(new Date("2026-09-14T11:34:12.345Z")), "2026-09-14T08:34:12-03:00");
    assert.equal(dataIsoNoFuso(new Date("2026-09-15T02:00:00Z")), "2026-09-14T23:00:00-03:00");
  });

  test("interpreta as opções", () => {
    assert.deepEqual(interpretarArgumentos([]), {
      semExecutar: false,
      permitirSujo: false,
      ajuda: false,
      suites: ["backend", "frontend"],
    });
    const opcoes = interpretarArgumentos(["--sem-executar", "--permitir-sujo", "--suites=e2e,backend,e2e"]);
    assert.deepEqual(opcoes.suites, ["backend", "e2e"]);
    assert.equal(opcoes.semExecutar && opcoes.permitirSujo, true);
    assert.throws(() => interpretarArgumentos(["--suites=mobile"]), /mobile/);
    assert.throws(() => interpretarArgumentos(["--rapido"]), /--rapido/);
  });

  test("árvore suja ignora tests/results/latest", () => {
    const saida = " M package.json\n?? tests/results/latest/\n?? tests/results/2026-09-14_0123456/\r\n";
    assert.deepEqual(filtrarArvoreSuja(saida), [" M package.json", "?? tests/results/2026-09-14_0123456/"]);
  });
});

function dadosDeExemplo(alteracoes = {}) {
  return {
    data: "2026-09-14T08:34:12-03:00",
    sha: "0123456789abcdef0123456789abcdef01234567",
    branch: "main",
    arvoreSuja: false,
    ambiente: { so: "Windows 11 Pro (build 10.0.22631, x64)", node: "v20.19.5", docker: "29.6.1" },
    suites: [
      {
        nome: "backend",
        executada: true,
        codigoSaida: 0,
        junit: { testes: 10, falhas: 0, erros: 0, ignorados: 1, duracaoSegundos: 3.25 },
      },
      {
        nome: "frontend",
        executada: true,
        codigoSaida: 1,
        junit: { testes: 5, falhas: 2, erros: 0, ignorados: 0, duracaoSegundos: 1.5 },
      },
    ],
    cobertura: { backend: { linhas: 87.5, instrucoes: 86, funcoes: 90, branches: 75.25 }, frontend: null },
    npmAudit: { backend: { critica: 0, alta: 1, moderada: 0, baixa: 0, info: 0, total: 1 }, frontend: null },
    comandos: [{ comando: "npm run test:cov --prefix backend", codigoSaida: 0 }],
    ...alteracoes,
  };
}

describe("montarResumo", () => {
  test("monta as três suítes com status e contagens", () => {
    const resumo = montarResumo(dadosDeExemplo());
    assert.equal(resumo.sha7, "0123456");
    assert.equal(resumo.situacao, "falha");
    assert.deepEqual(
      resumo.suites.map(({ nome, executada, status, ok }) => [nome, executada, status, ok]),
      [
        ["backend", true, "ok", 9],
        ["frontend", true, "falha", 3],
        ["e2e", false, "ausente", null],
      ]
    );
  });

  test("código de saída diferente de zero é falha mesmo sem JUnit ou com JUnit limpo", () => {
    const junitLimpo = { testes: 2, falhas: 0, erros: 0, ignorados: 0, duracaoSegundos: 1 };
    const resumo = montarResumo(
      dadosDeExemplo({
        suites: [
          { nome: "backend", executada: true, codigoSaida: 1, junit: null },
          { nome: "frontend", executada: true, codigoSaida: 1, junit: junitLimpo },
          { nome: "e2e", executada: false, codigoSaida: null, junit: junitLimpo },
        ],
      })
    );
    assert.deepEqual(
      resumo.suites.map((suite) => suite.status),
      ["falha", "falha", "ok"]
    );
  });
});

describe("gerarResumoMd", () => {
  test("destaca a falha e traz commit, ambiente, tabelas e comandos", () => {
    const md = gerarResumoMd(montarResumo(dadosDeExemplo()));
    assert.match(md, /^# Resultados dos testes — 2026-09-14 08:34\n/);
    assert.match(md, /^> \*\*FALHA\*\*.*frontend/m);
    assert.match(md, /`0123456789abcdef0123456789abcdef01234567`/);
    assert.match(md, /Branch: `main`/);
    assert.match(md, /Node v20\.19\.5/);
    assert.match(md, /\| suíte +\| testes \| +ok \| falhas \| ignorados \| duração \| situação +\|/);
    assert.match(md, /\| backend +\| +10 \| +9 \| +0 \| +1 \| +3,25 s \| ok +\|/);
    assert.match(md, /\| frontend +\| .*\| \*\*FALHA\*\* \|/);
    assert.match(md, /\| backend +\| +87,5% \|/);
    assert.match(md, /- `npm run test:cov --prefix backend` \(código 0\)/);
  });

  test("sem falha não há aviso e a árvore suja é registrada", () => {
    const dados = dadosDeExemplo({ arvoreSuja: true, suites: dadosDeExemplo().suites.slice(0, 1) });
    const md = gerarResumoMd(montarResumo(dados));
    assert.doesNotMatch(md, /FALHA/);
    assert.match(md, /árvore suja/);
  });
});

describe("gerarHistoricoMd", () => {
  test("lista da mais recente para a mais antiga com link para a pasta", () => {
    const antigo = montarResumo(
      dadosDeExemplo({
        data: "2026-09-01T10:00:00-03:00",
        sha: "abcdef0123456789abcdef0123456789abcdef01",
        suites: dadosDeExemplo().suites.slice(0, 1),
      })
    );
    const recente = montarResumo(dadosDeExemplo());
    const md = gerarHistoricoMd([antigo, recente]);
    const linhas = md.split("\n").filter((linha) => linha.startsWith("| ["));
    assert.equal(linhas.length, 2);
    assert.match(linhas[0], /^\| \[2026-09-14 08:34\]\(2026-09-14_0123456\/\) \| `0123456` \|/);
    assert.match(linhas[0], /\| ok 9\/10 +\| FALHA 3\/5 +\| — +\| 87,5% +\| — +\| \*\*FALHA\*\* \|$/);
    assert.match(linhas[1], /2026-09-01_abcdef0\/.*\| ok +\|$/);
    assert.match(md, /\| Data +\| Commit +\| Backend +\| Frontend +\| E2E +\| Cobertura backend/);
  });

  test("histórico vazio", () => {
    assert.match(gerarHistoricoMd([]), /Nenhum resultado registrado/);
  });
});
