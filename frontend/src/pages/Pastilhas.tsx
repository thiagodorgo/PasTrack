import { Check, CircleAlert, Minus, Pencil, Search } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TabelaRolavel } from "../components/TabelaRolavel";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { camposDoErro, mensagemDeErro } from "../services/api";
import { listarFabricantes } from "../services/cadastros";
import { atualizarPastilha, criarPastilha, listarPastilhas } from "../services/pastilhas";
import type { Fabricante, Pastilha } from "../types";
import { formatarQuantidade } from "../utils/formato";

/** "nova" abre o formulário em branco; uma pastilha abre o mesmo formulário preenchido. */
type Formulario = Pastilha | "nova" | null;

/** Mínimo zero desliga o controle de reposição: a pastilha não é crítica nem gera alerta. */
function situacao(pastilha: Pastilha) {
  if (pastilha.estoqueMinimo === 0)
    return { rotulo: "Sem mínimo", classe: "selo selo-neutro", critica: false, Icone: Minus };
  if (pastilha.saldoAtual <= pastilha.estoqueMinimo)
    return { rotulo: "Crítico", classe: "selo selo-critico", critica: true, Icone: CircleAlert };
  return { rotulo: "Normal", classe: "selo selo-ok", critica: false, Icone: Check };
}

type FiltroSituacao = "todas" | "criticas" | "normais";

