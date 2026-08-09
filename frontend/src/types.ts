export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}

export interface Fabricante {
  id: number;
  nome: string;
}

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string | null;
  contato?: string | null;
}

export interface Pastilha {
  id: number;
  codigo: string;
  descricao: string;
  modelo?: string | null;
  aplicacao?: string | null;
  unidade: string;
  estoqueMinimo: number;
  saldoAtual: number;
  fabricanteId: number;
  fabricante?: Fabricante;
}

export interface Movimentacao {
  id: number;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  dataHora: string;
  documento?: string | null;
  observacao?: string | null;
  pastilha: { codigo: string; descricao: string; unidade: string };
  usuario: { nome: string };
  fornecedor?: { nome: string } | null;
}

export interface ItemCritico {
  id: number;
  codigo: string;
  descricao: string;
  saldoAtual: number;
  estoqueMinimo: number;
}

export interface ResumoPainel {
  totalPastilhas: number;
  alertasAbertos: number;
  itensCriticos: ItemCritico[];
  ultimasMovimentacoes: Movimentacao[];
}
