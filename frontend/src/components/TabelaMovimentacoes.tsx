import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { TabelaRolavel } from "./TabelaRolavel";
import type { Movimentacao } from "../types";
import { formatarDataHora, formatarDataRelativa, formatarQuantidade } from "../utils/formato";

interface TabelaMovimentacoesProps {
  movimentacoes: Movimentacao[];
  /** Título da tabela, lido pelos leitores de tela na legenda (caption). */
  legenda: string;
  /** Inclui a coluna de documento e fornecedor (a observação aparece ao passar o mouse). */
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
    <TabelaRolavel nome={legenda}>
      <table className="tabela-movimentacoes">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Tipo</th>
            <th scope="col">Pastilha</th>
            <th scope="col" className="numero">
              Qtde
            </th>
            {detalhada && <th scope="col">Documento / Fornecedor</th>}
            <th scope="col">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map((m) => {
            const entrada = m.tipo === "ENTRADA";
            const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
            const origem = [m.documento, m.fornecedor?.nome].filter(Boolean).join(" · ") || "-";
            return (
              <tr key={m.id}>
                <td className="texto-medio celula-data" title={formatarDataHora(m.dataHora)}>
                  {formatarDataRelativa(m.dataHora)}
                </td>
                <td>
                  <span className={entrada ? "selo selo-entrada" : "selo selo-saida"}>
                    <Icone size={12} strokeWidth={2.5} aria-hidden="true" />
                    {entrada ? "Entrada" : "Saída"}
                  </span>
                </td>
                <td className="celula-codigo">{m.pastilha.codigo}</td>
                <td className={entrada ? "numero qtde qtde-entrada" : "numero qtde"}>
                  {formatarQuantidade(m.quantidade, m.pastilha.unidade)}
                </td>
                {detalhada && (
                  <td className="texto-forte" title={m.observacao ?? undefined}>
                    {origem}
                  </td>
                )}
                <td className="texto-suave">{m.usuario.nome}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TabelaRolavel>
  );
}
