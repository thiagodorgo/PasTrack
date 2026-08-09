import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { mensagemDeErro } from "../services/api";

export function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await entrar(email, senha);
      navegar("/");
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-login">
      <form className="cartao-login" onSubmit={aoEnviar}>
        <div className="logo" style={{ color: "#1d3b8b", padding: 0, marginBottom: 24 }}>
          PasTrack
        </div>
        <p className="texto-suave" style={{ marginBottom: 20 }}>
          Controle de estoque de pastilhas industriais
        </p>

        {erro && (
          <p className="mensagem-erro" style={{ marginBottom: 14 }}>
            {erro}
          </p>
        )}

        <label style={{ marginBottom: 12 }}>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label style={{ marginBottom: 20 }}>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>

        <button className="botao" style={{ width: "100%" }} disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
