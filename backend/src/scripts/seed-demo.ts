import { prisma } from "../config/prisma";
import { gerarSenhaAleatoria } from "./administrador-inicial";
import { criarDadosDeDemonstracao, USUARIOS_DEMONSTRACAO } from "./dados-demonstracao";

/** Seed de demonstração: só roda com SEED_DEMO=true. Não use na instalação real da empresa. */
async function principal() {
  if (process.env.SEED_DEMO !== "true") {
    console.log("SEED_DEMO não é true: nenhum dado de demonstração foi criado.");
    return;
  }
  const senhaInformada = process.env.SEED_DEMO_SENHA || undefined;
  const senha = senhaInformada ?? gerarSenhaAleatoria();
  await criarDadosDeDemonstracao(senha);
  const emails = USUARIOS_DEMONSTRACAO.map((usuario) => usuario.email).join(", ");
  if (senhaInformada) {
    console.log(`Dados de demonstração prontos. Usuários: ${emails} (senha de SEED_DEMO_SENHA).`);
  } else {
    console.log(`Dados de demonstração prontos. Usuários: ${emails}. Senha gerada, exibida só agora:`);
    console.log(senha);
  }
}

principal()
  .catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
