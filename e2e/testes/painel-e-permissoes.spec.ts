import { expect, test } from "../preparo/fixtures";
import type { Perfil } from "../preparo/sessao";

const PERFIS: Perfil[] = ["ADMINISTRADOR", "GESTOR", "OPERADOR", "COMPRADOR"];

for (const perfil of PERFIS) {
  test.describe(`painel do ${perfil}`, () => {
    test.use({ perfil });

    test("carrega com os números do estoque", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("heading", { name: "Painel", level: 1 })).toBeVisible();
      await expect(page.getByText("Pastilhas cadastradas")).toBeVisible();
      await expect(page.getByText("Alertas de reposição abertos")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Últimas movimentações" })).toBeVisible();
    });
  });
}

test.describe("limites do operador", () => {
  test.use({ perfil: "OPERADOR" });

  test("não vê o item de usuários no menu", async ({ page }) => {
    await page.goto("/");

    const menu = page.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link", { name: "Pastilhas" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  });

  test("abrindo /usuarios direto, cai na tela de acesso negado", async ({ page }) => {
    await page.goto("/usuarios");

    await expect(page.getByRole("heading", { name: "Acesso não permitido", level: 1 })).toBeVisible();
  });

  test("não vê o botão de cadastrar pastilha", async ({ page }) => {
    await page.goto("/pastilhas");

    await expect(page.getByRole("table", { name: "Pastilhas cadastradas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova pastilha" })).toHaveCount(0);
  });
});

test.describe("limites do comprador", () => {
  test.use({ perfil: "COMPRADOR" });

  test("só tem entrada no campo Tipo", async ({ page }) => {
    await page.goto("/movimentacoes");

    const tipo = page.getByLabel("Tipo");
    await expect(tipo).toBeVisible();
    await expect(tipo.locator("option")).toHaveText(["Entrada"]);
  });
});
