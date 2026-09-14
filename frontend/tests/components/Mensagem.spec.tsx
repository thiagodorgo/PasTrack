import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mensagem } from "../../src/components/Mensagem";

describe("Mensagem", () => {
  it("o erro usa role=alert, anunciado na hora", () => {
    render(<Mensagem tipo="erro">Não foi possível salvar</Mensagem>);

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each(["sucesso", "info"] as const)("%s usa role=status com aria-live polite", (tipo) => {
    render(<Mensagem tipo={tipo}>Tudo certo</Mensagem>);

    const mensagem = screen.getByRole("status");
    expect(mensagem).toHaveTextContent("Tudo certo");
    expect(mensagem).toHaveAttribute("aria-live", "polite");
    expect(mensagem).toHaveClass(`mensagem-${tipo}`);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aceita um id, para ser ligada a um campo", () => {
    render(
      <Mensagem tipo="erro" id="quantidade-erro">
        Informe a quantidade
      </Mensagem>
    );

    expect(screen.getByRole("alert")).toHaveAttribute("id", "quantidade-erro");
  });
});
