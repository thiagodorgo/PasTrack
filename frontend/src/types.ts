/** Perfis de acesso do PasTrack, os mesmos do backend. */
export type Perfil = "ADMINISTRADOR" | "GESTOR" | "OPERADOR" | "COMPRADOR";

/** Usuário da sessão, devolvido pelo login e por GET /api/auth/me. */
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  /** Verdadeiro enquanto a senha temporária não for trocada. */
  deveTrocarSenha: boolean;
}

/** Usuário como aparece na gestão de usuários, exclusiva do ADMINISTRADOR. */
export interface UsuarioGerenciado extends Usuario {
  ativo: boolean;
}

/** Resposta da criação de usuário: a senha temporária aparece uma única vez. */
export interface UsuarioCriado extends UsuarioGerenciado {
  senhaTemporaria: string;
}

export interface Fabricante {
  id: number;
  nome: string;
}

export interface Fornecedor {
  id: number;
  nome: string;
  /** No formato 00.000.000/0000-00. */
  cnpj: string | null;
  contato: string | null;
}

export interface Pastilha {
  id: number;
  codigo: string;
  descricao: string;
  modelo: string | null;
  aplicacao: string | null;
  unidade: string;
  estoqueMinimo: number;
  saldoAtual: number;
  fabricanteId: number;
  fabricante: Fabricante;
}

export type TipoMovimentacao = "ENTRADA" | "SAIDA";

/** Movimentação como aparece nas listagens. */
export interface Movimentacao {
  id: number;
  tipo: TipoMovimentacao;
  quantidade: number;
  dataHora: string;
  documento: string | null;
  observacao: string | null;
  pastilhaId: number;
  usuarioId: number;
  fornecedorId: number | null;
  pastilha: { codigo: string; descricao: string; unidade: string };
  /** Quem registrou a movimentação. */
  usuario: { nome: string };
  fornecedor: { nome: string } | null;
}

/** Movimentação gravada, como volta do registro: sem os objetos relacionados. */
export type MovimentacaoGravada = Omit<Movimentacao, "pastilha" | "usuario" | "fornecedor">;

export interface ResultadoMovimentacao {
  movimentacao: MovimentacaoGravada;
  /** Saldo da pastilha depois do lançamento. */
  saldoAtual: number;
}

export type SituacaoAlerta = "ABERTO" | "RESOLVIDO";

export interface Alerta {
  id: number;
  dataGeracao: string;
  situacao: SituacaoAlerta;
  /** Nulo enquanto o alerta está aberto. */
  dataResolucao: string | null;
  pastilhaId: number;
  pastilha: { codigo: string; descricao: string; saldoAtual: number; estoqueMinimo: number };
  /** Nulo enquanto o alerta está aberto e no fechamento automático por uma entrada. */
  resolvidoPor: { id: number; nome: string } | null;
}

/** Alerta devolvido ao resolver: sem os objetos relacionados. */
export type AlertaResolvido = Pick<
  Alerta,
  "id" | "dataGeracao" | "situacao" | "dataResolucao" | "pastilhaId"
>;

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

/** Página de resultados: os dados da página, o total que atende aos filtros, a página (a partir de 1) e o tamanho. */
export interface Paginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

/** Códigos estáveis de erro da API, para reagir sem depender do texto da mensagem. */
export type CodigoErro =
  | "DADOS_INVALIDOS"
  | "SENHA_ATUAL_INCORRETA"
  | "REFERENCIA_INVALIDA"
  | "NAO_ENCONTRADO"
  | "SESSAO_INVALIDA"
  | "TROCA_SENHA_OBRIGATORIA"
  | "DUPLICADO"
  | "ALERTA_JA_RESOLVIDO"
  | "MUITAS_TENTATIVAS";

export interface CampoInvalido {
  /** Campo recusado, como "quantidade" ou "novaSenha". */
  caminho: string;
  mensagem: string;
}

/** Envelope de erro da API. */
export interface ErroApi {
  erro: string;
  codigo?: CodigoErro;
  campos?: CampoInvalido[];
  requestId?: string;
}
