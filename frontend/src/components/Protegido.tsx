import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { estaAutenticado } from "../services/auth";

export function Protegido({ children }: { children: ReactNode }) {
  if (!estaAutenticado()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
