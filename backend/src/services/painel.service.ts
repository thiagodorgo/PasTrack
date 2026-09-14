import { painelRepository } from "../repositories/painel.repository";

export const painelService = {
  async resumo() {
    const [totalPastilhas, alertasAbertos, itensCriticos, ultimasMovimentacoes] = await Promise.all([
      painelRepository.contarPastilhas(),
      painelRepository.contarAlertasAbertos(),
      painelRepository.listarItensCriticos(),
      painelRepository.listarUltimasMovimentacoes(),
    ]);

    return { totalPastilhas, alertasAbertos, itensCriticos, ultimasMovimentacoes };
  },
};
