#!/bin/sh
# Inicialização da API: aplica as migrations, garante o administrador inicial e,
# se SEED_DEMO=true, carrega os dados de demonstração. Qualquer falha interrompe a subida.
set -eu

echo "[inicio] aplicando migrations do banco"
./node_modules/.bin/prisma migrate deploy

echo "[inicio] verificando o administrador inicial"
node dist/scripts/seed.js

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "[inicio] carregando dados de demonstração"
  node dist/scripts/seed-demo.js
fi

echo "[inicio] iniciando a API"
exec "$@"
