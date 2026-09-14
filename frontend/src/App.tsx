import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Carregando } from "./components/Carregando";
import { Layout } from "./components/Layout";
import { Protegido } from "./components/Protegido";
import { AuthProvider } from "./contexts/AuthContext";

// Cada página vira um pacote próprio, baixado só quando a rota abre:
// o recharts, por exemplo, fica fora do pacote do login.
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const AlterarSenha = lazy(() => import("./pages/AlterarSenha").then((m) => ({ default: m.AlterarSenha })));
const Painel = lazy(() => import("./pages/Painel").then((m) => ({ default: m.Painel })));
const Pastilhas = lazy(() => import("./pages/Pastilhas").then((m) => ({ default: m.Pastilhas })));
const Movimentacoes = lazy(() => import("./pages/Movimentacoes").then((m) => ({ default: m.Movimentacoes })));
const Alertas = lazy(() => import("./pages/Alertas").then((m) => ({ default: m.Alertas })));
const Fabricantes = lazy(() => import("./pages/Fabricantes").then((m) => ({ default: m.Fabricantes })));
const Fornecedores = lazy(() => import("./pages/Fornecedores").then((m) => ({ default: m.Fornecedores })));
const Usuarios = lazy(() => import("./pages/Usuarios").then((m) => ({ default: m.Usuarios })));
const SemPermissao = lazy(() => import("./pages/SemPermissao").then((m) => ({ default: m.SemPermissao })));
const NaoEncontrado = lazy(() => import("./pages/NaoEncontrado").then((m) => ({ default: m.NaoEncontrado })));

export function App() {
  return (
    // o AuthProvider fica dentro do roteador: ao expirar a sessão, ele navega até o login
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/alterar-senha"
              element={
                <Protegido>
                  <AlterarSenha />
                </Protegido>
              }
            />
            <Route
              path="/"
              element={
                <Protegido>
                  <Layout />
                </Protegido>
              }
            >
              <Route index element={<Painel />} />
              <Route path="pastilhas" element={<Pastilhas />} />
              <Route path="movimentacoes" element={<Movimentacoes />} />
              <Route path="alertas" element={<Alertas />} />
              <Route path="fabricantes" element={<Fabricantes />} />
              <Route path="fornecedores" element={<Fornecedores />} />
              <Route
                path="usuarios"
                element={
                  <Protegido acao="gerenciarUsuarios">
                    <Usuarios />
                  </Protegido>
                }
              />
              <Route path="sem-permissao" element={<SemPermissao />} />
              <Route path="*" element={<NaoEncontrado />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
