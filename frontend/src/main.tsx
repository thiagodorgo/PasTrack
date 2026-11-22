import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LimiteDeErro } from "./components/LimiteDeErro";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </StrictMode>
);
