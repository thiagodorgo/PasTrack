import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { mensagemDeErro } from "../services/api";
import { buscarResumo } from "../services/painel";
import { listarPastilhas } from "../services/pastilhas";
import type { ResumoPainel } from "../types";
import { formatarDataRelativa, formatarQuantidade } from "../utils/formato";

/**
 * Tela inicial: cartões com o total de pastilhas, os itens críticos e os alertas abertos, a lista
 * dos itens críticos com uma barra de saldo x estoque mínimo e as últimas movimentações. Tudo vem de uma única chamada a
 * GET /api/painel/resumo. O cartão de itens críticos conta a lista recebida, que a API limita a 20.
 */
export function Painel() {
  const { pode } = useAuth();
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);
  // nome do fabricante de cada pastilha, só para enriquecer a lista de itens críticos
  const [fabricantes, setFabricantes] = useState<Map<number, string>>(new Map());
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarResumo()
      .then((dados) => {
        setResumo(dados);
        setAtualizadoEm(new Date());
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
    listarPastilhas()
      .then((lista) => setFabricantes(new Map(lista.map((p) => [p.id, p.fabricante.nome]))))
      .catch(() => undefined);
  }, []);

  if (carregando) return <Carregando texto="Carregando painel..." />;
  if (erro) return <Mensagem tipo="erro">{erro}</Mensagem>;
  if (!resumo) return null;

  const total = resumo.totalPastilhas;
  const criticos = resumo.itensCriticos.length;
  const porcentagemCritica = total > 0 ? Math.round((criticos / total) * 100) : 0;
  // do mais urgente ao menos: menor proporção do saldo em relação ao mínimo primeiro
  const itensCriticos = [...resumo.itensCriticos].sort(
    (a, b) => a.saldoAtual / a.estoqueMinimo - b.saldoAtual / b.estoqueMinimo
  );
  const podeRegistrar = pode("registrarEntrada") || pode("registrarSaida");

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Painel</h1>
          <p className="subtitulo">
            Visão do estoque de pastilhas
            {atualizadoEm && <> · atualizado {formatarDataRelativa(atualizadoEm.toISOString())}</>}
          </p>
        </div>
        {podeRegistrar && (
          <Link to="/movimentacoes" className="botao">
            <span aria-hidden="true">+</span> Registrar movimentação
          </Link>
        )}
      </header>

      <section className="kpis" aria-label="Indicadores">
        <div className="kpi">
          <span className="rotulo">Pastilhas cadastradas</span>
          <span className="valor kpi-azul">{total}</span>
          <span className="dica">{total - criticos} com estoque normal</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Itens em nível crítico</span>
          <span className="valor kpi-vermelho">{criticos}</span>
          <span className="dica">{porcentagemCritica}% do catálogo</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Alertas de reposição abertos</span>
          <span className="valor kpi-ambar">{resumo.alertasAbertos}</span>
          <span className="dica">
            {resumo.alertasAbertos > 0 ? "Aguardando reposição" : "Nenhum pendente"}
          </span>
        </div>
      </section>

      <div className="painel-colunas">
        <section className="cartao painel-criticos" aria-labelledby="titulo-criticos">
          <div className="cartao-titulo">
            <h2 id="titulo-criticos">Itens críticos, do mais urgente ao menos</h2>
            <Link to="/alertas">Ver alertas</Link>
          </div>
          <p className="cartao-descricao">Saldo atual comparado ao estoque mínimo (100%).</p>
          {itensCriticos.length === 0 ? (
            <p className="texto-suave">Nenhum item abaixo do estoque mínimo no momento.</p>
          ) : (
            <ul className="lista-criticos" aria-label="Itens críticos">
              {itensCriticos.map((item) => {
                const nivel = Math.min(item.saldoAtual / item.estoqueMinimo, 1);
                return (
                  <li key={item.id}>
                    <div className="item-identidade">
                      <span className="codigo">{item.codigo}</span>
                      <span className="texto-suave">{fabricantes.get(item.id) ?? item.descricao}</span>
                    </div>
                    <div
                      className="barra-nivel"
                      role="img"
                      aria-label={`${Math.round(nivel * 100)}% do estoque mínimo`}
                    >
                      <div style={{ width: `${nivel * 100}%` }} />
                    </div>
                    <span className="item-saldo">
                      <span className="saldo-critico">{item.saldoAtual}</span> / {item.estoqueMinimo} un
                    </span>
                    {pode("registrarEntrada") && (
                      <Link
                        to="/movimentacoes"
                        state={{ tipo: "ENTRADA", pastilhaId: item.id }}
                        className="botao-contorno"
                        aria-label={`Repor ${item.codigo}`}
                      >
                        Repor
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="cartao painel-movimentacoes" aria-labelledby="titulo-ultimas">
          <div className="cartao-titulo">
            <h2 id="titulo-ultimas">Últimas movimentações</h2>
            <Link to="/movimentacoes">Ver todas</Link>
          </div>
          {resumo.ultimasMovimentacoes.length === 0 ? (
            <p className="texto-suave">Nenhuma movimentação registrada ainda.</p>
          ) : (
            <ul className="lista-movimentacoes" aria-label="Últimas movimentações">
              {resumo.ultimasMovimentacoes.map((m) => {
                const entrada = m.tipo === "ENTRADA";
                const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
                return (
                  <li key={m.id}>
                    <span className={entrada ? "icone-mov icone-entrada" : "icone-mov"}>
                      <Icone size={16} strokeWidth={2} aria-label={entrada ? "Entrada" : "Saída"} />
                    </span>
                    <div className="item-identidade">
                      <span className="codigo">{m.pastilha.codigo}</span>
                      <span className="texto-suave">
                        {m.documento ? `${m.documento} · ` : ""}
                        {formatarDataRelativa(m.dataHora)}
                      </span>
                    </div>
                    <span className={entrada ? "qtde qtde-entrada" : "qtde"}>
                      {entrada ? "+" : "−"}
                      {formatarQuantidade(m.quantidade, m.pastilha.unidade)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
