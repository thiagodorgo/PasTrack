import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";

// O jsdom não implementa ResizeObserver, usado pelo ResponsiveContainer do recharts.
// Esta versão informa um tamanho fixo ao observar, para que os gráficos sejam desenhados nos testes.
class ResizeObserverDeTeste implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(alvo: Element) {
    const entrada = { target: alvo, contentRect: { width: 800, height: 280 } } as ResizeObserverEntry;
    this.callback([entrada], this);
  }

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverDeTeste;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
