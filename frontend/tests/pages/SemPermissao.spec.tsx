import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SemPermissao } from "../../src/pages/SemPermissao";
import { renderizar } from "../utils/renderizar";

describe("página sem permissão", () => {
  it("explica a recusa e mostra o caminho de volta ao painel", () => {
    renderizar(<SemPermissao />);

    expect(screen.getByRole("heading", { level: 1, name: "Acesso não permitido" })).toBeInTheDocument();
    expect(screen.getByText(/O seu perfil não tem permissão/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao painel" })).toHaveAttribute("href", "/");
  });
});
