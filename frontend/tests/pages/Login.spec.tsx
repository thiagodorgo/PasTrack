import { screen } from "@testing-library/react";
import { http } from "msw";
import { type InitialEntry, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Protegido } from "../../src/components/Protegido";
import { Login } from "../../src/pages/Login";
import { Painel } from "../../src/pages/Painel";
import { usuarioSalvo } from "../../src/services/auth";
import { credenciaisTemporarias, credenciaisValidas, usuarioAdmin } from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";

function renderizarLogin(entrada: InitialEntry = "/login") {
  const resultado = renderizar(
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/alterar-senha" element={<p>Tela de troca de senha</p>} />
      <Route
        path="/"
        element={
          <Protegido>
            <Painel />
          </Protegido>
        }
      />
    </Routes>,
    { initialEntries: [entrada] }
  );

  async function preencherEEnviar(email: string, senha: string) {
    await resultado.usuario.type(screen.getByLabelText("E-mail"), email);
    await resultado.usuario.type(screen.getByLabelText("Senha"), senha);
    await resultado.usuario.click(screen.getByRole("button", { name: "Entrar" }));
  }

  return { ...resultado, preencherEEnviar };
}

describe("página de login", () => {
  it("renderiza o título e os campos com o preenchimento automático adequado", () => {
    renderizarLogin();

    expect(screen.getByRole("heading", { level: 1, name: "PasTrack" })).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("com credenciais válidas, grava a sessão e leva ao painel", async () => {
    const { preencherEEnviar } = renderizarLogin();

    await preencherEEnviar(credenciaisValidas.email, credenciaisValidas.senha);

    expect(await screen.findByRole("heading", { name: "Painel" })).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBe(JSON.stringify(usuarioAdmin));
  });

  it("com a senha temporária, leva à troca de senha em vez do painel", async () => {
    const { preencherEEnviar } = renderizarLogin();

    await preencherEEnviar(credenciaisTemporarias.email, credenciaisTemporarias.senha);

    expect(await screen.findByText("Tela de troca de senha")).toBeInTheDocument();
    expect(usuarioSalvo()?.deveTrocarSenha).toBe(true);
  });

  it("com resposta 401, mostra a mensagem 'E-mail ou senha inválidos' vinda do servidor", async () => {
    const { preencherEEnviar } = renderizarLogin();

    await preencherEEnviar(credenciaisValidas.email, "senha-errada");

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos");
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

  it("avisa que a sessão expirou quando chega do encerramento da sessão", () => {
    renderizarLogin({ pathname: "/login", state: { motivo: "sessao-expirada" } });

    expect(screen.getByRole("status")).toHaveTextContent("Sua sessão expirou");
  });

  it("sem motivo, não mostra o aviso de sessão expirada", () => {
    renderizarLogin();

    expect(screen.queryByText(/Sua sessão expirou/)).not.toBeInTheDocument();
  });
});

describe("revelar a senha no login", () => {
  it("mostra e esconde a senha digitada", async () => {
    const { usuario } = renderizar(<Login />, { initialEntries: ["/login"] });
    const campo = screen.getByLabelText("Senha");
    await usuario.type(campo, "SenhaForte123");
    expect(campo).toHaveAttribute("type", "password");

    const botao = screen.getByRole("button", { name: "Mostrar a senha" });
    expect(botao).toHaveAttribute("aria-pressed", "false");
    await usuario.click(botao);

    expect(campo).toHaveAttribute("type", "text");
    const ocultar = screen.getByRole("button", { name: "Ocultar a senha" });
    expect(ocultar).toHaveAttribute("aria-pressed", "true");

    await usuario.click(ocultar);
    expect(campo).toHaveAttribute("type", "password");
  });
});
