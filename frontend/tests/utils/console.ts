import { onTestFinished, vi } from "vitest";

/**
 * Silencia, só no teste atual, o registro que o React e o jsdom fazem quando um componente lança
 * durante a renderização. O erro continua chegando ao teste e ao limite de erro; some só o ruído no console.
 */
export function silenciarErrosDeRenderizacao() {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  // o jsdom só registra a exceção no console quando o evento "error" do window não é cancelado
  const cancelar = (evento: ErrorEvent) => evento.preventDefault();
  window.addEventListener("error", cancelar);
  onTestFinished(() => window.removeEventListener("error", cancelar));
}
