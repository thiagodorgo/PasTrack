import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Protegido } from "../../src/components/Protegido";
import type { Acao } from "../../src/utils/permissoes";
import { usuarioAdmin, usuarioComSenhaTemporaria, usuarioOperador } from "../mocks/handlers/auth";
import { criarTokenExpirado } from "../utils/jwt";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

function TelaDeLogin() {
  const { state } = useLocation();
  const motivo = (state as { motivo?: string } | null)?.motivo;
  return <p>{motivo ? `Tela de login: ${motivo}` : "Tela de login"}</p>;
}

function renderizarRotaProtegida({ acao, inicial = "/" }: { acao?: Acao; inicial?: string } = {}) {
  return renderizar(
    <Routes>
      <Route path="/login" element={<TelaDeLogin />} />
      <Route path="/sem-permissao" element={<p>Tela de sem permissão</p>} />
      <Route
        path="/alterar-senha"
        element={
          <Protegido>
            <p>Tela de troca de senha</p>
          </Protegido>
        }
      />
      <Route
        path="/"
        element={
          <Protegido acao={acao}>
            <p>Conteúdo protegido</p>
          </Protegido>
        }
      />
    </Routes>,
    { initialEntries: [inicial] }
  );
}

describe("Protegido", () => {
  it("sem token, redireciona para /login", async () => {
    renderizarRotaProtegida();

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("com token, renderiza o conteúdo", () => {
    iniciarSessao();

    renderizarRotaProtegida();

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument();
  });

  // antes registrado como pendência: bastava existir um token, mesmo vencido
  it("com token JWT expirado, redireciona para /login avisando que a sessão expirou", async () => {
    iniciarSessao(usuarioAdmin, criarTokenExpirado(usuarioAdmin));

    renderizarRotaProtegida();

    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(await screen.findByText("Tela de login: sessao-expirada")).toBeInTheDocument();
  });

  it("com o usuário gravado ilegível, redireciona para /login sem quebrar a tela", async () => {
    iniciarSessao();
    localStorage.setItem("pastrack:usuario", "{json inválido");

    renderizarRotaProtegida();

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("com a troca de senha pendente, redireciona para /alterar-senha", async () => {
    iniciarSessao(usuarioComSenhaTemporaria);

    renderizarRotaProtegida();

    expect(await screen.findByText("Tela de troca de senha")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("com a troca de senha pendente, já em /alterar-senha, renderiza a tela sem redirecionar", () => {
    iniciarSessao(usuarioComSenhaTemporaria);

    renderizarRotaProtegida({ inicial: "/alterar-senha" });

    expect(screen.getByText("Tela de troca de senha")).toBeInTheDocument();
  });

  it("com um perfil sem permissão para a ação, redireciona para /sem-permissao", async () => {
    iniciarSessao(usuarioOperador);

    renderizarRotaProtegida({ acao: "gerenciarUsuarios" });

    expect(await screen.findByText("Tela de sem permissão")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("com um perfil que pode executar a ação, renderiza o conteúdo", () => {
    iniciarSessao(usuarioAdmin);

    renderizarRotaProtegida({ acao: "gerenciarUsuarios" });

    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});
