# Usa la imagen oficial de Node.js
FROM node:18

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar las dependencias
RUN npm install --force

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto del backend
EXPOSE 3001

# Iniciar el servidor (ajusta si usas otro script)
CMD ["npm", "run", "dev"]
