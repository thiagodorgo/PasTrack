import request from "supertest";
import { app } from "../../src/app";

export const api = () => request(app);

export function autorizacao(token: string) {
  return { Authorization: `Bearer ${token}` };
}
