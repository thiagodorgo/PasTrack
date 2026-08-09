import { AppError } from "../middlewares/erros";
import { pastilhaRepository } from "../repositories/pastilha.repository";

interface PastilhaDTO {
  codigo: string;
  descricao: string;
  modelo?: string;
  aplicacao?: string;
  unidade?: string;
  estoqueMinimo?: number;
  fabricanteId: number;
}

export const pastilhaService = {
  listar(busca?: string) {
    return pastilhaRepository.listar(
      busca
        ? {
            OR: [
              { codigo: { contains: busca, mode: "insensitive" } },
              { descricao: { contains: busca, mode: "insensitive" } },
            ],
          }
        : {}
    );
  },

  async buscarPorId(id: number) {
    const pastilha = await pastilhaRepository.buscarPorId(id);
    if (!pastilha) {
      throw new AppError("Pastilha não encontrada", 404);
    }
    return pastilha;
  },

  criar(dados: PastilhaDTO) {
    return pastilhaRepository.criar({
      codigo: dados.codigo,
      descricao: dados.descricao,
      modelo: dados.modelo,
      aplicacao: dados.aplicacao,
      unidade: dados.unidade ?? "un",
      estoqueMinimo: dados.estoqueMinimo ?? 0,
      fabricanteId: dados.fabricanteId,
    });
  },

  async atualizar(id: number, dados: Partial<PastilhaDTO>) {
    await this.buscarPorId(id);
    return pastilhaRepository.atualizar(id, dados);
  },
};
