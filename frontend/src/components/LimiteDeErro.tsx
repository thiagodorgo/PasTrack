import { Component, type ErrorInfo, type ReactNode } from "react";

interface LimiteDeErroProps {
  children: ReactNode;
}

interface EstadoDoLimite {
  erro: Error | null;
}

/**
 * Limite de erro: quando um componente abaixo lança durante a renderização, mostra uma mensagem
 * amigável com um botão para tentar de novo, no lugar de deixar a tela em branco.
 */
export class LimiteDeErro extends Component<LimiteDeErroProps, EstadoDoLimite> {
  state: EstadoDoLimite = { erro: null };

  static getDerivedStateFromError(erro: Error): EstadoDoLimite {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error("Erro não tratado na interface", erro, info.componentStack);
  }

  private tentarDeNovo = () => {
    this.setState({ erro: null });
  };

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="limite-erro" role="alert">
        <h1>Algo deu errado nesta tela</h1>
        <p>Ocorreu um erro inesperado. Tente de novo; se o problema continuar, recarregue a página.</p>
        <button type="button" className="botao" onClick={this.tentarDeNovo}>
          Tentar de novo
        </button>
      </div>
    );
  }
}
