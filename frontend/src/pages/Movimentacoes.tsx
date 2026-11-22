import { ArrowDownLeft, ArrowUpRight, ChevronDown, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
  // o botão Repor do painel chega aqui com a entrada e a pastilha já escolhidas
  const pedido = (useLocation().state ?? null) as { tipo?: TipoMovimentacao; pastilhaId?: number } | null;

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [pastilhas, setPastilhas] = useState<Pastilha[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // quem não registra saída (o COMPRADOR) só tem a entrada
  const [tipo, setTipo] = useState<TipoMovimentacao>(
    pedido?.tipo === "ENTRADA" || !podeRegistrarSaida ? "ENTRADA" : "SAIDA"
  );
  const [pastilhaId, setPastilhaId] = useState(pedido?.pastilhaId ? String(pedido.pastilhaId) : "");
  const [quantidade, setQuantidade] = useState("1");
  const [fornecedorId, setFornecedorId] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");
  // o formulário só aparece depois de escolher Entrada ou Saída (ou ao chegar pelo botão Repor)
  const [formularioAberto, setFormularioAberto] = useState(Boolean(pedido?.tipo));
  const [menuAberto, setMenuAberto] = useState(false);
  const areaMenu = useRef<HTMLDivElement>(null);
  const botaoNova = useRef<HTMLButtonElement>(null);
  const primeiroCampo = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!menuAberto) return;
    function cliqueFora(evento: MouseEvent) {
      if (!areaMenu.current?.contains(evento.target as Node)) setMenuAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(false);
    }
    document.addEventListener("mousedown", cliqueFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cliqueFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [menuAberto]);

  function escolherTipo(novo: TipoMovimentacao) {
    setTipo(novo);
    setMenuAberto(false);
    setFormularioAberto(true);
    setErro("");
    setSucesso("");
    // espera o formulário aparecer para levar o foco ao primeiro campo
    setTimeout(() => primeiroCampo.current?.focus(), 0);
  }

  function fecharFormulario() {
    setFormularioAberto(false);
    botaoNova.current?.focus();
  }

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

  const entrada = tipo === "ENTRADA";
  const tipos: { valor: TipoMovimentacao; rotulo: string }[] = podeRegistrarSaida
    ? [
        { valor: "ENTRADA", rotulo: "Entrada" },
        { valor: "SAIDA", rotulo: "Saída" },
      ]
    : [{ valor: "ENTRADA", rotulo: "Entrada" }];

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Movimentações</h1>
          <p className="subtitulo">Registre entradas e saídas de pastilhas e acompanhe o histórico.</p>
        </div>
        <div className="menu-nova" ref={areaMenu}>
          <button
            ref={botaoNova}
            type="button"
            className="botao"
            aria-expanded={menuAberto}
            aria-controls="opcoes-nova-movimentacao"
            onClick={() => setMenuAberto(!menuAberto)}
          >
            <span aria-hidden="true">+</span> Nova movimentação
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {menuAberto && (
            <div
              id="opcoes-nova-movimentacao"
              className="menu-nova-opcoes"
              role="group"
              aria-label="Tipo de movimentação"
            >
              {tipos.map((t) => {
                const Icone = t.valor === "ENTRADA" ? ArrowDownLeft : ArrowUpRight;
                return (
                  <button
                    key={t.valor}
                    type="button"
                    className={t.valor === "ENTRADA" ? "opcao-entrada" : "opcao-saida"}
                    onClick={() => escolherTipo(t.valor)}
                  >
                    <Icone size={18} strokeWidth={2} aria-hidden="true" />
                    {t.rotulo}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      {formularioAberto && (
        <form
          className="cartao form-movimentacao"
          onSubmit={aoRegistrar}
          aria-label={entrada ? "Nova entrada" : "Nova saída"}
        >
          <div className="cartao-titulo">
            <h2>{entrada ? "Nova entrada" : "Nova saída"}</h2>
            <button
              type="button"
              className="botao-icone"
              aria-label="Fechar formulário"
              onClick={fecharFormulario}
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div className="campos">
            <div className="campo campo-duplo">
              <label htmlFor="mov-pastilha">Pastilha</label>
              <select
                ref={primeiroCampo}
                id="mov-pastilha"
                value={pastilhaId}
                onChange={(e) => setPastilhaId(e.target.value)}
                required
                aria-describedby="mov-pastilha-ajuda"
              >
                <option value="">Selecione uma pastilha</option>
                {pastilhas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · saldo {formatarQuantidade(p.saldoAtual, p.unidade)}
                  </option>
                ))}
              </select>
              <span className="ajuda" id="mov-pastilha-ajuda">
                O saldo atual aparece ao lado de cada item.
              </span>
            </div>
            <div className="campo">
              <label htmlFor="mov-quantidade">Quantidade</label>
              <input
                id="mov-quantidade"
                type="number"
                min="1"
                max={QUANTIDADE_MAXIMA}
                step="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="mov-documento">
                {entrada ? "Nº da nota fiscal (NF)" : "Nº da ordem de serviço (OS)"}
              </label>
              <input
                id="mov-documento"
                value={documento}
                placeholder={entrada ? "Ex.: NF 10262" : "Ex.: OS 2220"}
                onChange={(e) => setDocumento(e.target.value)}
                maxLength={TAMANHO_DO_DOCUMENTO}
              />
            </div>
            {entrada && (
              <div className="campo campo-duplo">
                <label htmlFor="mov-fornecedor">Fornecedor</label>
                <select
                  id="mov-fornecedor"
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  required
                >
                  <option value="">Selecione o fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="campo">
            <label htmlFor="mov-observacao">
              Observação <span className="opcional">(opcional)</span>
            </label>
            <textarea
              id="mov-observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={TAMANHO_DA_OBSERVACAO}
              rows={2}
            />
          </div>

          <div className="acoes-form">
            <button className="botao" disabled={salvando}>
              {salvando ? "Registrando..." : `Registrar ${entrada ? "entrada" : "saída"}`}
            </button>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={fecharFormulario}
              disabled={salvando}
            >
              Cancelar
            </button>
            {!entrada && (
              <span className="texto-suave">Saídas acima do saldo disponível são bloqueadas.</span>
            )}
          </div>
        </form>
      )}

      <section className="cartao cartao-tabela" aria-labelledby="titulo-historico">
        <div className="cartao-titulo cabecalho-tabela">
          <h2 id="titulo-historico">Histórico</h2>
          {!carregando && (
            <span className="texto-suave">
              {movimentacoes.length} {movimentacoes.length === 1 ? "registro recente" : "registros recentes"}
            </span>
          )}
        </div>
        {carregando ? (
          <Carregando texto="Carregando movimentações..." />
        ) : (
          <TabelaMovimentacoes movimentacoes={movimentacoes} legenda="Histórico de movimentações" detalhada />
        )}
      </section>
    </>
  );
}
