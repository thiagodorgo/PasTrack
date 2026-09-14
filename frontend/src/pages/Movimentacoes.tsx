import { type FormEvent, useEffect, useState } from "react";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { TabelaMovimentacoes } from "../components/TabelaMovimentacoes";
import { useAuth } from "../contexts/AuthContext";
import { mensagemDeErro } from "../services/api";
import { listarFornecedores } from "../services/cadastros";
import { listarMovimentacoes, type NovaMovimentacao, registrarMovimentacao } from "../services/movimentacoes";
import { listarPastilhas } from "../services/pastilhas";
import type { Fornecedor, Movimentacao, Pastilha, TipoMovimentacao } from "../types";
import { formatarQuantidade } from "../utils/formato";

// limites do registro na API
const QUANTIDADE_MAXIMA = 1_000_000;
const TAMANHO_DO_DOCUMENTO = 100;
const TAMANHO_DA_OBSERVACAO = 500;

export function Movimentacoes() {
  const { pode } = useAuth();
  const podeRegistrarSaida = pode("registrarSaida");

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [pastilhas, setPastilhas] = useState<Pastilha[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // quem não registra saída (o COMPRADOR) só tem a entrada
  const [tipo, setTipo] = useState<TipoMovimentacao>(podeRegistrarSaida ? "SAIDA" : "ENTRADA");
  const [pastilhaId, setPastilhaId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [fornecedorId, setFornecedorId] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");

  function carregar() {
    return Promise.all([listarMovimentacoes(), listarPastilhas(), listarFornecedores()])
      .then(([listaMov, listaPastilhas, listaFornecedores]) => {
        setMovimentacoes(listaMov);
        setPastilhas(listaPastilhas);
        setFornecedores(listaFornecedores);
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
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
      const campos = {
        pastilhaId: Number(pastilhaId),
        quantidade: Number(quantidade),
        documento: documento.trim() || undefined,
        observacao: observacao.trim() || undefined,
      };
      // a ENTRADA leva o fornecedor; a SAIDA nunca leva
      const dados: NovaMovimentacao =
        tipo === "ENTRADA" ? { ...campos, tipo, fornecedorId: Number(fornecedorId) } : { ...campos, tipo };
      const resultado = await registrarMovimentacao(dados);
      setSucesso(
        `Movimentação registrada. Saldo atual do item: ${formatarQuantidade(resultado.saldoAtual)}.`
      );
      setQuantidade("1");
      setDocumento("");
      setObservacao("");
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

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      <form className="cartao formulario" onSubmit={aoRegistrar} aria-label="Registrar movimentação">
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimentacao)}>
            {podeRegistrarSaida && <option value="SAIDA">Saída</option>}
            <option value="ENTRADA">Entrada</option>
          </select>
        </label>
        <label>
          Pastilha
          <select value={pastilhaId} onChange={(e) => setPastilhaId(e.target.value)} required>
            <option value="">Selecione</option>
            {pastilhas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} ({formatarQuantidade(p.saldoAtual, p.unidade)})
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantidade
          <input
            type="number"
            min="1"
            max={QUANTIDADE_MAXIMA}
            step="1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            required
          />
        </label>
        {tipo === "ENTRADA" && (
          <label>
            Fornecedor
            <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} required>
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
          <input
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            maxLength={TAMANHO_DO_DOCUMENTO}
          />
        </label>
        <label className="campo-largo">
          Observação
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            maxLength={TAMANHO_DA_OBSERVACAO}
            rows={2}
          />
        </label>
        <button className="botao" disabled={salvando}>
          {salvando ? "Registrando..." : "Registrar"}
        </button>
      </form>

      <div className="cartao">
        <h2>Histórico</h2>
        {carregando ? (
          <Carregando texto="Carregando movimentações..." />
        ) : (
          <TabelaMovimentacoes movimentacoes={movimentacoes} legenda="Histórico de movimentações" detalhada />
        )}
      </div>
    </>
  );
}
