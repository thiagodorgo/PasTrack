import { afterAll, beforeEach } from "vitest";
import { prisma } from "../../src/config/prisma";
import { limparBanco } from "../helpers/banco";

beforeEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prisma.$disconnect();
});
