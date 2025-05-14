# Backend Dockerfile
FROM oven/bun:latest


# Set working directory
WORKDIR /app

# Copy bun.lockb and package.json (if available)
COPY ./package.json ./

# Install dependencies with Bun
RUN npm install --force

# Copy the rest of the backend files
COPY . .

# Expose the backend port
EXPOSE 3001

# Start the backend server
CMD ["bun", "run", "dev"]