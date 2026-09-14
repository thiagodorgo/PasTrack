import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SePerfil } from "../../src/components/SePerfil";
import { usuarioComprador, usuarioGestor, usuarioOperador } from "../mocks/handlers/auth";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

function renderizarBotaoDeCadastro() {
  return renderizar(
    <SePerfil acao="gerenciarPastilhas">
      <button type="button">Nova pastilha</button>
    </SePerfil>
  );
}

describe("SePerfil", () => {
  it("mostra o conteúdo a quem pode executar a ação", () => {
    iniciarSessao(usuarioGestor);

    renderizarBotaoDeCadastro();

    expect(screen.getByRole("button", { name: "Nova pastilha" })).toBeInTheDocument();
  });

  it("esconde o conteúdo de quem não pode", () => {
    iniciarSessao(usuarioOperador);

    renderizarBotaoDeCadastro();

    expect(screen.queryByRole("button", { name: "Nova pastilha" })).not.toBeInTheDocument();
  });

  it("sem sessão, esconde o conteúdo", () => {
    renderizarBotaoDeCadastro();

    expect(screen.queryByRole("button", { name: "Nova pastilha" })).not.toBeInTheDocument();
  });

  it("mostra a alternativa a quem não pode, quando informada", () => {
    iniciarSessao(usuarioComprador);

    renderizar(
      <SePerfil acao="registrarSaida" senao={<p>O seu perfil registra só entradas.</p>}>
        <p>Registrar saída</p>
      </SePerfil>
    );

    expect(screen.getByText("O seu perfil registra só entradas.")).toBeInTheDocument();
    expect(screen.queryByText("Registrar saída")).not.toBeInTheDocument();
  });
});
