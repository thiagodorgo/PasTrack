import { type FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { camposDoErro, codigoDoErro, mensagemDeErro } from "../services/api";
import { alterarSenha } from "../services/auth";
import { BYTES_MAXIMOS_SENHA, problemasDaSenha, TAMANHO_MINIMO_SENHA } from "../utils/senha";

type Campo = "senhaAtual" | "novaSenha" | "confirmacao";
type ErrosDosCampos = Partial<Record<Campo, string>>;

const ORDEM_DOS_CAMPOS: Campo[] = ["senhaAtual", "novaSenha", "confirmacao"];

/** Validação no cliente, espelhando as regras de formato da política de senha. */
function validar(senhaAtual: string, novaSenha: string, confirmacao: string): ErrosDosCampos {
  const erros: ErrosDosCampos = {};
  if (!senhaAtual) erros.senhaAtual = "Informe a senha atual.";
  if (!novaSenha) {
    erros.novaSenha = "Informe a nova senha.";
  } else {
    const problemas = problemasDaSenha(novaSenha);
    if (problemas.length > 0) erros.novaSenha = `A nova senha precisa de ajuste: ${problemas.join("; ")}.`;
  }
  if (!confirmacao) erros.confirmacao = "Repita a nova senha.";
  else if (confirmacao !== novaSenha) erros.confirmacao = "A confirmação não é igual à nova senha.";
  return erros;
}

/** Erros devolvidos pela API, levados ao campo a que se referem. */
function errosDoServidor(erro: unknown): ErrosDosCampos {
  const campos = camposDoErro(erro);
  const erros: ErrosDosCampos = {};
  if (campos.senhaAtual) erros.senhaAtual = campos.senhaAtual;
  if (campos.novaSenha) erros.novaSenha = campos.novaSenha;
  if (codigoDoErro(erro) === "SENHA_ATUAL_INCORRETA" && !erros.senhaAtual) {
    erros.senhaAtual = mensagemDeErro(erro);
  }
  return erros;
}

/**
 * Troca de senha, voluntária (pelo cabeçalho) ou obrigatória (senha temporária).
 * No sucesso, grava o token novo devolvido pela API e vai ao painel.
 */
export function AlterarSenha() {
  const { usuario, atualizarSessao, sair } = useAuth();
  const navegar = useNavigate();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<ErrosDosCampos>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  const campoSenhaAtual = useRef<HTMLInputElement>(null);
  const campoNovaSenha = useRef<HTMLInputElement>(null);
  const campoConfirmacao = useRef<HTMLInputElement>(null);

  const obrigatoria = usuario?.deveTrocarSenha === true;

  function mostrarErros(novos: ErrosDosCampos) {
    setErros(novos);
    // o foco vai ao primeiro campo com erro, e o leitor de tela lê o campo com a mensagem
    const campos = { senhaAtual: campoSenhaAtual, novaSenha: campoNovaSenha, confirmacao: campoConfirmacao };
    const primeiro = ORDEM_DOS_CAMPOS.find((campo) => novos[campo]);
    if (primeiro) campos[primeiro].current?.focus();
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErroGeral("");
    const doCliente = validar(senhaAtual, novaSenha, confirmacao);
    if (Object.keys(doCliente).length > 0) {
      mostrarErros(doCliente);
      return;
    }
    if (!usuario) return;

    setErros({});
    setEnviando(true);
    try {
      const token = await alterarSenha(senhaAtual, novaSenha);
      atualizarSessao(token, { ...usuario, deveTrocarSenha: false });
      navegar("/", { replace: true });
    } catch (e) {
      const doServidor = errosDoServidor(e);
      if (Object.keys(doServidor).length > 0) mostrarErros(doServidor);
      else setErroGeral(mensagemDeErro(e));
      setEnviando(false);
    }
  }

  return (
    <main className="tela-login">
      <div className="cartao-login">
        <h1 id="titulo-alterar-senha" className="titulo-acesso">
          Alterar senha
        </h1>

        {obrigatoria && (
          <Mensagem tipo="info">
            Você entrou com uma senha temporária. Crie uma senha sua para continuar.
          </Mensagem>
        )}
        {erroGeral && <Mensagem tipo="erro">{erroGeral}</Mensagem>}

        <form noValidate onSubmit={aoEnviar} aria-labelledby="titulo-alterar-senha">
          <div className="campo">
            <label>
              Senha atual
              <input
                ref={campoSenhaAtual}
                type="password"
                name="senhaAtual"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                aria-invalid={erros.senhaAtual ? true : undefined}
                aria-describedby={erros.senhaAtual ? "senha-atual-erro" : undefined}
              />
            </label>
            {erros.senhaAtual && (
              <p id="senha-atual-erro" className="erro-campo">
                {erros.senhaAtual}
              </p>
            )}
          </div>

          <div className="campo">
            <label>
              Nova senha
              <input
                ref={campoNovaSenha}
                type="password"
                name="novaSenha"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                aria-invalid={erros.novaSenha ? true : undefined}
                aria-describedby={erros.novaSenha ? "nova-senha-dica nova-senha-erro" : "nova-senha-dica"}
              />
            </label>
            <p id="nova-senha-dica" className="dica-campo">
              De {TAMANHO_MINIMO_SENHA} caracteres a {BYTES_MAXIMOS_SENHA} bytes, com pelo menos uma letra e
              um número.
            </p>
            {erros.novaSenha && (
              <p id="nova-senha-erro" className="erro-campo">
                {erros.novaSenha}
              </p>
            )}
          </div>

          <div className="campo">
            <label>
              Confirme a nova senha
              <input
                ref={campoConfirmacao}
                type="password"
                name="confirmacao"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
                aria-invalid={erros.confirmacao ? true : undefined}
                aria-describedby={erros.confirmacao ? "confirmacao-erro" : undefined}
              />
            </label>
            {erros.confirmacao && (
              <p id="confirmacao-erro" className="erro-campo">
                {erros.confirmacao}
              </p>
            )}
          </div>

          <button className="botao botao-bloco" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>

        {obrigatoria ? (
          <button type="button" className="botao botao-secundario botao-bloco" onClick={() => sair()}>
            Sair
          </button>
        ) : (
          <Link to="/" className="botao botao-secundario botao-bloco">
            Voltar ao painel
          </Link>
        )}
      </div>
    </main>
  );
}
