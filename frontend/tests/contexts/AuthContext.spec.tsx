import { act, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../src/contexts/AuthContext";
import { api, EVENTO_SESSAO_EXPIRADA, EVENTO_TROCA_SENHA_OBRIGATORIA } from "../../src/services/api";
import { usuarioSalvo } from "../../src/services/auth";
import { usuarioAdmin, usuarioGestor } from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { silenciarErrosDeRenderizacao } from "../utils/console";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

function TelaDeLogin() {
  const { state } = useLocation();
  const motivo = (state as { motivo?: string } | null)?.motivo;
  return <p>{motivo ? `Tela de login: ${motivo}` : "Tela de login"}</p>;
}

function TelaDaSessao() {
  const { usuario, pode, sair, atualizarSessao } = useAuth();
  return (
    <>
      <p>Sessão de {usuario?.nome ?? "ninguém"}</p>
      <p>{pode("gerenciarUsuarios") ? "Gerencia usuários" : "Não gerencia usuários"}</p>
      <button type="button" onClick={() => sair()}>
        Sair
      </button>
      <button type="button" onClick={() => atualizarSessao("token-novo", usuarioGestor)}>
        Atualizar sessão
      </button>
      <button type="button" onClick={() => api.get("/pastilhas").catch(() => undefined)}>
        Consultar
      </button>
    </>
  );
}

function SemProvedor() {
  useAuth();
  return null;
}

function renderizarSessao() {
  return renderizar(
    <Routes>
      <Route path="/login" element={<TelaDeLogin />} />
      <Route path="/alterar-senha" element={<p>Tela de troca de senha</p>} />
      <Route path="/" element={<TelaDaSessao />} />
    </Routes>
  );
}

describe("AuthContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("o evento de sessão expirada limpa a sessão e leva ao login com o motivo, sem recarregar a página", async () => {
    iniciarSessao();
    // objeto no lugar de window.location: qualquer navegação forçada ou recarga ficaria registrada aqui
    const localizacao = {
      origin: "http://localhost:3000",
      pathname: "/",
      href: "http://localhost:3000/",
      reload: vi.fn(),
      assign: vi.fn(),
      replace: vi.fn(),
    };
    vi.stubGlobal("location", localizacao);
    renderizarSessao();
    expect(screen.getByText("Sessão de Administrador")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    });

    expect(await screen.findByText("Tela de login: sessao-expirada")).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
    expect(localStorage.getItem("pastrack:usuario")).toBeNull();
    expect(localizacao.href).toBe("http://localhost:3000/");
    expect(localizacao.reload).not.toHaveBeenCalled();
    expect(localizacao.assign).not.toHaveBeenCalled();
    expect(localizacao.replace).not.toHaveBeenCalled();
  });

  it("um 401 da API leva ao login pelo roteador", async () => {
    iniciarSessao();
    server.use(
      http.get("*/api/pastilhas", () =>
        HttpResponse.json({ erro: "Token inválido ou expirado" }, { status: 401 })
      )
    );
    const { usuario } = renderizarSessao();

    await usuario.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("Tela de login: sessao-expirada")).toBeInTheDocument();
    expect(usuarioSalvo()).toBeNull();
  });

  it("o evento de troca obrigatória leva a /alterar-senha e marca a sessão", async () => {
    iniciarSessao();
    renderizarSessao();

    act(() => {
      window.dispatchEvent(new Event(EVENTO_TROCA_SENHA_OBRIGATORIA));
    });

    expect(await screen.findByText("Tela de troca de senha")).toBeInTheDocument();
    expect(usuarioSalvo()?.deveTrocarSenha).toBe(true);
    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
  });

  it("sair encerra a sessão e leva ao login sem motivo", async () => {
    iniciarSessao();
    const { usuario } = renderizarSessao();

    await usuario.click(screen.getByRole("button", { name: "Sair" }));

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
  });

  it("atualizarSessao grava o token e o usuário novos", async () => {
    iniciarSessao();
    const { usuario } = renderizarSessao();

    await usuario.click(screen.getByRole("button", { name: "Atualizar sessão" }));

    expect(await screen.findByText("Sessão de Maria Souza")).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).toBe("token-novo");
    expect(usuarioSalvo()).toEqual(usuarioGestor);
  });

  it.each([
    ["ADMINISTRADOR", usuarioAdmin, "Gerencia usuários"],
    ["GESTOR", usuarioGestor, "Não gerencia usuários"],
  ])("pode segue o perfil do usuário logado: %s", (_perfil, usuarioLogado, esperado) => {
    iniciarSessao(usuarioLogado);

    renderizarSessao();

    expect(screen.getByText(esperado)).toBeInTheDocument();
  });

  it("sem sessão, não há usuário e nada é permitido", () => {
    renderizarSessao();

    expect(screen.getByText("Sessão de ninguém")).toBeInTheDocument();
    expect(screen.getByText("Não gerencia usuários")).toBeInTheDocument();
  });

  it("depois de desmontado, deixa de ouvir os eventos", () => {
    iniciarSessao();
    const { unmount } = renderizarSessao();

    unmount();
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));

    expect(localStorage.getItem("pastrack:token")).not.toBeNull();
  });

  it("useAuth fora do AuthProvider lança um erro claro", () => {
    silenciarErrosDeRenderizacao();

    expect(() => render(<SemProvedor />)).toThrow("useAuth deve ser usado dentro de AuthProvider");
  });
});
