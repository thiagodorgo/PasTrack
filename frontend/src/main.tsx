import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LimiteDeErro } from "./components/LimiteDeErro";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

/**
 * Ponto de entrada do front-end: carrega os estilos globais e monta o App no elemento #root, dentro do
 * StrictMode e do LimiteDeErro, que troca a tela em branco por uma mensagem quando a renderização falha.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </StrictMode>
);
