import { Prisma } from "@prisma/client";

/** Campos que nunca entram na trilha de auditoria. */
const CAMPOS_SENSIVEIS = new Set([
  "senha",
  "senhaHash",
  "senhaAtual",
  "novaSenha",
  "senhaTemporaria",
  "versaoToken",
]);

export interface RegistroAuditoria {
  usuarioId?: number | null;
  /** Verbo no formato entidade.acao, por exemplo "pastilha.atualizada". */
  acao: string;
  entidade: string;
  entidadeId: number;
  antes?: unknown;
  depois?: unknown;
}

/** Converte o valor em JSON sem campos sensíveis. Datas viram texto ISO. */
export function paraJsonSeguro(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  const texto = JSON.stringify(valor, (chave, conteudo: unknown) =>
    CAMPOS_SENSIVEIS.has(chave) ? undefined : conteudo
  );
  return JSON.parse(texto) as Prisma.InputJsonValue;
}

/** Registra uma ação na trilha de auditoria. Use o cliente da mesma transação da mudança. */
export function registrarAuditoria(cliente: Prisma.TransactionClient, registro: RegistroAuditoria) {
  return cliente.auditoria.create({
    data: {
      usuarioId: registro.usuarioId ?? null,
      acao: registro.acao,
      entidade: registro.entidade,
      entidadeId: registro.entidadeId,
      antes: paraJsonSeguro(registro.antes),
      depois: paraJsonSeguro(registro.depois),
    },
  });
}
