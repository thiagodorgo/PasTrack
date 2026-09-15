import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NaoEncontrado } from "../../src/pages/NaoEncontrado";
import { renderizar } from "../utils/renderizar";

describe("página não encontrada", () => {
  it("mostra o título e o caminho de volta ao painel", () => {
    renderizar(<NaoEncontrado />);

    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute("href", "/");
  });
});
