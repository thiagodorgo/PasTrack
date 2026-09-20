import { cnpjValido } from "../preparo/dados";
import { expect, test } from "../preparo/fixtures";

test.describe("cadastros", () => {
  test.use({ perfil: "ADMINISTRADOR" });

  test("cadastra um fabricante e recusa o nome repetido no próprio campo", async ({ page }) => {
    const nome = `Fabricante E2E ${Date.now()}`;

    await page.goto("/fabricantes");
    await page.getByRole("button", { name: "Novo fabricante" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("status")).toContainText(`Fabricante ${nome} cadastrado.`);
    await expect(page.getByRole("row", { name: new RegExp(nome) })).toBeVisible();

    await page.getByRole("button", { name: "Novo fabricante" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("alert")).toContainText("Já existe um fabricante com este nome");
  });

  test("cadastra um fornecedor com CNPJ e mostra com máscara", async ({ page }) => {
    const nome = `Fornecedor E2E ${Date.now()}`;
    const cnpj = cnpjValido();
    const comMascara = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;

    await page.goto("/fornecedores");
    await page.getByRole("button", { name: "Novo fornecedor" }).click();
    await page.getByLabel("Nome").fill(nome);
    // digitado sem pontuação, como quem copia da nota fiscal
    await page.getByLabel("CNPJ").fill(cnpj);
    await page.getByLabel("Contato").fill("compras@e2e.local");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("status")).toContainText(`Fornecedor ${nome} cadastrado.`);
    await expect(page.getByRole("row", { name: new RegExp(nome) })).toContainText(comMascara);
  });

  test("recusa o CNPJ inválido antes de chamar a API", async ({ page }) => {
    await page.goto("/fornecedores");
    await page.getByRole("button", { name: "Novo fornecedor" }).click();
    await page.getByLabel("Nome").fill("Fornecedor com documento errado");
    await page.getByLabel("CNPJ").fill("11.222.333/0001-00");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("alert")).toContainText("CNPJ inválido");
  });

  test("cria um usuário e mostra a senha temporária uma única vez", async ({ page }) => {
    const marca = Date.now();

    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Novo usuário" }).click();
    await page.getByLabel("Nome").fill("Convidado E2E");
    await page.getByLabel("E-mail").fill(`convidado.${marca}@pastrack.local`);
    await page.getByLabel("Perfil").selectOption("OPERADOR");
    await page.getByRole("button", { name: "Salvar" }).click();

    const aviso = page.getByRole("group", { name: /Senha temporária de Convidado E2E/ });
    await expect(aviso).toBeVisible();
    const senha = (await aviso.locator("code").textContent())?.trim() ?? "";
    expect(senha.length).toBeGreaterThanOrEqual(12);

    await aviso.getByRole("button", { name: "Fechar" }).click();
    await expect(page.getByText(senha)).toHaveCount(0);
  });
});
