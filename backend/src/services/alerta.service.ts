import { prisma } from "../config/prisma";
import { AppError } from "../middlewares/erros";
import { alertaRepository } from "../repositories/alerta.repository";
import { ConsultaAlertas } from "../schemas/alerta.schema";
import { registrarAuditoria } from "./auditoria.service";

export const alertaService = {
  listar(situacao: ConsultaAlertas["situacao"]) {
    return alertaRepository.listar(situacao === "TODAS" ? undefined : situacao);
  },

  /**
   * Resolve manualmente um alerta aberto e registra quem resolveu.
   * Devolve o alerta sem os objetos relacionados, como define o contrato da API.
   *
   * Trava antes a linha da pastilha, como fazem as movimentações: assim a resolução manual e o
   * fechamento automático pela reposição nunca se sobrepõem. A atualização só vale para alerta
   * ainda ABERTO, então de duas resoluções simultâneas apenas uma vence e a outra recebe 409.
   */
  resolver(id: number, usuarioId: number) {
    return prisma.$transaction(async (tx) => {
      const alerta = await tx.alerta.findUnique({ where: { id }, select: { pastilhaId: true } });
      if (!alerta) {
        throw new AppError("Registro não encontrado", 404, "NAO_ENCONTRADO");
      }
      await tx.$executeRaw`SELECT 1 FROM "pastilha" WHERE "id" = ${alerta.pastilhaId} FOR UPDATE`;

      const { count } = await tx.alerta.updateMany({
        where: { id, situacao: "ABERTO" },
        data: { situacao: "RESOLVIDO", dataResolucao: new Date(), resolvidoPorId: usuarioId },
      });
      if (count === 0) {
        throw new AppError("Este alerta já foi resolvido", 409, "ALERTA_JA_RESOLVIDO");
      }

      const resolvido = await tx.alerta.findUniqueOrThrow({ where: { id } });
      await registrarAuditoria(tx, {
        usuarioId,
        acao: "alerta.resolvido",
        entidade: "alerta",
        entidadeId: id,
        antes: { situacao: "ABERTO" },
        depois: {
          situacao: resolvido.situacao,
          dataResolucao: resolvido.dataResolucao,
          resolvidoPorId: resolvido.resolvidoPorId,
        },
      });
      return resolvido;
    });
  },
};
