# Build: gera os arquivos estáticos com o Vite.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# o site chama a API no mesmo endereço; o nginx encaminha /api para o container da API
RUN VITE_API_URL=/api npm run build

# Imagem final: nginx sem root, escutando na porta 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
