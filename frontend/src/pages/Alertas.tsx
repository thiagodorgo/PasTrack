import { useCallback, useEffect, useRef, useState } from "react";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { type FiltroSituacaoAlerta, listarAlertas, resolverAlerta } from "../services/alertas";
import { mensagemDeErro } from "../services/api";
import type { Alerta } from "../types";
import { formatarDataHora, formatarQuantidade } from "../utils/formato";

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

  useEffect(() => {
    carregar(filtro);
  }, [carregar, filtro]);

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
      await carregar(filtro);
    }
  }

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>Alertas</h1>
      </div>
      <p className="texto-suave">
        Pastilhas que chegaram ao estoque mínimo. A reposição acima do mínimo fecha o alerta sozinha.
      </p>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      <div className="grupo-botoes" role="group" aria-label="Situação dos alertas">
        {FILTROS.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            className={filtro === valor ? "botao" : "botao botao-secundario"}
            aria-pressed={filtro === valor}
            onClick={() => trocarFiltro(valor)}
          >
            {rotulo}
          </button>
        ))}
      </div>

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

      <div className="cartao">
        {carregando ? (
          <Carregando texto="Carregando alertas..." />
        ) : alertas.length === 0 ? (
          <p className="texto-suave">{LISTA_VAZIA[filtro]}</p>
        ) : (
          <div className="tabela-rolavel">
            <table>
              <caption className="sr-only">Alertas de reposição</caption>
              <thead>
                <tr>
                  <th scope="col">Pastilha</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">Saldo</th>
                  <th scope="col">Mínimo</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Aberto em</th>
                  <th scope="col">Resolução</th>
                  {podeResolver && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {alertas.map((alerta) => (
                  <tr key={alerta.id}>
                    <td>{alerta.pastilha.codigo}</td>
                    <td>{alerta.pastilha.descricao}</td>
                    <td>{formatarQuantidade(alerta.pastilha.saldoAtual)}</td>
                    <td>{formatarQuantidade(alerta.pastilha.estoqueMinimo)}</td>
                    <td>
                      {alerta.situacao === "ABERTO" ? (
                        <span className="selo selo-critico">Aberto</span>
                      ) : (
                        <span className="selo selo-ok">Resolvido</span>
                      )}
                    </td>
                    <td>{formatarDataHora(alerta.dataGeracao)}</td>
                    <td>{descreverResolucao(alerta)}</td>
                    {podeResolver && (
                      <td>
                        {alerta.situacao === "ABERTO" && (
                          <button
                            type="button"
                            className="botao botao-secundario"
                            aria-label={`Resolver o alerta de ${alerta.pastilha.codigo}`}
                            onClick={() => pedirConfirmacao(alerta)}
                          >
                            Resolver
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
