import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/contexts/AuthContext";

interface OpcoesDeRenderizacao {
  /** Histórico inicial do MemoryRouter; a última entrada é a rota ativa. */
  initialEntries?: string[];
}

/** Renderiza dentro de AuthProvider + MemoryRouter e devolve também a instância do userEvent. */
export function renderizar(ui: ReactElement, { initialEntries = ["/"] }: OpcoesDeRenderizacao = {}) {
  const usuario = userEvent.setup();
  const resultado = render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </AuthProvider>
  );
  return { usuario, ...resultado };
}
