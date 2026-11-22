import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { reiniciarDadosSimulados } from "./mocks/handlers";
import { server } from "./mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  reiniciarDadosSimulados();
  cleanup();
  localStorage.clear();
});

afterAll(() => {
  server.close();
});
