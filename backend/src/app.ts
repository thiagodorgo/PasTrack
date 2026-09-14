import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { criarLogDeAcesso, logger } from "./config/logger";
import { tratarErros } from "./middlewares/erros";

import { atribuirRequestId } from "./middlewares/request-id";
import { rotas } from "./routes";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use(atribuirRequestId);
app.use(criarLogDeAcesso(logger));
// A API só devolve JSON e roda por HTTP na rede local: CSP que não libera nada, sem HSTS
// e sem upgrade-insecure-requests, que quebrariam o acesso sem TLS.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    strictTransportSecurity: false,
    xFrameOptions: { action: "deny" },
  })
);
app.use(cors({ origin: env.CORS_ORIGINS, exposedHeaders: ["X-Request-Id", "Retry-After"] }));
app.use("/api", (_req, res, next) => {
  // respostas da API podem trazer tokens e senhas temporárias: nada de cache no navegador ou em proxies
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use("/api", rotas);

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

app.use(tratarErros);
