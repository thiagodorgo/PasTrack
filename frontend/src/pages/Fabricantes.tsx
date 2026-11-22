import { Info } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { TabelaRolavel } from "../components/TabelaRolavel";
import { Carregando } from "../components/Carregando";
import { Mensagem } from "../components/Mensagem";
import { useAuth } from "../contexts/AuthContext";
import { camposDoErro, mensagemDeErro } from "../services/api";
import { atualizarFabricante, criarFabricante, listarFabricantes } from "../services/cadastros";
import { listarPastilhas } from "../services/pastilhas";
import type { Fabricante } from "../types";

/** "novo" abre o formulário em branco; um fabricante abre o mesmo formulário preenchido. */
type Formulario = Fabricante | "novo" | null;

export function Fabricantes() {
  const { pode } = useAuth();
  const podeGerenciar = pode("gerenciarFabricantes");

  const [fabricantes, setFabricantes] = useState<Fabricante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campoNome = useRef<HTMLInputElement>(null);
  const botaoNovo = useRef<HTMLButtonElement>(null);

  function carregar() {
    return listarFabricantes()
      .then(setFabricantes)
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }

  // quantas pastilhas cada fabricante tem; se a lista não carregar, a contagem só não aparece
  const [pastilhasPorFabricante, setPastilhasPorFabricante] = useState<Map<number, number> | null>(null);

  useEffect(() => {
    carregar();
    listarPastilhas()
      .then((lista) => {
        const contagem = new Map<number, number>();
        for (const p of lista) contagem.set(p.fabricante.id, (contagem.get(p.fabricante.id) ?? 0) + 1);
        setPastilhasPorFabricante(contagem);
      })
      .catch(() => undefined);
  }, []);

  // o formulário recebe o foco assim que abre, para quem usa teclado ou leitor de tela
  useEffect(() => {
    if (formulario) campoNome.current?.focus();
  }, [formulario]);

  function abrir(alvo: Formulario) {
    setErro("");
    setSucesso("");
    setErroNome("");
    setNome(alvo && alvo !== "novo" ? alvo.nome : "");
    setFormulario(alvo);
  }

  function fechar() {
    setFormulario(null);
    botaoNovo.current?.focus();
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario) return;
    const informado = nome.trim();
    if (!informado) {
      setErroNome("Informe o nome do fabricante.");
      campoNome.current?.focus();
      return;
    }
    setErroNome("");
    setSalvando(true);
    try {
      if (formulario === "novo") {
        const criado = await criarFabricante({ nome: informado });
        setSucesso(`Fabricante ${criado.nome} cadastrado.`);
      } else {
        const salvo = await atualizarFabricante(formulario.id, { nome: informado });
        setSucesso(`Fabricante ${salvo.nome} atualizado.`);
      }
      setFormulario(null);
      botaoNovo.current?.focus();
      await carregar();
    } catch (e) {
      // o 409 de nome repetido e o 400 de campo inválido aparecem no próprio campo
      const campos = camposDoErro(e);
      setErroNome(campos.nome ?? mensagemDeErro(e));
      campoNome.current?.focus();
    } finally {
      setSalvando(false);
    }
  }

  const editando = formulario && formulario !== "novo" ? formulario : null;

  return (
    <>
      <header className="cabecalho-pagina">
        <div>
          <h1>Fabricantes</h1>
          {!carregando && (
            <p className="subtitulo">
              {fabricantes.length} {fabricantes.length === 1 ? "fabricante" : "fabricantes"}
              {pastilhasPorFabricante &&
                ` · ${[...pastilhasPorFabricante.values()].reduce((a, b) => a + b, 0)} pastilhas no catálogo`}
            </p>
          )}
        </div>
        {podeGerenciar && (
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
                <span aria-hidden="true">+</span> Novo fabricante
              </>
            )}
          </button>
        )}
      </header>
      <p className="aviso-info">
        <Info size={16} strokeWidth={2} aria-hidden="true" />
        <span>Marcas das pastilhas. Cada pastilha pertence a um fabricante.</span>
      </p>

      {erro && <Mensagem tipo="erro">{erro}</Mensagem>}
      {sucesso && <Mensagem tipo="sucesso">{sucesso}</Mensagem>}

      {formulario && (
        <form
          className="cartao formulario"
          onSubmit={aoSalvar}
          aria-label={editando ? `Editar ${editando.nome}` : "Novo fabricante"}
          noValidate
        >
          <label>
            Nome
            <input
              ref={campoNome}
              value={nome}
              maxLength={100}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erroNome ? true : undefined}
              aria-describedby={erroNome ? "erro-nome-fabricante" : undefined}
            />
          </label>
          {erroNome && (
            <Mensagem tipo="erro" id="erro-nome-fabricante">
              {erroNome}
            </Mensagem>
          )}
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

      <div className="cartao cartao-tabela">
        {carregando ? (
          <Carregando texto="Carregando fabricantes..." />
        ) : fabricantes.length === 0 ? (
          <p className="texto-suave vazio">Nenhum fabricante cadastrado.</p>
        ) : (
          <TabelaRolavel nome="Fabricantes cadastrados">
            <table className="tabela-fabricantes">
              <caption className="sr-only">Fabricantes cadastrados</caption>
              <thead>
                <tr>
                  <th scope="col">Fabricante</th>
                  {podeGerenciar && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {fabricantes.map((fabricante) => {
                  const total = pastilhasPorFabricante?.get(fabricante.id) ?? 0;
                  return (
                    <tr key={fabricante.id}>
                      <td>
                        <div className="usuario-celula">
                          <span className="avatar-claro" aria-hidden="true">
                            {fabricante.nome.trim().charAt(0).toLocaleUpperCase("pt-BR")}
                          </span>
                          <div className="item-identidade">
                            <span className="usuario-nome">{fabricante.nome}</span>
                            {pastilhasPorFabricante && (
                              <span className="texto-medio usuario-email">
                                {total === 0
                                  ? "Nenhuma pastilha"
                                  : `${total} ${total === 1 ? "pastilha" : "pastilhas"}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {podeGerenciar && (
                        <td>
                          <div className="acoes-linha">
                            <button
                              type="button"
                              className="botao-contorno botao-pequeno"
                              aria-label={`Editar ${fabricante.nome}`}
                              onClick={() => abrir(fabricante)}
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      )}
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
