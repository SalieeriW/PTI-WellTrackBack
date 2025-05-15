# Etapa de build
FROM node:18 AS builder

WORKDIR /app

# Copiar y resolver dependencias
COPY package.json package-lock.json ./
RUN npm install --force

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN npm run build

# Etapa final (runtime)
FROM node:18-slim

WORKDIR /app

# Copiar artefactos de la build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Exponer el puerto
EXPOSE 3001

# Arrancar la app compilada
CMD ["node", "dist/index.js"]
