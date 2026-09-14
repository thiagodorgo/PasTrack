import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { tratarErros } from "./middlewares/erros";
import { rotas } from "./routes";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);
app.use(cors({ origin: env.CORS_ORIGINS }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", rotas);

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

app.use(tratarErros);
