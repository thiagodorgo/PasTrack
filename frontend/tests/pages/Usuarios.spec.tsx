import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { Usuarios } from "../../src/pages/Usuarios";
import { usuarioAdmin } from "../mocks/handlers/auth";
import { SENHA_TEMPORARIA, usuariosGerenciados } from "../mocks/handlers/usuarios";
import { server } from "../mocks/server";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

async function renderizarUsuarios() {
  const resultado = renderizar(<Usuarios />, { initialEntries: ["/usuarios"] });
  await screen.findByRole("table", { name: "Usuários cadastrados" });
  return resultado;
}

function linhas() {
  // a primeira linha é o cabeçalho
  return within(screen.getByRole("table", { name: "Usuários cadastrados" }))
    .getAllByRole("row")
    .slice(1);
}

const inativo = usuariosGerenciados.find((usuario) => !usuario.ativo)!;
const outroAtivo = usuariosGerenciados.find((usuario) => usuario.ativo && usuario.id !== usuarioAdmin.id)!;

describe("página de usuários", () => {
  it("lista os usuários com perfil e situação", async () => {
    iniciarSessao(usuarioAdmin);

    await renderizarUsuarios();

    expect(linhas()).toHaveLength(usuariosGerenciados.length);
    expect(screen.getByRole("row", { name: new RegExp(inativo.nome) })).toHaveTextContent("Inativo");
    expect(screen.getByRole("row", { name: new RegExp(usuarioAdmin.nome) })).toHaveTextContent("Ativo");
  });

  it("marca quem está logado na própria linha", async () => {
    iniciarSessao(usuarioAdmin);

    await renderizarUsuarios();

    expect(screen.getByRole("row", { name: new RegExp(usuarioAdmin.nome) })).toHaveTextContent("(você)");
  });

  it("cadastra um usuário e mostra a senha temporária uma vez", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: "Novo usuário" }));
    await usuario.type(screen.getByLabelText("Nome"), "Joana Prado");
    await usuario.type(screen.getByLabelText("E-mail"), "joana@pastrack.com");
    await usuario.selectOptions(screen.getByLabelText("Perfil"), "GESTOR");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    const aviso = await screen.findByRole("group", { name: /Senha temporária de Joana Prado/ });
    expect(aviso).toHaveTextContent(SENHA_TEMPORARIA);
    expect(aviso).toHaveFocus();
    await waitFor(() => expect(linhas()).toHaveLength(usuariosGerenciados.length + 1));
    expect(screen.getByRole("row", { name: /Joana Prado/ })).toHaveTextContent("Gestor");

    await usuario.click(within(aviso).getByRole("button", { name: "Fechar" }));
    expect(screen.queryByText(SENHA_TEMPORARIA)).not.toBeInTheDocument();
  });

  it("mostra no campo o e-mail já cadastrado", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: "Novo usuário" }));
    await usuario.type(screen.getByLabelText("Nome"), "Outro nome");
    await usuario.type(screen.getByLabelText("E-mail"), usuarioAdmin.email);
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um usuário com este e-mail");
    expect(linhas()).toHaveLength(usuariosGerenciados.length);
  });

  it("recusa o nome curto sem chamar a API", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: "Novo usuário" }));
    await usuario.type(screen.getByLabelText("Nome"), "A");
    await usuario.type(screen.getByLabelText("E-mail"), "a@pastrack.com");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Informe o nome, com pelo menos 2 caracteres."
    );
  });

  it("edita o nome e o perfil, sem deixar mudar o e-mail", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: `Editar ${outroAtivo.nome}` }));
    const formulario = screen.getByRole("form", { name: `Editar ${outroAtivo.nome}` });
    expect(screen.getByLabelText("Nome")).toHaveValue(outroAtivo.nome);
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
    expect(within(formulario).getByText(new RegExp(outroAtivo.email))).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Nome"));
    await usuario.type(screen.getByLabelText("Nome"), "Nome Atualizado");
    await usuario.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Usuário Nome Atualizado atualizado.");
  });

  it("desativa com confirmação e reativa direto", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: `Desativar ${outroAtivo.nome}` }));
    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    expect(confirmar).toHaveFocus();
    await usuario.click(confirmar);

    expect(await screen.findByRole("status")).toHaveTextContent(`Usuário ${outroAtivo.nome} desativado.`);
    await waitFor(() =>
      expect(screen.getByRole("row", { name: new RegExp(outroAtivo.nome) })).toHaveTextContent("Inativo")
    );

    await usuario.click(screen.getByRole("button", { name: `Reativar ${outroAtivo.nome}` }));
    expect(await screen.findByRole("status")).toHaveTextContent(`Usuário ${outroAtivo.nome} reativado.`);
  });

  it("cancelar a desativação não muda nada", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: `Desativar ${outroAtivo.nome}` }));
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: new RegExp(outroAtivo.nome) })).toHaveTextContent("Ativo");
  });

  it("mostra a mensagem da API ao tentar desativar a si mesmo", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: `Desativar ${usuarioAdmin.nome}` }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Você não pode desativar a si mesmo");
  });

  it("redefine a senha com confirmação e mostra a senha nova", async () => {
    iniciarSessao(usuarioAdmin);
    const { usuario } = await renderizarUsuarios();

    await usuario.click(screen.getByRole("button", { name: `Redefinir a senha de ${outroAtivo.nome}` }));
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    const aviso = await screen.findByRole("group", {
      name: new RegExp(`Senha temporária de ${outroAtivo.nome}`),
    });
    expect(aviso).toHaveTextContent(SENHA_TEMPORARIA);
    expect(await screen.findByRole("status")).toHaveTextContent(`Senha de ${outroAtivo.nome} redefinida.`);
  });

  it("mostra o erro quando a lista não carrega", async () => {
    server.use(
      http.get("*/api/usuarios", () =>
        HttpResponse.json({ erro: "Erro interno no servidor" }, { status: 500 })
      )
    );
    iniciarSessao(usuarioAdmin);

    renderizar(<Usuarios />, { initialEntries: ["/usuarios"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("Erro interno no servidor");
  });
});
