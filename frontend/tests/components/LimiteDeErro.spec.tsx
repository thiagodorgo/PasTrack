import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LimiteDeErro } from "../../src/components/LimiteDeErro";
import { silenciarErrosDeRenderizacao } from "../utils/console";

// controla, de fora, se o componente abaixo do limite lança na próxima renderização
let deveFalhar = true;

function ComponenteInstavel() {
  if (deveFalhar) throw new Error("falha na renderização");
  return <p>Conteúdo recuperado</p>;
}

function renderizarLimite() {
  return render(
    <LimiteDeErro>
      <ComponenteInstavel />
    </LimiteDeErro>
  );
}

describe("LimiteDeErro", () => {
  beforeEach(() => {
    deveFalhar = true;
  });

  it("sem erro, só renderiza o conteúdo", () => {
    deveFalhar = false;

    renderizarLimite();

    expect(screen.getByText("Conteúdo recuperado")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra uma mensagem amigável quando um componente falha", () => {
    silenciarErrosDeRenderizacao();

    renderizarLimite();

    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent("Algo deu errado nesta tela");
    expect(aviso).not.toHaveTextContent("falha na renderização");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("registra o erro no console para diagnóstico", () => {
    silenciarErrosDeRenderizacao();

    renderizarLimite();

    const chamadas = vi.mocked(console.error).mock.calls;
    expect(chamadas.some(([mensagem]) => mensagem === "Erro não tratado na interface")).toBe(true);
  });

  it("tentar de novo renderiza o conteúdo outra vez", async () => {
    silenciarErrosDeRenderizacao();
    const usuario = userEvent.setup();
    renderizarLimite();

    deveFalhar = false;
    await usuario.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(screen.getByText("Conteúdo recuperado")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
