import { fornecedorRepository } from "../repositories/fornecedor.repository";

export const fornecedorService = {
  listar() {
    return fornecedorRepository.listar();
  },

  criar(dados: { nome: string; cnpj?: string; contato?: string }) {
    return fornecedorRepository.criar(dados);
  },
};
