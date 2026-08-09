import { FormEvent, useEffect, useState } from "react";
import { mensagemDeErro } from "../services/api";
import { listarFornecedores } from "../services/cadastros";
import { listarMovimentacoes, registrarMovimentacao } from "../services/movimentacoes";
import { listarPastilhas } from "../services/pastilhas";
import { Fornecedor, Movimentacao, Pastilha } from "../types";

export function Movimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [pastilhas, setPastilhas] = useState<Pastilha[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [pastilhaId, setPastilhaId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [fornecedorId, setFornecedorId] = useState("");
  const [documento, setDocumento] = useState("");

  async function carregar() {
    setErro("");
    try {
      const [listaMov, listaPastilhas, listaFornecedores] = await Promise.all([
        listarMovimentacoes(),
        listarPastilhas(),
        listarFornecedores(),
      ]);
      setMovimentacoes(listaMov);
      setPastilhas(listaPastilhas);
      setFornecedores(listaFornecedores);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function aoRegistrar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setSucesso("");
    setSalvando(true);
    try {
      const resultado = await registrarMovimentacao({
        tipo,
        pastilhaId: Number(pastilhaId),
        quantidade: Number(quantidade),
        fornecedorId: tipo === "ENTRADA" && fornecedorId ? Number(fornecedorId) : undefined,
        documento: documento || undefined,
      });
      setSucesso(`Movimentação registrada. Saldo atual do item: ${resultado.saldoAtual}.`);
      setQuantidade("1");
      setDocumento("");
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <h1>Movimentações</h1>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {sucesso && <p className="mensagem-sucesso">{sucesso}</p>}

      <form className="cartao formulario" onSubmit={aoRegistrar}>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "ENTRADA" | "SAIDA")}>
            <option value="SAIDA">Saída</option>
            <option value="ENTRADA">Entrada</option>
          </select>
        </label>
        <label>
          Pastilha
          <select value={pastilhaId} onChange={(e) => setPastilhaId(e.target.value)} required>
            <option value="">Selecione</option>
            {pastilhas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} ({p.saldoAtual} {p.unidade})
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantidade
          <input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
          />
        </label>
        {tipo === "ENTRADA" && (
          <label>
            Fornecedor
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Selecione</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Documento (NF, OS...)
          <input value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </label>
        <button className="botao" disabled={salvando}>
          {salvando ? "Registrando..." : "Registrar"}
        </button>
      </form>

      <div className="cartao">
        <h2>Histórico</h2>
        {carregando ? (
          <p className="texto-suave">Carregando movimentações...</p>
        ) : movimentacoes.length === 0 ? (
          <p className="texto-suave">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Pastilha</th>
                <th>Qtde</th>
                <th>Fornecedor</th>
                <th>Responsável</th>
                <th>Documento</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.dataHora).toLocaleString("pt-BR")}</td>
                  <td>
                    <span className={m.tipo === "ENTRADA" ? "selo selo-entrada" : "selo selo-saida"}>
                      {m.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                    </span>
                  </td>
                  <td>{m.pastilha.codigo}</td>
                  <td>
                    {m.quantidade} {m.pastilha.unidade}
                  </td>
                  <td>{m.fornecedor?.nome ?? "-"}</td>
                  <td>{m.usuario.nome}</td>
                  <td>{m.documento ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
