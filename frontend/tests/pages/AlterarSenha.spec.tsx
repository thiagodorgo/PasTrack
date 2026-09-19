import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AlterarSenha } from "../../src/pages/AlterarSenha";
import { usuarioSalvo } from "../../src/services/auth";
import type { Usuario } from "../../src/types";
import {
  credenciaisTemporarias,
  credenciaisValidas,
  usuarioAdmin,
  usuarioComSenhaTemporaria,
} from "../mocks/handlers/auth";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { capturarCorpos } from "../utils/requisicoes";
import { iniciarSessao } from "../utils/sessao";

const SENHA_BOA = "Fresa2026retifica";

interface Preenchimento {
  atual?: string;
  nova?: string;
  confirmacao?: string;
}

function renderizarTroca(usuarioLogado: Usuario = usuarioAdmin) {
  iniciarSessao(usuarioLogado);
  const resultado = renderizar(
    <Routes>
      <Route path="/login" element={<p>Tela de login</p>} />
      <Route path="/" element={<p>Painel carregado</p>} />
      <Route path="/alterar-senha" element={<AlterarSenha />} />
    </Routes>,
    { initialEntries: ["/alterar-senha"] }
  );

  async function preencherEEnviar({ atual, nova, confirmacao }: Preenchimento) {
    if (atual) await resultado.usuario.type(screen.getByLabelText("Senha atual"), atual);
    if (nova) await resultado.usuario.type(screen.getByLabelText("Nova senha"), nova);
    if (confirmacao)
      await resultado.usuario.type(screen.getByLabelText("Confirme a nova senha"), confirmacao);
    await resultado.usuario.click(screen.getByRole("button", { name: "Salvar nova senha" }));
  }

  return { ...resultado, preencherEEnviar };
}

describe("página de alteração de senha", () => {
  it("mostra os três campos com o preenchimento automático adequado e a regra da nova senha", () => {
    renderizarTroca();

    expect(screen.getByRole("heading", { level: 1, name: "Alterar senha" })).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Confirme a nova senha")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription(
      "De 12 caracteres a 72 bytes, com pelo menos uma letra e um número."
    );
  });

  it("valida no cliente, liga cada erro ao seu campo e não envia nada", async () => {
    const enviadas = capturarCorpos("patch", "*/api/auth/senha");
    const { preencherEEnviar } = renderizarTroca();

    await preencherEEnviar({ nova: "curta1", confirmacao: "outra" });

    const senhaAtual = screen.getByLabelText("Senha atual");
    expect(senhaAtual).toHaveAttribute("aria-invalid", "true");
    expect(senhaAtual).toHaveAccessibleDescription("Informe a senha atual.");
    expect(senhaAtual).toHaveFocus();
    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription(/use pelo menos 12 caracteres/);
    expect(screen.getByLabelText("Confirme a nova senha")).toHaveAccessibleDescription(
      "A confirmação não é igual à nova senha."
    );
    expect(enviadas).toEqual([]);
  });

  it("exige letra e número na nova senha", async () => {
    const { preencherEEnviar } = renderizarTroca();

    await preencherEEnviar({
      atual: credenciaisValidas.senha,
      nova: "somenteletras",
      confirmacao: "somenteletras",
    });

    const novaSenha = screen.getByLabelText("Nova senha");
    expect(novaSenha).toHaveAccessibleDescription(/inclua pelo menos um número/);
    expect(novaSenha).toHaveFocus();
  });

  it("com a senha atual errada, mostra o erro no campo da senha atual", async () => {
    const { preencherEEnviar } = renderizarTroca();

    await preencherEEnviar({ atual: "senha-errada", nova: SENHA_BOA, confirmacao: SENHA_BOA });

    expect(await screen.findByText("Senha atual incorreta")).toBeInTheDocument();
    const senhaAtual = screen.getByLabelText("Senha atual");
    expect(senhaAtual).toHaveAccessibleDescription("Senha atual incorreta");
    expect(senhaAtual).toHaveFocus();
    expect(screen.getByRole("button", { name: "Salvar nova senha" })).toBeEnabled();
  });

  it("mostra na nova senha a regra recusada pelo servidor", async () => {
    const { preencherEEnviar } = renderizarTroca();

    await preencherEEnviar({
      atual: credenciaisValidas.senha,
      nova: "admin2026seguro",
      confirmacao: "admin2026seguro",
    });

    expect(await screen.findByText("não use o seu e-mail na senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription(/não use o seu e-mail na senha/);
  });

  it("um erro sem campo, como a falta de conexão, aparece como mensagem geral", async () => {
    server.use(http.patch("*/api/auth/senha", () => HttpResponse.error()));
    const { preencherEEnviar } = renderizarTroca();

    await preencherEEnviar({ atual: credenciaisValidas.senha, nova: SENHA_BOA, confirmacao: SENHA_BOA });

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
  });

  it("no sucesso, grava o token novo, libera a sessão e vai ao painel", async () => {
    server.use(http.patch("*/api/auth/senha", () => HttpResponse.json({ token: "token-depois-da-troca" })));
    const { preencherEEnviar } = renderizarTroca(usuarioComSenhaTemporaria);

    await preencherEEnviar({ atual: credenciaisTemporarias.senha, nova: SENHA_BOA, confirmacao: SENHA_BOA });

    expect(await screen.findByText("Painel carregado")).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).toBe("token-depois-da-troca");
    expect(usuarioSalvo()).toEqual({ ...usuarioComSenhaTemporaria, deveTrocarSenha: false });
  });

  it("na troca obrigatória, explica o motivo e oferece sair em vez de voltar", async () => {
    const { usuario } = renderizarTroca(usuarioComSenhaTemporaria);

    expect(screen.getByRole("status")).toHaveTextContent("senha temporária");
    expect(screen.queryByRole("link", { name: "Voltar ao painel" })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Sair" }));

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
    expect(localStorage.getItem("pastrack:token")).toBeNull();
  });

  it("na troca voluntária, oferece voltar ao painel", () => {
    renderizarTroca(usuarioAdmin);

    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("revelar as senhas digitadas", () => {
  it.each([
    ["Senha atual", "a senha atual"],
    ["Nova senha", "a nova senha"],
    ["Confirme a nova senha", "a confirmação"],
  ])("mostra e esconde %s", async (rotuloCampo, rotuloBotao) => {
    const { usuario } = renderizarTroca();
    const campo = await screen.findByLabelText(rotuloCampo);
    expect(campo).toHaveAttribute("type", "password");

    await usuario.click(screen.getByRole("button", { name: `Mostrar ${rotuloBotao}` }));
    expect(campo).toHaveAttribute("type", "text");

    await usuario.click(screen.getByRole("button", { name: `Ocultar ${rotuloBotao}` }));
    expect(campo).toHaveAttribute("type", "password");
  });
});
