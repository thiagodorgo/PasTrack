import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Protegido } from "../src/components/Protegido";
import { usuarioSalvo } from "../src/services/auth";
import { usuarioAdmin } from "./mocks/handlers/auth";
import { agoraEmSegundos, criarTokenExpirado, lerPayload } from "./utils/jwt";
import { renderizar } from "./utils/renderizar";
import { iniciarSessao } from "./utils/sessao";

// Defeitos conhecidos, registrados com it.fails: cada teste descreve o comportamento correto e hoje falha.
// Quando o defeito for corrigido, o it.fails passa a acusar erro; troque por it e o teste vira um teste normal.
describe("pendências conhecidas", () => {
  it("o token expirado usado nas pendências é um JWT bem formado com exp no passado", () => {
    const payload = lerPayload(criarTokenExpirado(usuarioAdmin));

    expect(payload.exp).toBeTypeOf("number");
    expect(payload.exp).toBeLessThan(agoraEmSegundos());
  });

  it.fails("(a) Protegido recusa um token JWT expirado e redireciona para /login", async () => {
    iniciarSessao(usuarioAdmin, criarTokenExpirado(usuarioAdmin));

    renderizar(
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
      </Routes>
    );

    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it.fails("(b) usuarioSalvo não lança exceção quando pastrack:usuario contém JSON inválido", () => {
    localStorage.setItem("pastrack:usuario", "{json inválido");

    expect(() => usuarioSalvo()).not.toThrow();
    expect(usuarioSalvo()).toBeNull();
  });
});
