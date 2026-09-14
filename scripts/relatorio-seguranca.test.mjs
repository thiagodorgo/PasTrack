import assert from "node:assert/strict";
import { test } from "node:test";
import { escaparCelulaMd, lerJUnit } from "./lib/relatorio.mjs";

test("lerJUnit ignora testsuite escondido num comentário montado por aninhamento", () => {
  const xml =
    '<testsuites><!<!-- x -->-- <testsuite tests="99" failures="0"/> -->' +
    '<testsuite tests="2" failures="0" errors="0" skipped="0" time="1"/></testsuites>';
  assert.equal(lerJUnit(xml).testes, 2);
});

test("escaparCelulaMd escapa a barra invertida antes da barra vertical", () => {
  assert.equal(escaparCelulaMd("a|b"), "a\\|b");
  assert.equal(escaparCelulaMd("c:\\pasta"), "c:\\\\pasta");
  assert.equal(escaparCelulaMd("x\\|y"), "x\\\\\\|y");
});
