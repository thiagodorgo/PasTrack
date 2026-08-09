import { fabricanteRepository } from "../repositories/fabricante.repository";

export const fabricanteService = {
  listar() {
    return fabricanteRepository.listar();
  },

  criar(nome: string) {
    return fabricanteRepository.criar(nome);
  },
};
