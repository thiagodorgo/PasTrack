import { FormEvent, useEffect, useState } from "react";
import { mensagemDeErro } from "../services/api";
import { listarFabricantes } from "../services/cadastros";
import { criarPastilha, listarPastilhas } from "../services/pastilhas";
import { Fabricante, Pastilha } from "../types";

export function Pastilhas() {
  const [pastilhas, setPastilhas] = useState<Pastilha[]>([]);
  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modelo, setModelo] = useState("");
  const [aplicacao, setAplicacao] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [estoqueMinimo, setEstoqueMinimo] = useState("0");
  const [fabricanteId, setFabricanteId] = useState("");

  async function carregar(filtro?: string) {
    setErro("");
    try {
      setPastilhas(await listarPastilhas(filtro));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    listarFabricantes()
      .then(setFabricantes)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  async function aoBuscar(evento: FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    await carregar(busca || undefined);
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await criarPastilha({
        codigo,
        descricao,
        modelo: modelo || undefined,
        aplicacao: aplicacao || undefined,
        unidade,
        estoqueMinimo: Number(estoqueMinimo),
        fabricanteId: Number(fabricanteId),
      });
      setCodigo("");
      setDescricao("");
      setModelo("");
      setAplicacao("");
      setEstoqueMinimo("0");
      setMostrarFormulario(false);
      await carregar(busca || undefined);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Pastilhas</h1>
        <button className="botao" onClick={() => setMostrarFormulario((v) => !v)}>
          {mostrarFormulario ? "Fechar" : "Nova pastilha"}
        </button>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}

      {mostrarFormulario && (
        <form className="cartao formulario" onSubmit={aoSalvar}>
          <label>
            Código
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
          </label>
          <label>
            Descrição
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </label>
          <label>
            Modelo
            <input value={modelo} onChange={(e) => setModelo(e.target.value)} />
          </label>
          <label>
            Aplicação
            <input value={aplicacao} onChange={(e) => setAplicacao(e.target.value)} />
          </label>
          <label>
            Unidade
            <input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          </label>
          <label>
            Estoque mínimo
            <input
              type="number"
              min="0"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </label>
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
          <button className="botao" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      )}

      <form className="cartao formulario" onSubmit={aoBuscar}>
        <label>
          Buscar por código ou descrição
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: CNMG" />
        </label>
        <button className="botao botao-secundario">Buscar</button>
      </form>

      <div className="cartao">
        {carregando ? (
          <p className="texto-suave">Carregando pastilhas...</p>
        ) : pastilhas.length === 0 ? (
          <p className="texto-suave">Nenhuma pastilha encontrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Fabricante</th>
                <th>Saldo</th>
                <th>Mínimo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {pastilhas.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{p.descricao}</td>
                  <td>{p.fabricante?.nome}</td>
                  <td>
                    {p.saldoAtual} {p.unidade}
                  </td>
                  <td>
                    {p.estoqueMinimo} {p.unidade}
                  </td>
                  <td>
                    {p.saldoAtual <= p.estoqueMinimo ? (
                      <span className="selo selo-critico">Crítico</span>
                    ) : (
                      <span className="selo selo-ok">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
