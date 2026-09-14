import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const servidor = app.listen(env.PORT, () => {
  console.log(`API do PasTrack rodando na porta ${env.PORT} (${env.NODE_ENV})`);
});

let encerrando = false;

/** Encerra com elegância: para de aceitar conexões, fecha o banco e sai. Força a saída após 10 s. */
function encerrar(sinal: NodeJS.Signals) {
  if (encerrando) return;
  encerrando = true;
  console.log(`${sinal} recebido: encerrando o servidor`);
  setTimeout(() => process.exit(1), 10_000).unref();
  servidor.close(() => {
    prisma
      .$disconnect()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
}

process.on("SIGTERM", encerrar);
process.on("SIGINT", encerrar);
