import { screen } from "@testing-library/react";
import { http } from "msw";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Protegido } from "../../src/components/Protegido";
import { Login } from "../../src/pages/Login";
import { Painel } from "../../src/pages/Painel";
import { credenciaisValidas, usuarioAdmin } from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";

function renderizarLogin() {
  const resultado = renderizar(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protegido>
            <Painel />
          </Protegido>
        }
      />
    </Routes>,
    { initialEntries: ["/login"] }
  );

  async function preencherEEnviar(email: string, senha: string) {
    await resultado.usuario.type(screen.getByLabelText("E-mail"), email);
    await resultado.usuario.type(screen.getByLabelText("Senha"), senha);
    await resultado.usuario.click(screen.getByRole("button", { name: "Entrar" }));
  }

  return { ...resultado, preencherEEnviar };
}

describe("página de login", () => {
  // Na aplicação a tela de login fica em /login, e o interceptor de 401 consulta window.location.pathname.
  beforeEach(() => {
    window.history.replaceState(null, "", "/login");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("renderiza os campos de e-mail e senha", () => {
    renderizarLogin();

    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("com credenciais válidas, grava a sessão e leva ao painel", async () => {
    const { preencherEEnviar } = renderizarLogin();

    await preencherEEnviar(credenciaisValidas.email, credenciaisValidas.senha);

    expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBe(JSON.stringify(usuarioAdmin));
  });

  it("com resposta 401, mostra a mensagem 'E-mail ou senha inválidos' vinda do servidor", async () => {
    const { preencherEEnviar } = renderizarLogin();

    await preencherEEnviar(credenciaisValidas.email, "senha-errada");

    expect(await screen.findByText("E-mail ou senha inválidos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
  });

  it("desabilita o botão enquanto o envio está em andamento", async () => {
    let liberarResposta!: () => void;
    const respostaLiberada = new Promise<void>((resolve) => {
      liberarResposta = () => resolve();
    });
    // segura a requisição; ao ser liberada, sem resposta própria, o handler padrão de login responde
    server.use(
      http.post("*/api/auth/login", async () => {
        await respostaLiberada;
      })
    );
    const { preencherEEnviar } = renderizarLogin();

    await preencherEEnviar(credenciaisValidas.email, credenciaisValidas.senha);

    expect(await screen.findByRole("button", { name: "Entrando..." })).toBeDisabled();

    liberarResposta();

    expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument();
  });
});