export function Pastilhas() {
  const { pode } = useAuth();
  const podeGerenciar = pode("gerenciarPastilhas");

  const [pastilhas, setPastilhas] = useState<Pastilha[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroFabricante, setFiltroFabricante] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>("todas");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modelo, setModelo] = useState("");
  const [aplicacao, setAplicacao] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [fabricanteId, setFabricanteId] = useState("");

  const primeiroCampo = useRef<HTMLInputElement>(null);
  const botaoNova = useRef<HTMLButtonElement>(null);

  function carregar() {
    return listarPastilhas()
      .then(setPastilhas)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    listarFabricantes()
      .then(setFabricantes)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  useEffect(() => {
    if (formulario) primeiroCampo.current?.focus();
  }, [formulario]);

  function abrir(alvo: Formulario) {
    setErro("");
    setSucesso("");
    setErros({});
    const atual = alvo && alvo !== "nova" ? alvo : null;
    setCodigo(atual?.codigo ?? "");
    setDescricao(atual?.descricao ?? "");
    setModelo(atual?.modelo ?? "");
    setAplicacao(atual?.aplicacao ?? "");
    setUnidade(atual?.unidade ?? "un");
    setEstoqueMinimo(String(atual?.estoqueMinimo ?? 0));
    setFabricanteId(atual ? String(atual.fabricante.id) : "");
    setFormulario(alvo);
  }

  function fechar() {
    setFormulario(null);
    botaoNova.current?.focus();
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario) return;
    setErros({});
    setSalvando(true);
    const comuns = {
      descricao: descricao.trim(),
      modelo: modelo.trim() || null,
      aplicacao: aplicacao.trim() || null,
      unidade: unidade.trim() || "un",
      estoqueMinimo: Number(estoqueMinimo),
      fabricanteId: Number(fabricanteId),
    };
    try {
      if (formulario === "nova") {
        const criada = await criarPastilha({
          codigo: codigo.trim(),
          ...comuns,
          modelo: comuns.modelo ?? undefined,
          aplicacao: comuns.aplicacao ?? undefined,
        });
        setSucesso(`Pastilha ${criada.codigo} cadastrada.`);
      } else {
        // o código não muda e o saldo só muda por movimentação: nenhum dos dois é enviado
        const salva = await atualizarPastilha(formulario.id, comuns);
        setSucesso(`Pastilha ${salva.codigo} atualizada.`);
      }
      setFormulario(null);
      botaoNova.current?.focus();
      await carregar();
    } catch (e) {
      const campos = camposDoErro(e);
      if (Object.keys(campos).length > 0) setErros(campos);
      else setErro(mensagemDeErro(e));
      primeiroCampo.current?.focus();
    } finally {
      setSalvando(false);
    }
  }

  const editando = formulario && formulario !== "nova" ? formulario : null;

  // os filtros rodam sobre a lista já carregada: a busca responde enquanto se digita
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const totalCriticas = pastilhas.filter((p) => situacao(p).critica).length;
  const daBuscaEFabricante = pastilhas.filter(
    (p) =>
      (!termo ||
        p.codigo.toLocaleLowerCase("pt-BR").includes(termo) ||
        p.descricao.toLocaleLowerCase("pt-BR").includes(termo)) &&
      (!filtroFabricante || String(p.fabricante.id) === filtroFabricante)
  );
  const visiveis = daBuscaEFabricante.filter((p) =>
    filtroSituacao === "todas" ? true : situacao(p).critica === (filtroSituacao === "criticas")
  );
  const contagemCriticas = daBuscaEFabricante.filter((p) => situacao(p).critica).length;
  const abas: { valor: FiltroSituacao; rotulo: string; total: number }[] = [
    { valor: "todas", rotulo: "Todas", total: daBuscaEFabricante.length },
    { valor: "criticas", rotulo: "Críticas", total: contagemCriticas },
    { valor: "normais", rotulo: "Normais", total: daBuscaEFabricante.length - contagemCriticas },
  ];

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Pastilhas</h1>
          <p className="subtitulo">
            {pastilhas.length} {pastilhas.length === 1 ? "item cadastrado" : "itens cadastrados"} ·{" "}
            {totalCriticas} em nível crítico
          </p>
        </div>
        {podeGerenciar && (
          <button
            ref={botaoNova}
            type="button"
            className="botao"
            aria-expanded={formulario !== null}
            onClick={() => (formulario ? fechar() : abrir("nova"))}
          >
            {formulario ? (
              "Fechar"
            ) : (
              <>
                <span aria-hidden="true">+</span> Nova pastilha
              </>
            )}
          </button>
        )}
      </header>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      {formulario && (
        <form
          className="cartao formulario"
          onSubmit={aoSalvar}
          aria-label={editando ? `Editar ${editando.codigo}` : "Nova pastilha"}
        >
          {editando ? (
            <p className="texto-suave">
              Código: {editando.codigo}. Saldo atual:{" "}
              {formatarQuantidade(editando.saldoAtual, editando.unidade)}. O código não muda, e o saldo só
              muda por movimentação.
            </p>
          ) : (
            <label>
              Código
              <input
                ref={primeiroCampo}
                value={codigo}
                maxLength={40}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Descrição
            <input
              ref={editando ? primeiroCampo : undefined}
              value={descricao}
              maxLength={200}
              onChange={(e) => setDescricao(e.target.value)}
              required
              aria-invalid={erros.descricao ? true : undefined}
              aria-describedby={erros.descricao ? "erro-descricao-pastilha" : undefined}
            />
          </label>
          {erros.descricao && (
            <Mensagem tipo="erro" id="erro-descricao-pastilha">
              {erros.descricao}
            </Mensagem>
          )}
          <label>
            Modelo
            <input value={modelo} maxLength={60} onChange={(e) => setModelo(e.target.value)} />
          </label>
          <label>
            Aplicação
            <input value={aplicacao} maxLength={200} onChange={(e) => setAplicacao(e.target.value)} />
          </label>
          <label>
            Unidade
            <input value={unidade} maxLength={10} onChange={(e) => setUnidade(e.target.value)} />
          </label>
          <label>
            Estoque mínimo
            <input
              type="number"
              min="0"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
              aria-describedby="ajuda-estoque-minimo"
            />
          </label>
          <p className="texto-suave" id="ajuda-estoque-minimo">
            Zero desliga o alerta: a pastilha não entra nos itens críticos.
          </p>
          <label>
            Fabricante
            <select value={fabricanteId} onChange={(e) => setFabricanteId(e.target.value)} required>
              <option value="">Selecione</option>
              {fabricantes.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
          <div className="grupo-botoes">
            <button className="botao" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" className="botao botao-secundario" onClick={fechar} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="filtros" aria-label="Filtros">
        <div className="campo-busca" role="search">
          <Search size={18} strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar por código ou descrição"
            placeholder="Buscar por código ou descrição (ex.: CNMG)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrar por fabricante"
          value={filtroFabricante}
          onChange={(e) => setFiltroFabricante(e.target.value)}
        >
          <option value="">Todos os fabricantes</option>
          {fabricantes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
        <div className="segmentado" role="group" aria-label="Filtrar por situação">
          {abas.map((aba) => (
            <button
              key={aba.valor}
              type="button"
              aria-pressed={filtroSituacao === aba.valor}
              onClick={() => setFiltroSituacao(aba.valor)}
            >
              {aba.rotulo} · {aba.total}
            </button>
          ))}
        </div>
      </section>

      <div className="cartao cartao-tabela">
        {carregando ? (
          <Carregando texto="Carregando pastilhas..." />
        ) : visiveis.length === 0 ? (
          <p className="texto-suave vazio">Nenhuma pastilha encontrada.</p>
        ) : (
          <TabelaRolavel nome="Pastilhas cadastradas">
            <table className="tabela-pastilhas">
              <caption className="sr-only">Pastilhas cadastradas</caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">Fabricante</th>
                  <th scope="col">Saldo</th>
                  <th scope="col" className="numero">
                    Mínimo
                  </th>
                  <th scope="col">Situação</th>
                  {podeGerenciar && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => {
                  const estado = situacao(p);
                  // a barra vai até o dobro do mínimo, então a marca do mínimo fica no meio
                  const nivel = p.estoqueMinimo > 0 ? Math.min(p.saldoAtual / (p.estoqueMinimo * 2), 1) : 0;
                  return (
                    <tr key={p.id} className={estado.critica ? "linha-critica" : undefined}>
                      <td className="celula-codigo">{p.codigo}</td>
                      <td>{p.descricao}</td>
                      <td className="texto-medio">{p.fabricante.nome}</td>
                      <td>
                        <div className="saldo-com-barra">
                          <span className={estado.critica ? "saldo-critico" : "saldo"}>
                            {formatarQuantidade(p.saldoAtual, p.unidade)}
                          </span>
                          {p.estoqueMinimo > 0 && (
                            <span className="barra-saldo" aria-hidden="true">
                              <span
                                className={estado.critica ? "preenchimento critico" : "preenchimento"}
                                style={{ width: `${nivel * 100}%` }}
                              />
                              <span className="marca-minimo" title="Estoque mínimo" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="numero texto-medio">{formatarQuantidade(p.estoqueMinimo, p.unidade)}</td>
                      <td>
                        <span className={estado.classe}>
                          <estado.Icone size={12} strokeWidth={3} aria-hidden="true" />
                          {estado.rotulo}
                        </span>
                      </td>
                      {podeGerenciar && (
                        <td>
                          <button
                            type="button"
                            className="botao-icone"
                            aria-label={`Editar ${p.codigo}`}
                            onClick={() => abrir(p)}
                          >
                            <Pencil size={18} strokeWidth={2} aria-hidden="true" />
                          </button>
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
      <p className="nota">A marca vertical em cada barra indica o estoque mínimo.</p>
    </>
  );
}
