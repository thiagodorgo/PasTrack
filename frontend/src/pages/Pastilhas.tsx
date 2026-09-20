import { TabelaRolavel } from "../components/TabelaRolavel";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
  if (pastilha.estoqueMinimo === 0) return { rotulo: "Sem mínimo", classe: "selo selo-neutro" };
  if (pastilha.saldoAtual <= pastilha.estoqueMinimo)
    return { rotulo: "Crítico", classe: "selo selo-critico" };
  return { rotulo: "Normal", classe: "selo selo-ok" };
}

export function Pastilhas() {
  const { pode } = useAuth();
  const podeGerenciar = pode("gerenciarPastilhas");

  const [pastilhas, setPastilhas] = useState<Pastilha[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [busca, setBusca] = useState("");
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

  function carregar(filtro?: string) {
    return listarPastilhas({ busca: filtro })
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

  async function aoBuscar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    await carregar(busca || undefined);
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
      await carregar(busca || undefined);
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

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>Pastilhas</h1>
        {podeGerenciar && (
          <button
            ref={botaoNova}
            type="button"
            className="botao"
            aria-expanded={formulario !== null}
            onClick={() => (formulario ? fechar() : abrir("nova"))}
          >
            {formulario ? "Fechar" : "Nova pastilha"}
          </button>
        )}
      </div>

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

      <form className="cartao formulario" onSubmit={aoBuscar} role="search">
        <label>
          Buscar por código ou descrição
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: CNMG" />
        </label>
        <button className="botao botao-secundario">Buscar</button>
      </form>

      <div className="cartao">
        {carregando ? (
          <Carregando texto="Carregando pastilhas..." />
        ) : pastilhas.length === 0 ? (
          <p className="texto-suave">Nenhuma pastilha encontrada.</p>
        ) : (
          <TabelaRolavel nome="Pastilhas cadastradas">
            <table>
              <caption className="sr-only">Pastilhas cadastradas</caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">Fabricante</th>
                  <th scope="col">Saldo</th>
                  <th scope="col">Mínimo</th>
                  <th scope="col">Situação</th>
                  {podeGerenciar && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pastilhas.map((p) => {
                  const estado = situacao(p);
                  return (
                    <tr key={p.id}>
                      <td>{p.codigo}</td>
                      <td>{p.descricao}</td>
                      <td>{p.fabricante.nome}</td>
                      <td>{formatarQuantidade(p.saldoAtual, p.unidade)}</td>
                      <td>{formatarQuantidade(p.estoqueMinimo, p.unidade)}</td>
                      <td>
                        <span className={estado.classe}>{estado.rotulo}</span>
                      </td>
                      {podeGerenciar && (
                        <td>
                          <button
                            type="button"
                            className="botao botao-secundario"
                            aria-label={`Editar ${p.codigo}`}
                            onClick={() => abrir(p)}
                          >
                            Editar
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
    </>
  );
}
