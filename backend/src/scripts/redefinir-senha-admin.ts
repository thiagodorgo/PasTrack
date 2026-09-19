import { prisma } from "../config/prisma";
import { redefinirSenhaDoAdministrador } from "./administrador-inicial";

export interface Saida {
  log(mensagem: string): void;
  error(mensagem: string): void;
}

/**
 * Recupera o acesso de um administrador pela linha de comando. Uso no servidor:
 *   docker compose exec api node dist/scripts/redefinir-senha-admin.js admin@pastrack.local
 * Com NOVA_SENHA definida, usa essa senha em vez de gerar uma temporária. Devolve o código de saída.
 */
export async function executarRedefinicao(
  argumentos: string[],
  ambiente: NodeJS.ProcessEnv,
  saida: Saida = console
): Promise<number> {
  const email = argumentos[0]?.trim();
  if (!email) {
    saida.error("Informe o e-mail do administrador. Exemplo:");
    saida.error("  docker compose exec api node dist/scripts/redefinir-senha-admin.js admin@pastrack.local");
    saida.error("Para escolher a senha em vez de gerar uma temporária, defina NOVA_SENHA.");
    return 1;
  }

  try {
    const resultado = await redefinirSenhaDoAdministrador({
      email,
      novaSenha: ambiente.NOVA_SENHA || undefined,
    });
    saida.log(
      `Acesso de ${resultado.email} recuperado: usuário ativo, sessões anteriores encerradas e troca de senha obrigatória no próximo acesso.`
    );
    if (resultado.senhaGerada) {
      saida.log("Anote a senha temporária abaixo: ela não será exibida de novo.");
      saida.log(resultado.senhaGerada);
    } else {
      saida.log("A senha é a definida em NOVA_SENHA.");
    }
    return 0;
  } catch (erro) {
    saida.error(erro instanceof Error ? erro.message : String(erro));
    return 1;
  }
}

// só executa quando chamado pela linha de comando, não quando importado pelos testes
if (typeof require !== "undefined" && require.main === module) {
  executarRedefinicao(process.argv.slice(2), process.env)
    .then((codigo) => {
      process.exitCode = codigo;
    })
    .finally(() => prisma.$disconnect());
}
