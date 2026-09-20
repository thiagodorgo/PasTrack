import { expect, test } from "../preparo/fixtures";
import { CONTAS, SENHA_DEMO } from "../preparo/sessao";

test.describe("login", () => {
  test("entra com credenciais válidas e chega ao painel", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill(CONTAS.GESTOR);
    await page.getByLabel("Senha").fill(SENHA_DEMO);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("heading", { name: "Painel", level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Menu principal" })).toBeVisible();
  });

  test("recusa a senha errada sem dizer se o e-mail existe", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("E-mail").fill(CONTAS.GESTOR);
    await page.getByLabel("Senha").fill("SenhaQueNaoExiste2026");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toContainText("E-mail ou senha inválidos");
    await expect(page).toHaveURL(/\/login/);
  });

  test("mostra e esconde a senha digitada", async ({ page }) => {
    await page.goto("/login");
    const campo = page.getByLabel("Senha");
    await campo.fill(SENHA_DEMO);

    await expect(campo).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar a senha" }).click();
    await expect(campo).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar a senha" }).click();
    await expect(campo).toHaveAttribute("type", "password");
  });

  test("quem não entrou é levado ao login", async ({ page }) => {
    await page.goto("/pastilhas");

    await expect(page).toHaveURL(/\/login/);
  });
});
