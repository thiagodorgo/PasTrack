import { ArrowDown, Info } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TabelaRolavel } from "../components/TabelaRolavel";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { type FiltroSituacaoAlerta, listarAlertas, resolverAlerta } from "../services/alertas";
import { listarPastilhas } from "../services/pastilhas";
import { mensagemDeErro } from "../services/api";
import type { Alerta } from "../types";
import { formatarDataHora, formatarDataRelativa, formatarQuantidade } from "../utils/formato";

/** Avisa quem mostra contadores de alertas (como o menu) que a lista mudou. */
export const EVENTO_ALERTAS_MUDARAM = "pastrack:alertas-mudaram";

const FILTROS: [FiltroSituacaoAlerta, string][] = [
  ["ABERTO", "Abertos"],
  ["RESOLVIDO", "Resolvidos"],
  ["TODAS", "Todos"],
];

const LISTA_VAZIA: Record<FiltroSituacaoAlerta, string> = {
  ABERTO: "Nenhum alerta aberto. Quando uma pastilha chegar ao estoque mínimo, o alerta aparece aqui.",
  RESOLVIDO: "Nenhum alerta resolvido ainda.",
  TODAS: "Nenhum alerta registrado.",
};

function descreverResolucao(alerta: Alerta): string {
  if (alerta.situacao === "ABERTO") return "Pendente";
  const quando = formatarDataHora(alerta.dataResolucao);
  return alerta.resolvidoPor
    ? `${quando}, por ${alerta.resolvidoPor.nome}`
    : `${quando}, automaticamente pela reposição`;
}

