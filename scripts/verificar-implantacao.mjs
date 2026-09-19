// Confere uma instalação recém-criada do PasTrack pelo mesmo caminho que o navegador usa: login do
// administrador, troca obrigatória de senha, cadastros, ciclo do alerta e limite de perfil.
// O roteiro cadastra dados de conferência, então o script só roda enquanto a instalação está vazia.
// Uso: node scripts/verificar-implantacao.mjs --senha <senha do SEED_ADMIN_SENHA> [--url http://localhost:8080]

const AJUDA = `
Uso: node scripts/verificar-implantacao.mjs --senha <senha> [opções]

  --senha <senha>   Senha do administrador inicial, a do SEED_ADMIN_SENHA. Obrigatória.
  --url <endereço>  Endereço do site. Padrão: http://localhost:8080
  --email <e-mail>  E-mail do administrador. Padrão: admin@pastrack.local
  --ajuda           Mostra esta ajuda.

O script recusa instalações que já tenham pastilhas ou outros usuários, para não misturar os dados de
conferência com os dados reais da empresa.
`.trim();

function interpretarArgumentos(argumentos) {
  const opcoes = { url: "http://localhost:8080", email: "admin@pastrack.local", senha: "", ajuda: false };
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i];
    if (argumento === "--ajuda" || argumento === "-h") opcoes.ajuda = true;
    else if (argumento === "--url") opcoes.url = argumentos[++i] ?? "";
    else if (argumento === "--email") opcoes.email = argumentos[++i] ?? "";
    else if (argumento === "--senha") opcoes.senha = argumentos[++i] ?? "";
    else throw new Error(`opção desconhecida: ${argumento}`);
  }
  return opcoes;
}

const opcoes = interpretarArgumentos(process.argv.slice(2));
if (opcoes.ajuda) {
  console.log(AJUDA);
  process.exit(0);
}
if (!opcoes.senha) {
  console.error("verificar-implantacao: informe a senha do administrador com --senha.\n");
  console.error(AJUDA);
  process.exit(2);
}

const BASE = `${opcoes.url.replace(/\/$/, "")}/api`;
/** Senha definitiva do administrador, criada pela conferência. Ela não pode conter o e-mail. */
const SENHA_NOVA = "ConfereInstala2026";
const SENHA_OPERADOR = "ChaoDeFabrica2026";
const conferencias = [];

async function chamar(metodo, caminho, { token, corpo } = {}) {
  const resposta = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      ...(corpo ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null };
}

function conferir(descricao, esperado, obtido) {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtido);
  conferencias.push({ descricao, ok });
  const marca = ok ? "ok  " : "FALHA";
  const detalhe = ok ? "" : ` (esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)})`;
  console.log(`${marca} ${descricao}${detalhe}`);
  return ok;
}

function encerrar(mensagem) {
  console.error(`verificar-implantacao: ${mensagem}`);
  process.exit(2);
}

const saude = await chamar("GET", "/health").catch(() => null);
if (!saude || saude.status !== 200)
  encerrar(`o site não respondeu em ${opcoes.url}. Suba a instalação antes.`);

const login = await chamar("POST", "/auth/login", { corpo: { email: opcoes.email, senha: opcoes.senha } });
if (login.status !== 200) encerrar("o login do administrador falhou. Confira o e-mail e a senha do .env.");
conferir("login do administrador", 200, login.status);

const senhaTemporaria = login.corpo.usuario.deveTrocarSenha;
let token = login.corpo.token;

if (senhaTemporaria) {
  // instalação recém-criada: a senha do .env ainda é temporária e só o /auth responde
  const bloqueada = await chamar("GET", "/pastilhas", { token });
  conferir(
    "com senha temporária, as rotas comuns respondem 403",
    "TROCA_SENHA_OBRIGATORIA",
    bloqueada.corpo.codigo
  );

  const troca = await chamar("PATCH", "/auth/senha", {
    token,
    corpo: { senhaAtual: opcoes.senha, novaSenha: SENHA_NOVA },
  });
  if (troca.status !== 200) encerrar(`a troca de senha falhou: ${JSON.stringify(troca.corpo)}`);
  conferir("troca obrigatória de senha", 200, troca.status);
  token = troca.corpo.token;
  console.log(`\n>>> a senha do administrador agora é ${SENHA_NOVA}. Troque-a ao terminar a conferência.\n`);

  const antigo = await chamar("GET", "/pastilhas", { token: login.corpo.token });
  conferir("o token anterior à troca é recusado", "SESSAO_INVALIDA", antigo.corpo.codigo);
}

