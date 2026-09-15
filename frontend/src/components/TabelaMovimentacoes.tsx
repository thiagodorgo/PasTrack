import type { Movimentacao } from "../types";
import { formatarDataHora, formatarQuantidade } from "../utils/formato";

interface TabelaMovimentacoesProps {
  movimentacoes: Movimentacao[];
  /** Título da tabela, lido pelos leitores de tela na legenda (caption). */
  legenda: string;
  /** Inclui as colunas de fornecedor, documento e observação. */
  detalhada?: boolean;
  /** Texto mostrado quando não há movimentações. */
  mensagemVazia?: string;
}

/** Tabela de movimentações do painel e da tela de movimentações; rola na horizontal em telas estreitas. */
export function TabelaMovimentacoes({
  movimentacoes,
  legenda,
  detalhada = false,
  mensagemVazia = "Nenhuma movimentação registrada ainda.",
}: TabelaMovimentacoesProps) {
  if (movimentacoes.length === 0) {
    return <p className="texto-suave">{mensagemVazia}</p>;
  }

  return (
    <div className="tabela-rolavel">
      <table>
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Tipo</th>
            <th scope="col">Pastilha</th>
            <th scope="col">Qtde</th>
            {detalhada && <th scope="col">Fornecedor</th>}
            <th scope="col">Responsável</th>
            {detalhada && <th scope="col">Documento</th>}
            {detalhada && <th scope="col">Observação</th>}
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map((m) => (
            <tr key={m.id}>
              <td>{formatarDataHora(m.dataHora)}</td>
              <td>
                <span className={m.tipo === "ENTRADA" ? "selo selo-entrada" : "selo selo-saida"}>
                  {m.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                </span>
              </td>
              <td>{m.pastilha.codigo}</td>
              <td>{formatarQuantidade(m.quantidade, m.pastilha.unidade)}</td>
              {detalhada && <td>{m.fornecedor?.nome ?? "-"}</td>}
              <td>{m.usuario.nome}</td>
              {detalhada && <td>{m.documento ?? "-"}</td>}
              {detalhada && <td>{m.observacao ?? "-"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
