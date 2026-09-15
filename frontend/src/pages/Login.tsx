import { type FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { mensagemDeErro } from "../services/api";

export function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation();
  const sessaoExpirou = (state as { motivo?: string } | null)?.motivo === "sessao-expirada";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const usuario = await entrar(email, senha);
      // com a senha temporária, a troca vem antes de qualquer outra tela
      navegar(usuario.deveTrocarSenha ? "/alterar-senha" : "/", { replace: true });
    } catch (e) {
      setErro(mensagemDeErro(e));
      setCarregando(false);
    }
  }

  return (
    <main className="tela-login">
      <form className="cartao-login" onSubmit={aoEnviar} aria-labelledby="titulo-login">
        <h1 id="titulo-login" className="logo logo-login">
          PasTrack
        </h1>
        <p className="texto-suave subtitulo-login">Controle de estoque de pastilhas industriais</p>

        {sessaoExpirou && !erro && (
          <Mensagem tipo="info">Sua sessão expirou. Entre de novo para continuar.</Mensagem>
        )}
        {erro && <Mensagem tipo="erro">{erro}</Mensagem>}

        <label>
          E-mail
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            name="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>

        <button className="botao botao-bloco" disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
