import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Protegido } from "../../src/components/Protegido";
import { renderizar } from "../utils/renderizar";
import { iniciarSessao } from "../utils/sessao";

function renderizarRotaProtegida() {
  return renderizar(
    <Routes>
      <Route path="/login" element={<p>Tela de login</p>} />
      <Route
        path="/"
        element={
          <Protegido>
            <p>Conteúdo protegido</p>
          </Protegido>
        }
      />
    </Routes>,
    { initialEntries: ["/"] }
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
});
