import { Router } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../config/prisma";

function lerVersao(): string {
  try {
    const pacote = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8")) as {
      version?: string;
    };
    return pacote.version ?? "desconhecida";
  } catch {
    return "desconhecida";
  }
}

const versao = lerVersao();

/** Verificação de saúde usada pelo Docker, pelo CI e por monitoramento. Pública e sem dados sensíveis. */
export const saudeRotas = Router();

saudeRotas.get("/health", async (_req, res) => {
  const base = { versao, uptimeSegundos: Math.round(process.uptime()) };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok", banco: "ok", ...base });
  } catch {
    return res.status(503).json({ status: "erro", banco: "indisponivel", ...base });
  }
});
