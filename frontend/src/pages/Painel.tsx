import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mensagemDeErro } from "../services/api";
import { buscarResumo } from "../services/painel";
import { ResumoPainel } from "../types";

export function Painel() {
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarResumo()
      .then(setResumo)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p className="texto-suave">Carregando painel...</p>;
  if (erro) return <p className="mensagem-erro">{erro}</p>;
  if (!resumo) return null;

  return (
    <>
      <h1>Painel</h1>

      <div className="cartoes-resumo">
        <div className="cartao cartao-resumo">
          <div className="valor">{resumo.totalPastilhas}</div>
          <div className="rotulo">Pastilhas cadastradas</div>
        </div>
        <div className="cartao cartao-resumo">
          <div className="valor">{resumo.itensCriticos.length}</div>
          <div className="rotulo">Itens em nível crítico</div>
        </div>
        <div className="cartao cartao-resumo">
          <div className="valor">{resumo.alertasAbertos}</div>
          <div className="rotulo">Alertas de reposição abertos</div>
        </div>
      </div>

      <div className="cartao">
        <h2>Saldo x estoque mínimo dos itens críticos</h2>
        {resumo.itensCriticos.length === 0 ? (
          <p className="texto-suave">Nenhum item abaixo do estoque mínimo no momento.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={resumo.itensCriticos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde3ef" />
              <XAxis dataKey="codigo" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="saldoAtual" name="Saldo atual" fill="#1d3b8b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estoqueMinimo" name="Estoque mínimo" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="cartao">
        <h2>Últimas movimentações</h2>
        {resumo.ultimasMovimentacoes.length === 0 ? (
          <p className="texto-suave">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Pastilha</th>
                <th>Qtde</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {resumo.ultimasMovimentacoes.map((m) => (
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
                  <td>{m.usuario.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
