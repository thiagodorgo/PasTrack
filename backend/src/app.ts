import cors from "cors";
import express from "express";
import { tratarErros } from "./middlewares/erros";
import { rotas } from "./routes";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", rotas);

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" });
});

app.use(tratarErros);
