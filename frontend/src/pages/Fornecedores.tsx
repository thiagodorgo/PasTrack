import { type FormEvent, useEffect, useRef, useState } from "react";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { camposDoErro, mensagemDeErro } from "../services/api";
import { atualizarFornecedor, criarFornecedor, listarFornecedores } from "../services/cadastros";
import type { Fornecedor } from "../types";
import { validarCnpj } from "../utils/formato";

/** "novo" abre o formulário em branco; um fornecedor abre o mesmo formulário preenchido. */
type Formulario = Fornecedor | "novo" | null;

export function Fornecedores() {
  const { pode } = useAuth();
  const podeGerenciar = pode("gerenciarFornecedores");

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const campoNome = useRef<HTMLInputElement>(null);
  const campoCnpj = useRef<HTMLInputElement>(null);
  const botaoNovo = useRef<HTMLButtonElement>(null);

  function carregar() {
    return listarFornecedores()
      .then(setFornecedores)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  // o formulário recebe o foco assim que abre, para quem usa teclado ou leitor de tela
  useEffect(() => {
    if (formulario) campoNome.current?.focus();
  }, [formulario]);

  function abrir(alvo: Formulario) {
    setErro("");
    setSucesso("");
    setErros({});
    const atual = alvo && alvo !== "novo" ? alvo : null;
    setNome(atual?.nome ?? "");
    setCnpj(atual?.cnpj ?? "");
    setContato(atual?.contato ?? "");
    setFormulario(alvo);
  }

  function fechar() {
    setFormulario(null);
    botaoNovo.current?.focus();
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario) return;
    const dados = { nome: nome.trim(), cnpj: cnpj.trim(), contato: contato.trim() };

    // as mesmas checagens da API, para o erro aparecer sem ida ao servidor
    const problemas: Record<string, string> = {};
    if (!dados.nome) problemas.nome = "Informe o nome do fornecedor.";
    if (dados.cnpj && !validarCnpj(dados.cnpj)) problemas.cnpj = "CNPJ inválido.";
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      (problemas.nome ? campoNome : campoCnpj).current?.focus();
      return;
    }

    setErros({});
    setSalvando(true);
    try {
      if (formulario === "novo") {
        const criado = await criarFornecedor(dados);
        setSucesso(`Fornecedor ${criado.nome} cadastrado.`);
      } else {
        const salvo = await atualizarFornecedor(formulario.id, dados);
        setSucesso(`Fornecedor ${salvo.nome} atualizado.`);
      }
      setFormulario(null);
      botaoNovo.current?.focus();
      await carregar();
    } catch (e) {
      const campos = camposDoErro(e);
      // o 409 de CNPJ repetido não vem por campo: ele aparece no campo do CNPJ
      const mensagem = mensagemDeErro(e);
      const novos = Object.keys(campos).length > 0 ? campos : { cnpj: mensagem };
      setErros(novos);
      (novos.nome ? campoNome : campoCnpj).current?.focus();
    } finally {
      setSalvando(false);
    }
  }

  const editando = formulario && formulario !== "novo" ? formulario : null;

  return (
    <>
      <div className="cabecalho-pagina">
        <h1>Fornecedores</h1>
        {podeGerenciar && (
          <button
            ref={botaoNovo}
            type="button"
            className="botao"
            aria-expanded={formulario !== null}
            onClick={() => (formulario ? fechar() : abrir("novo"))}
          >
            {formulario ? "Fechar" : "Novo fornecedor"}
          </button>
        )}
      </div>
      <p className="texto-suave">
        Quem fornece as pastilhas. O fornecedor é obrigatório no registro de entrada.
      </p>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      {formulario && (
        <form
          className="cartao formulario"
          onSubmit={aoSalvar}
          aria-label={editando ? `Editar ${editando.nome}` : "Novo fornecedor"}
          noValidate
        >
          <label>
            Nome
            <input
              ref={campoNome}
              value={nome}
              maxLength={150}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros.nome ? true : undefined}
              aria-describedby={erros.nome ? "erro-nome-fornecedor" : undefined}
            />
          </label>
          {erros.nome && (
            <Mensagem tipo="erro" id="erro-nome-fornecedor">
              {erros.nome}
            </Mensagem>
          )}
          <label>
            CNPJ
            <input
              ref={campoCnpj}
              value={cnpj}
              maxLength={18}
              placeholder="00.000.000/0000-00"
              onChange={(e) => setCnpj(e.target.value)}
              aria-invalid={erros.cnpj ? true : undefined}
              aria-describedby={erros.cnpj ? "erro-cnpj-fornecedor" : "ajuda-cnpj"}
            />
          </label>
          {erros.cnpj ? (
            <Mensagem tipo="erro" id="erro-cnpj-fornecedor">
              {erros.cnpj}
            </Mensagem>
          ) : (
            <p className="texto-suave" id="ajuda-cnpj">
              Opcional. Pode ser digitado com ou sem pontuação.
            </p>
          )}
          <label>
            Contato
            <input
              value={contato}
              maxLength={150}
              placeholder="Telefone ou e-mail"
              onChange={(e) => setContato(e.target.value)}
            />
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

      <div className="cartao">
        {carregando ? (
          <Carregando texto="Carregando fornecedores..." />
        ) : fornecedores.length === 0 ? (
          <p className="texto-suave">Nenhum fornecedor cadastrado.</p>
        ) : (
          <div className="tabela-rolavel">
            <table>
              <caption className="sr-only">Fornecedores cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">CNPJ</th>
                  <th scope="col">Contato</th>
                  {podeGerenciar && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((fornecedor) => (
                  <tr key={fornecedor.id}>
                    <td>{fornecedor.nome}</td>
                    <td>{fornecedor.cnpj ?? "—"}</td>
                    <td>{fornecedor.contato ?? "—"}</td>
                    {podeGerenciar && (
                      <td>
                        <button
                          type="button"
                          className="botao botao-secundario"
                          aria-label={`Editar ${fornecedor.nome}`}
                          onClick={() => abrir(fornecedor)}
                        >
                          Editar
                        </button>
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
