import { prisma } from "../config/prisma";
import { criarAdministradorInicial } from "./administrador-inicial";

/** Seed de inicialização: cria só o administrador inicial. Seguro para rodar a cada subida do sistema. */
async function principal() {
  const resultado = await criarAdministradorInicial({
    email: process.env.SEED_ADMIN_EMAIL || "admin@pastrack.local",
    senha: process.env.SEED_ADMIN_SENHA || undefined,
  });

  if (!resultado.criado) {
    console.log(`Administrador ${resultado.email} já existe. Nada foi alterado.`);
  } else if (resultado.senhaGerada) {
    console.log(
      `Administrador ${resultado.email} criado. Anote a senha gerada abaixo: ela não será exibida de novo.`
    );
    console.log(resultado.senhaGerada);
  } else {
    console.log(`Administrador ${resultado.email} criado com a senha definida em SEED_ADMIN_SENHA.`);
  }
}

principal()
  .catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
