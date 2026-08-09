import { alertaRepository } from "../repositories/alerta.repository";

export const alertaService = {
  listarAbertos() {
    return alertaRepository.listarAbertos();
  },

  resolver(id: number) {
    return alertaRepository.resolver(id);
  },
};