// antes de cadastrar qualquer coisa: a conferência só vale numa instalação ainda vazia
const pastilhas = await chamar("GET", "/pastilhas", { token });
const usuarios = await chamar("GET", "/usuarios", { token });
if (pastilhas.corpo.length > 0 || usuarios.corpo.length > 1) {
  encerrar(
    "esta instalação já tem dados. Rode a conferência só numa instalação nova, antes de cadastrar os dados da empresa."
  );
}

const fabricante = await chamar("POST", "/fabricantes", {
  token,
  corpo: { nome: "Fabricante de conferência" },
});
conferir("cadastro de fabricante", 201, fabricante.status);

const fornecedor = await chamar("POST", "/fornecedores", {
  token,
  corpo: { nome: "Fornecedor de conferência", cnpj: "11.222.333/0001-81" },
});
conferir("cadastro de fornecedor com CNPJ", 201, fornecedor.status);

const pastilha = await chamar("POST", "/pastilhas", {
  token,
  corpo: {
    codigo: "CONFERENCIA-1",
    descricao: "Pastilha da conferência",
    unidade: "un",
    estoqueMinimo: 5,
    fabricanteId: fabricante.corpo.id,
  },
});
conferir("cadastro de pastilha", 201, pastilha.status);

const entrada = await chamar("POST", "/movimentacoes", {
  token,
  corpo: {
    tipo: "ENTRADA",
    pastilhaId: pastilha.corpo.id,
    quantidade: 10,
    fornecedorId: fornecedor.corpo.id,
  },
});
conferir("entrada de 10 unidades", 201, entrada.status);

const saida = await chamar("POST", "/movimentacoes", {
  token,
  corpo: { tipo: "SAIDA", pastilhaId: pastilha.corpo.id, quantidade: 5, documento: "OS-CONFERENCIA" },
});
conferir("saída de 5 unidades", 201, saida.status);
conferir(
  "saldo no mínimo",
  5,
  (await chamar("GET", `/pastilhas/${pastilha.corpo.id}`, { token })).corpo.saldoAtual
);
conferir(
  "alerta aberto no mínimo",
  1,
  (await chamar("GET", "/alertas?situacao=ABERTO", { token })).corpo.length
);

const excesso = await chamar("POST", "/movimentacoes", {
  token,
  corpo: { tipo: "SAIDA", pastilhaId: pastilha.corpo.id, quantidade: 99 },
});
conferir("saída acima do saldo é recusada", 400, excesso.status);

const reposicao = await chamar("POST", "/movimentacoes", {
  token,
  corpo: { tipo: "ENTRADA", pastilhaId: pastilha.corpo.id, quantidade: 4, fornecedorId: fornecedor.corpo.id },
});
conferir("reposição acima do mínimo", 201, reposicao.status);
conferir(
  "a reposição fecha o alerta sozinha",
  0,
  (await chamar("GET", "/alertas?situacao=ABERTO", { token })).corpo.length
);

const operador = await chamar("POST", "/usuarios", {
  token,
  corpo: { nome: "Operador de conferência", email: "conferencia@pastrack.local", perfil: "OPERADOR" },
});
conferir("criação de operador com senha temporária", 201, operador.status);

const loginOperador = await chamar("POST", "/auth/login", {
  corpo: { email: "conferencia@pastrack.local", senha: operador.corpo.senhaTemporaria },
});
conferir("login do operador", 200, loginOperador.status);

const trocaOperador = await chamar("PATCH", "/auth/senha", {
  token: loginOperador.corpo.token,
  corpo: { senhaAtual: operador.corpo.senhaTemporaria, novaSenha: SENHA_OPERADOR },
});
conferir("operador troca a senha", 200, trocaOperador.status);

const tentativa = await chamar("POST", "/pastilhas", {
  token: trocaOperador.corpo.token,
  corpo: { codigo: "CONFERENCIA-2", descricao: "Não deve entrar", fabricanteId: fabricante.corpo.id },
});
conferir("o operador não cadastra pastilha", 403, tentativa.status);

const painel = await chamar("GET", "/painel/resumo", { token });
conferir("painel responde", 200, painel.status);
conferir("painel sem itens críticos depois da reposição", 0, painel.corpo.itensCriticos.length);

const falhas = conferencias.filter((conferencia) => !conferencia.ok).length;
console.log(`\n${conferencias.length - falhas}/${conferencias.length} conferências ok`);
if (falhas === 0) {
  console.log(
    "\nA instalação está funcionando. Apague os dados de conferência antes de usar para valer:\n" +
      "  docker compose down -v && docker compose up -d --wait"
  );
}
process.exit(falhas ? 1 : 0);
