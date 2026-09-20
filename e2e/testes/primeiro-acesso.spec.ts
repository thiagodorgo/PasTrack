import { BASE_URL } from "../playwright.config";
import { expect, test } from "../preparo/fixtures";
import { arquivoDaSessao, CONTAS, entrarPelaApi, SENHA_ADMIN } from "../preparo/sessao";
import { readFileSync } from "node:fs";

/** Cria um usuário pela API, como administrador, e devolve o e-mail e a senha temporária. */
async function criarUsuario(nome: string, email: string) {
  const { token } = await entrarPelaApi(BASE_URL, CONTAS.ADMINISTRADOR, SENHA_ADMIN);
  const resposta = await fetch(`${BASE_URL}/api/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nome, email, perfil: "OPERADOR" }),
  });
  if (!resposta.ok) throw new Error(`não criou o usuário: ${await resposta.text()}`);
  const criado = (await resposta.json()) as { senhaTemporaria: string };
  return { email, senha: criado.senhaTemporaria };
}

test.describe("primeiro acesso", () => {
  test("a senha temporária leva à troca obrigatória antes de qualquer tela", async ({ page }) => {
    const marca = Date.now();
    const conta = await criarUsuario("Primeiro Acesso", `primeiro.acesso.${marca}@pastrack.local`);

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(conta.email);
    await page.getByLabel("Senha").fill(conta.senha);
    await page.getByRole("button", { name: "Entrar" }).click();

    // não entra no sistema: cai direto na troca de senha
    await expect(page.getByRole("heading", { name: "Alterar senha", level: 1 })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("senha temporária");

    const definitiva = `PrimeiroAcesso${marca}`;
    await page.getByLabel("Senha atual").fill(conta.senha);
    await page.getByLabel("Nova senha", { exact: true }).fill(definitiva);
    await page.getByLabel("Confirme a nova senha").fill(definitiva);
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(page.getByRole("heading", { name: "Painel", level: 1 })).toBeVisible();
  });

  test("a senha nova precisa seguir a política", async ({ page }) => {
    const marca = Date.now();
    const conta = await criarUsuario("Senha Fraca", `senha.fraca.${marca}@pastrack.local`);

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(conta.email);
    await page.getByLabel("Senha").fill(conta.senha);
    await page.getByRole("button", { name: "Entrar" }).click();

    await page.getByLabel("Senha atual").fill(conta.senha);
    await page.getByLabel("Nova senha", { exact: true }).fill("curta1");
    await page.getByLabel("Confirme a nova senha").fill("curta1");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();

    await expect(page.getByText("use pelo menos 12 caracteres")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alterar senha", level: 1 })).toBeVisible();
  });

  test("a sessão gravada do administrador já passou pela troca", async () => {
    const estado = JSON.parse(readFileSync(arquivoDaSessao("ADMINISTRADOR"), "utf8")) as {
      origins: { localStorage: { name: string; value: string }[] }[];
    };
    const usuario = estado.origins[0].localStorage.find((item) => item.name === "pastrack:usuario");

    expect(usuario).toBeDefined();
    expect(JSON.parse(usuario!.value).deveTrocarSenha).toBe(false);
  });
});
