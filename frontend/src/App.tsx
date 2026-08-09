import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Protegido } from "./components/Protegido";
import { AuthProvider } from "./contexts/AuthContext";
import { Login } from "./pages/Login";
import { Movimentacoes } from "./pages/Movimentacoes";
import { Painel } from "./pages/Painel";
import { Pastilhas } from "./pages/Pastilhas";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
