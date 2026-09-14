import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { AuthProvider } from "../../src/contexts/AuthContext";

interface OpcoesDeRenderizacao {
  /** Histórico inicial do MemoryRouter (caminhos ou { pathname, state }); a última entrada é a rota ativa. */
  initialEntries?: MemoryRouterProps["initialEntries"];
}

/**
 * Renderiza dentro de MemoryRouter + AuthProvider e devolve também a instância do userEvent.
 * O AuthProvider fica dentro do roteador porque navega ao ouvir os eventos de sessão.
 */
export function renderizar(ui: ReactElement, { initialEntries = ["/"] }: OpcoesDeRenderizacao = {}) {
  const usuario = userEvent.setup();
  const resultado = render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
  return { usuario, ...resultado };
}