export function Alertas() {
  const { pode } = useAuth();
  const podeResolver = pode("resolverAlerta");
  const podeRepor = pode("registrarEntrada");
  // abertos contados à parte, para o subtítulo e a aba valerem em qualquer filtro
  const [abertos, setAbertos] = useState<Alerta[] | null>(null);
  // descrição completa com o fabricante, que a lista de alertas não traz
  const [fabricantes, setFabricantes] = useState<Map<number, string>>(new Map());

  const [filtro, setFiltro] = useState<FiltroSituacaoAlerta>("ABERTO");
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmando, setConfirmando] = useState<Alerta | null>(null);
  const [resolvendo, setResolvendo] = useState(false);
  const botaoConfirmar = useRef<HTMLButtonElement>(null);

  const carregar = useCallback(
    (situacao: FiltroSituacaoAlerta) =>
      listarAlertas(situacao)
        .then(setAlertas)
        .catch((e) => setErro(mensagemDeErro(e)))
        .finally(() => setCarregando(false)),
    []
  );

  const carregarAbertos = useCallback(
    () =>
      listarAlertas("ABERTO")
        .then(setAbertos)
        .catch(() => undefined),
    []
  );

  useEffect(() => {
    carregar(filtro);
  }, [carregar, filtro]);

  useEffect(() => {
    carregarAbertos();
    listarPastilhas()
      .then((lista) => setFabricantes(new Map(lista.map((p) => [p.id, p.fabricante.nome]))))
      .catch(() => undefined);
  }, [carregarAbertos]);

  // a confirmação recebe o foco assim que aparece, para o teclado e o leitor de tela chegarem nela
  useEffect(() => {
    if (confirmando) botaoConfirmar.current?.focus();
  }, [confirmando]);

  function trocarFiltro(novo: FiltroSituacaoAlerta) {
    if (novo === filtro) return;
    setErro("");
    setSucesso("");
    setConfirmando(null);
    setCarregando(true);
    setFiltro(novo);
  }

  function pedirConfirmacao(alerta: Alerta) {
    setErro("");
    setSucesso("");
    setConfirmando(alerta);
  }

  async function confirmarResolucao() {
    if (!confirmando) return;
    const { id, pastilha } = confirmando;
    setResolvendo(true);
    try {
      await resolverAlerta(id);
      setSucesso(`Alerta de ${pastilha.codigo} resolvido.`);
      window.dispatchEvent(new Event(EVENTO_ALERTAS_MUDARAM));
    } catch (e) {
      // inclui o 409 de um alerta que outra pessoa resolveu antes: a lista recarrega logo abaixo
      setErro(mensagemDeErro(e));
    } finally {
      setResolvendo(false);
      setConfirmando(null);
      await Promise.all([carregar(filtro), carregarAbertos()]);
    }
  }

  const faltam = (alerta: Alerta) => Math.max(alerta.pastilha.estoqueMinimo - alerta.pastilha.saldoAtual, 0);
  // abertos do mais urgente ao menos: menor proporção do saldo em relação ao mínimo primeiro
  const proporcao = (alerta: Alerta) =>
    alerta.pastilha.estoqueMinimo > 0 ? alerta.pastilha.saldoAtual / alerta.pastilha.estoqueMinimo : 1;
  const visiveis = filtro === "ABERTO" ? [...alertas].sort((a, b) => proporcao(a) - proporcao(b)) : alertas;
  const totalFaltando = abertos?.reduce((soma, a) => soma + faltam(a), 0) ?? 0;
  const temAcoes = podeResolver || podeRepor;

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Alertas</h1>
          {abertos && (
            <p className="subtitulo">
              {abertos.length} {abertos.length === 1 ? "aberto" : "abertos"} · {totalFaltando} un abaixo do
              mínimo no total
            </p>
          )}
        </div>
        <div className="segmentado" role="group" aria-label="Situação dos alertas">
          {FILTROS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => trocarFiltro(valor)}
            >
              {rotulo}
              {valor === "ABERTO" && abertos && <span aria-hidden="true"> · {abertos.length}</span>}
            </button>
          ))}
        </div>
      </header>
      <p className="aviso-info">
        <Info size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          Pastilhas que chegaram ao estoque mínimo. A reposição acima do mínimo fecha o alerta sozinha, então
          o caminho normal é registrar uma entrada.
        </span>
      </p>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      {confirmando && (
        <div className="cartao" role="group" aria-labelledby="confirmacao-alerta">
          <p id="confirmacao-alerta">
            <strong>Resolver o alerta de {confirmando.pastilha.codigo}?</strong>
          </p>
          <p className="texto-suave">
            O saldo continua em {formatarQuantidade(confirmando.pastilha.saldoAtual)}, com mínimo de{" "}
            {formatarQuantidade(confirmando.pastilha.estoqueMinimo)}. Use quando a reposição já estiver
            encaminhada.
          </p>
          <div className="grupo-botoes">
            <button
              ref={botaoConfirmar}
              type="button"
              className="botao"
              onClick={confirmarResolucao}
              disabled={resolvendo}
            >
              {resolvendo ? "Resolvendo..." : "Confirmar resolução"}
            </button>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => setConfirmando(null)}
              disabled={resolvendo}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="cartao cartao-tabela">
        {carregando ? (
          <Carregando texto="Carregando alertas..." />
        ) : visiveis.length === 0 ? (
          <p className="texto-suave vazio">{LISTA_VAZIA[filtro]}</p>
        ) : (
          <TabelaRolavel nome="Alertas de reposição">
            <table className="tabela-alertas">
              <caption className="sr-only">Alertas de reposição</caption>
              <thead>
                <tr>
                  <th scope="col">Pastilha</th>
                  <th scope="col">Saldo x mínimo</th>
                  <th scope="col">{filtro === "ABERTO" ? "Faltam" : "Situação"}</th>
                  <th scope="col">Aberto em</th>
                  {temAcoes && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((alerta) => {
                  const aberto = alerta.situacao === "ABERTO";
                  const { saldoAtual, estoqueMinimo } = alerta.pastilha;
                  const nivel = estoqueMinimo > 0 ? Math.min(saldoAtual / estoqueMinimo, 1) : 1;
                  const fabricante = fabricantes.get(alerta.pastilhaId);
                  return (
                    <tr key={alerta.id}>
                      <td>
                        <div className="item-identidade">
                          <span className="codigo">{alerta.pastilha.codigo}</span>
                          <span className="texto-suave">
                            {alerta.pastilha.descricao}
                            {fabricante && ` · ${fabricante}`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="saldo-minimo">
                          <span className="barra-nivel" aria-hidden="true">
                            <span style={{ width: `${nivel * 100}%` }} />
                          </span>
                          <span className="item-saldo">
                            <span className={aberto ? "saldo-critico" : undefined}>{saldoAtual}</span> /{" "}
                            {estoqueMinimo} un
                          </span>
                        </div>
                      </td>
                      <td>
                        {aberto ? (
                          <span className="selo selo-critico">
                            <span className="sr-only">Aberto: </span>
                            <ArrowDown size={12} strokeWidth={3} aria-hidden="true" />
                            {faltam(alerta)} un
                          </span>
                        ) : (
                          <div className="item-identidade">
                            <span className="selo selo-ok">Resolvido</span>
                            <span className="texto-suave resolucao">{descreverResolucao(alerta)}</span>
                          </div>
                        )}
                      </td>
                      <td className="texto-medio celula-data" title={formatarDataHora(alerta.dataGeracao)}>
                        {formatarDataRelativa(alerta.dataGeracao)}
                      </td>
                      {temAcoes && (
                        <td>
                          {aberto && (
                            <div className="acoes-linha">
                              {podeRepor && (
                                <Link
                                  to="/movimentacoes"
                                  state={{ tipo: "ENTRADA", pastilhaId: alerta.pastilhaId }}
                                  className="botao botao-compacto"
                                  aria-label={`Registrar entrada de ${alerta.pastilha.codigo}`}
                                >
                                  Registrar entrada
                                </Link>
                              )}
                              {podeResolver && (
                                <button
                                  type="button"
                                  className="botao-contorno botao-pequeno"
                                  aria-label={`Resolver o alerta de ${alerta.pastilha.codigo}`}
                                  onClick={() => pedirConfirmacao(alerta)}
                                >
                                  Resolver
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TabelaRolavel>
        )}
      </div>
    </>
  );
}
