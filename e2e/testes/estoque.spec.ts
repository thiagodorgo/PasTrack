import { BASE_URL } from "../playwright.config";
import { expect, test } from "../preparo/fixtures";
import { CONTAS, entrarPelaApi, SENHA_ADMIN } from "../preparo/sessao";

/** Cria uma pastilha própria do caso, para o saldo não depender da ordem dos testes. */
async function criarPastilha(codigo: string, estoqueMinimo: number) {
  const { token } = await entrarPelaApi(BASE_URL, CONTAS.ADMINISTRADOR, SENHA_ADMIN);
  const cabecalho = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const fabricantes = await (await fetch(`${BASE_URL}/api/fabricantes`, { headers: cabecalho })).json();
  const resposta = await fetch(`${BASE_URL}/api/pastilhas`, {
    method: "POST",
    headers: cabecalho,
    body: JSON.stringify({
      codigo,
      descricao: `Pastilha do caso ${codigo}`,
      estoqueMinimo,
      fabricanteId: fabricantes[0].id,
    }),
  });
  if (!resposta.ok) throw new Error(`não criou a pastilha: ${await resposta.text()}`);
  return (await resposta.json()) as { id: number; codigo: string };
}

test.describe("ciclo do estoque", () => {
  test.use({ perfil: "OPERADOR" });

  test("a entrada muda o saldo mostrado na tela", async ({ page }) => {
    const pastilha = await criarPastilha(`E2E-ENTRADA-${Date.now()}`, 0);

    await page.goto("/movimentacoes");
    await page.getByLabel("Tipo").selectOption("ENTRADA");
    await page.getByLabel("Pastilha").selectOption(String(pastilha.id));
    await page.getByLabel("Quantidade").fill("7");
    await page.getByLabel("Fornecedor").selectOption({ index: 1 });
    await page.getByLabel("Documento (NF, OS...)").fill("NF-E2E");
    await page.getByRole("button", { name: /Registrar/ }).click();

    await expect(page.getByRole("status")).toContainText("Saldo atual do item: 7");

    await page.goto("/pastilhas");
    const linha = page.getByRole("row", { name: new RegExp(pastilha.codigo) });
    await expect(linha).toContainText("7 un");
    // mínimo zero desliga o controle de reposição
    await expect(linha).toContainText("Sem mínimo");
  });

  test("a saída acima do saldo é recusada com a quantidade disponível", async ({ page }) => {
    const pastilha = await criarPastilha(`E2E-SALDO-${Date.now()}`, 0);

    await page.goto("/movimentacoes");
    await page.getByLabel("Tipo").selectOption("SAIDA");
    await page.getByLabel("Pastilha").selectOption(String(pastilha.id));
    await page.getByLabel("Quantidade").fill("5");
    await page.getByRole("button", { name: /Registrar/ }).click();

    await expect(page.getByRole("alert")).toContainText("Saldo insuficiente");
    await expect(page.getByRole("alert")).toContainText("0 un");
  });

  test("a reposição acima do mínimo resolve o alerta sozinha", async ({ page }) => {
    const pastilha = await criarPastilha(`E2E-ALERTA-${Date.now()}`, 3);

    // a pastilha nasce com saldo zero e mínimo 3, então já está em alerta
    await page.goto("/alertas");
    await expect(page.getByRole("row", { name: new RegExp(pastilha.codigo) })).toContainText("Aberto");

    await page.goto("/movimentacoes");
    await page.getByLabel("Tipo").selectOption("ENTRADA");
    await page.getByLabel("Pastilha").selectOption(String(pastilha.id));
    await page.getByLabel("Quantidade").fill("10");
    await page.getByLabel("Fornecedor").selectOption({ index: 1 });
    await page.getByRole("button", { name: /Registrar/ }).click();
    await expect(page.getByRole("status")).toContainText("Saldo atual do item: 10");

    await page.goto("/alertas");
    await expect(page.getByRole("row", { name: new RegExp(pastilha.codigo) })).toHaveCount(0);

    await page.getByRole("button", { name: "Resolvidos" }).click();
    await expect(page.getByRole("row", { name: new RegExp(pastilha.codigo) })).toContainText(
      "automaticamente pela reposição"
    );
  });
});
