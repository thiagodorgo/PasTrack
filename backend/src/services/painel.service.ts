import { painelRepository } from "../repositories/painel.repository";

/** Dados do painel inicial. */
export const painelService = {
  /**
   * Total de pastilhas, alertas abertos, itens críticos e últimas movimentações, buscados em paralelo.
   * Os limites de cada lista ficam em painel.repository.ts.
   */
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
