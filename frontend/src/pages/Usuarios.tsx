import { Ban, Check, Info, KeyRound, MoreHorizontal, RotateCcw } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TabelaRolavel } from "../components/TabelaRolavel";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { camposDoErro, mensagemDeErro } from "../services/api";
import {
  atualizarUsuario,
  criarUsuario,
  definirAtivo,
  listarUsuarios,
  redefinirSenha,
} from "../services/usuarios";
import type { Perfil, UsuarioGerenciado } from "../types";
import { PERFIS, ROTULOS_PERFIL } from "../utils/permissoes";

/** "novo" abre o formulário em branco; um usuário abre o mesmo formulário preenchido. */
type Formulario = UsuarioGerenciado | "novo" | null;

/** Ação que pede confirmação antes de valer. */
type Confirmacao = { tipo: "desativar" | "redefinir"; usuario: UsuarioGerenciado } | null;

/** Senha temporária recém-gerada: aparece uma única vez, até quem cadastrou fechar o aviso. */
type SenhaGerada = { nome: string; senha: string } | null;

export function Usuarios() {
  const { usuario: eu } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioGerenciado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("OPERADOR");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<SenhaGerada>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [processando, setProcessando] = useState(false);
  const [copiada, setCopiada] = useState(false);
  // linha com o menu "mais ações" aberto
  const [menuAberto, setMenuAberto] = useState<number | null>(null);

  const campoNome = useRef<HTMLInputElement>(null);
  const botaoNovo = useRef<HTMLButtonElement>(null);
  const botaoConfirmar = useRef<HTMLButtonElement>(null);
  const avisoSenha = useRef<HTMLDivElement>(null);
  const areaMenu = useRef<HTMLDivElement>(null);

  // fecha o menu de ações ao clicar fora dele ou apertar Esc
  useEffect(() => {
    if (menuAberto === null) return;
    function cliqueFora(evento: MouseEvent) {
      if (!areaMenu.current?.contains(evento.target as Node)) setMenuAberto(null);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(null);
    }
    document.addEventListener("mousedown", cliqueFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cliqueFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [menuAberto]);

  function carregar() {
    return listarUsuarios()
      .then(setUsuarios)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (formulario) campoNome.current?.focus();
  }, [formulario]);

  useEffect(() => {
    if (confirmacao) botaoConfirmar.current?.focus();
  }, [confirmacao]);

  // o aviso com a senha temporária recebe o foco: ele só aparece uma vez e não pode passar batido
  useEffect(() => {
    if (senhaGerada) avisoSenha.current?.focus();
  }, [senhaGerada]);

  function limparMensagens() {
    setErro("");
    setSucesso("");
    setErros({});
  }

  function abrir(alvo: Formulario) {
    limparMensagens();
    const atual = alvo && alvo !== "novo" ? alvo : null;
    setNome(atual?.nome ?? "");
    setEmail(atual?.email ?? "");
    setPerfil(atual?.perfil ?? "OPERADOR");
    setFormulario(alvo);
  }

  function fechar() {
    setFormulario(null);
    botaoNovo.current?.focus();
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario) return;
    const dados = { nome: nome.trim(), email: email.trim().toLowerCase(), perfil };

    const problemas: Record<string, string> = {};
    if (dados.nome.length < 2) problemas.nome = "Informe o nome, com pelo menos 2 caracteres.";
    if (formulario === "novo" && !dados.email) problemas.email = "Informe o e-mail.";
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      campoNome.current?.focus();
      return;
    }

    setErros({});
    setSalvando(true);
    try {
      if (formulario === "novo") {
        const criado = await criarUsuario(dados);
        setSenhaGerada({ nome: criado.nome, senha: criado.senhaTemporaria });
        setSucesso(`Usuário ${criado.nome} cadastrado.`);
      } else {
        const salvo = await atualizarUsuario(formulario.id, { nome: dados.nome, perfil: dados.perfil });
        setSucesso(`Usuário ${salvo.nome} atualizado.`);
      }
      setFormulario(null);
      await carregar();
    } catch (e) {
      const campos = camposDoErro(e);
      if (Object.keys(campos).length > 0) setErros(campos);
      else setErro(mensagemDeErro(e));
      campoNome.current?.focus();
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(alvo: UsuarioGerenciado) {
    limparMensagens();
    setProcessando(true);
    try {
      const salvo = await definirAtivo(alvo.id, !alvo.ativo);
      setSucesso(`Usuário ${salvo.nome} ${salvo.ativo ? "reativado" : "desativado"}.`);
      await carregar();
    } catch (e) {
      // o 409 das travas de administrador chega aqui com a mensagem da API
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(false);
      setConfirmacao(null);
    }
  }

  async function redefinir(alvo: UsuarioGerenciado) {
    limparMensagens();
    setProcessando(true);
    try {
      const senha = await redefinirSenha(alvo.id);
      setSenhaGerada({ nome: alvo.nome, senha });
      setSucesso(`Senha de ${alvo.nome} redefinida.`);
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(false);
      setConfirmacao(null);
    }
  }

  async function copiarSenha() {
    if (!senhaGerada) return;
    try {
      await navigator.clipboard?.writeText(senhaGerada.senha);
      setCopiada(true);
    } catch {
      // sem permissão de área de transferência: a senha continua visível para copiar à mão
      setCopiada(false);
    }
  }

  const editando = formulario && formulario !== "novo" ? formulario : null;
  const ativos = usuarios.filter((u) => u.ativo).length;

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Usuários</h1>
          {!carregando && (
            <p className="subtitulo">
              {usuarios.length} {usuarios.length === 1 ? "usuário" : "usuários"} · {ativos}{" "}
              {ativos === 1 ? "ativo" : "ativos"}
            </p>
          )}
        </div>
        <button
          ref={botaoNovo}
          type="button"
          className="botao"
          aria-expanded={formulario !== null}
          onClick={() => (formulario ? fechar() : abrir("novo"))}
        >
          {formulario ? (
            "Fechar"
          ) : (
            <>
              <span aria-hidden="true">+</span> Novo usuário
            </>
          )}
        </button>
      </header>
      <p className="aviso-info">
        <Info size={16} strokeWidth={2} aria-hidden="true" />
        <span>
          Usuario que for demitido ou que não tiver mais acesso ao sistema deve ser desativado, para que não
          consiga entrar. O histórico dele continua no sistema.
        </span>
      </p>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      {senhaGerada && (
        <div
          ref={avisoSenha}
          className="cartao"
          role="group"
          aria-labelledby="titulo-senha-temporaria"
          tabIndex={-1}
        >
          <p id="titulo-senha-temporaria">
            <strong>Senha temporária de {senhaGerada.nome}</strong>
          </p>
          <p className="senha-temporaria">
            <code>{senhaGerada.senha}</code>
          </p>
          <p className="texto-suave">
            Ela aparece uma única vez. Entregue ao usuário, que vai trocá-la no primeiro acesso.
          </p>
          <div className="grupo-botoes">
            <button type="button" className="botao botao-secundario" onClick={copiarSenha}>
              {copiada ? "Copiada" : "Copiar"}
            </button>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => {
                setSenhaGerada(null);
                setCopiada(false);
                botaoNovo.current?.focus();
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {formulario && (
        <form
          className="cartao formulario"
          onSubmit={aoSalvar}
          aria-label={editando ? `Editar ${editando.nome}` : "Novo usuário"}
          noValidate
        >
          <label>
            Nome
            <input
              ref={campoNome}
              value={nome}
              maxLength={120}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros.nome ? true : undefined}
              aria-describedby={erros.nome ? "erro-nome-usuario" : undefined}
            />
          </label>
          {erros.nome && (
            <Mensagem tipo="erro" id="erro-nome-usuario">
              {erros.nome}
            </Mensagem>
          )}
          {editando ? (
            <p className="texto-suave">E-mail: {editando.email}. O e-mail não muda depois do cadastro.</p>
          ) : (
            <>
              <label>
                E-mail
                <input
                  type="email"
                  value={email}
                  maxLength={254}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={erros.email ? true : undefined}
                  aria-describedby={erros.email ? "erro-email-usuario" : undefined}
                />
              </label>
              {erros.email && (
                <Mensagem tipo="erro" id="erro-email-usuario">
                  {erros.email}
                </Mensagem>
              )}
            </>
          )}
          <label>
            Perfil
            <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
              {PERFIS.map((valor) => (
                <option key={valor} value={valor}>
                  {ROTULOS_PERFIL[valor]}
                </option>
              ))}
            </select>
          </label>
          {erros.perfil && <Mensagem tipo="erro">{erros.perfil}</Mensagem>}
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

      {confirmacao && (
        <div className="cartao" role="group" aria-labelledby="confirmacao-usuario">
          <p id="confirmacao-usuario">
            <strong>
              {confirmacao.tipo === "desativar"
                ? `Desativar ${confirmacao.usuario.nome}?`
                : `Redefinir a senha de ${confirmacao.usuario.nome}?`}
            </strong>
          </p>
          <p className="texto-suave">
            {confirmacao.tipo === "desativar"
              ? "Ele perde o acesso na hora, inclusive nas sessões abertas. O histórico dele continua no sistema."
              : "A senha atual deixa de valer na hora e uma senha temporária é gerada, mostrada uma única vez."}
          </p>
          <div className="grupo-botoes">
            <button
              ref={botaoConfirmar}
              type="button"
              className="botao"
              disabled={processando}
              onClick={() =>
                confirmacao.tipo === "desativar"
                  ? alternarAtivo(confirmacao.usuario)
                  : redefinir(confirmacao.usuario)
              }
            >
              {processando ? "Aplicando..." : "Confirmar"}
            </button>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => setConfirmacao(null)}
              disabled={processando}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="cartao cartao-tabela">
        {carregando ? (
          <Carregando texto="Carregando usuários..." />
        ) : usuarios.length === 0 ? (
          <p className="texto-suave vazio">Nenhum usuário cadastrado.</p>
        ) : (
          <TabelaRolavel nome="Usuários cadastrados">
            <table className="tabela-usuarios">
              <caption className="sr-only">Usuários cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Usuário</th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => {
                  const souEu = usuario.id === eu?.id;
                  return (
                    <tr key={usuario.id}>
                      <td>
                        <div className="usuario-celula">
                          <span className="avatar-claro" aria-hidden="true">
                            {usuario.nome.trim().charAt(0).toLocaleUpperCase("pt-BR")}
                          </span>
                          <div className="item-identidade">
                            <span className="usuario-nome">
                              {usuario.nome}
                              {souEu && <span className="texto-suave"> (você)</span>}
                            </span>
                            <span className="texto-medio usuario-email">{usuario.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="etiqueta">{ROTULOS_PERFIL[usuario.perfil]}</span>
                      </td>
                      <td>
                        {usuario.ativo ? (
                          <span className="selo selo-ok">
                            <Check size={12} strokeWidth={3} aria-hidden="true" />
                            Ativo
                          </span>
                        ) : (
                          <span className="selo selo-neutro">Inativo</span>
                        )}
                      </td>
                      <td>
                        <div className="acoes-linha">
                          <button
                            type="button"
                            className="botao-contorno botao-pequeno"
                            aria-label={`Editar ${usuario.nome}`}
                            onClick={() => abrir(usuario)}
                          >
                            Editar
                          </button>
                          <div className="menu-acoes" ref={menuAberto === usuario.id ? areaMenu : undefined}>
                            <button
                              type="button"
                              className="botao-icone botao-mais"
                              aria-label={`Mais ações para ${usuario.nome}`}
                              aria-expanded={menuAberto === usuario.id}
                              onClick={() => setMenuAberto(menuAberto === usuario.id ? null : usuario.id)}
                            >
                              <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
                            </button>
                            {menuAberto === usuario.id && (
                              <ul className="menu-acoes-opcoes">
                                <li>
                                  <button
                                    type="button"
                                    aria-label={`Redefinir a senha de ${usuario.nome}`}
                                    disabled={processando}
                                    onClick={() => {
                                      setMenuAberto(null);
                                      setConfirmacao({ tipo: "redefinir", usuario });
                                    }}
                                  >
                                    <KeyRound size={16} aria-hidden="true" />
                                    Redefinir senha
                                  </button>
                                </li>
                                <li>
                                  {souEu ? (
                                    <p className="menu-acoes-nota">
                                      Você não pode desativar o próprio usuário.
                                    </p>
                                  ) : usuario.ativo ? (
                                    <button
                                      type="button"
                                      className="perigo"
                                      aria-label={`Desativar ${usuario.nome}`}
                                      disabled={processando}
                                      onClick={() => {
                                        setMenuAberto(null);
                                        setConfirmacao({ tipo: "desativar", usuario });
                                      }}
                                    >
                                      <Ban size={16} aria-hidden="true" />
                                      Desativar usuário
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      aria-label={`Reativar ${usuario.nome}`}
                                      disabled={processando}
                                      onClick={() => {
                                        setMenuAberto(null);
                                        alternarAtivo(usuario);
                                      }}
                                    >
                                      <RotateCcw size={16} aria-hidden="true" />
                                      Reativar usuário
                                    </button>
                                  )}
                                </li>
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
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
