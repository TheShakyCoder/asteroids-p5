# Stage 1: Build the Client
FROM oven/bun:latest AS client-builder
WORKDIR /app/client

# Copy client dependencies and install
COPY client/package.json client/bun.lock ./
RUN bun install

# Copy client source and build
COPY client/ ./
COPY .env.production ../.env.production
RUN bun run build

# Stage 2: Build the Server
FROM oven/bun:latest AS server-builder
WORKDIR /app

# Copy root dependencies and install
COPY package.json bun.lock ./
RUN bun install

# Copy server source and build
COPY src/ ./src/
COPY tsconfig.json tsconfig.build.json ./
RUN bun run build:server

# Stage 3: Final Image
FROM oven/bun:latest
WORKDIR /app

# Copy built assets from previous stages
COPY --from=client-builder /app/public ./public
COPY --from=server-builder /app/build ./build
COPY --from=server-builder /app/package.json ./

# Install only production dependencies (optional, but Bun install is fast)
RUN bun install --production

# Expose the Colyseus port
EXPOSE 2567

# Start the server
CMD ["bun", "run", "start:prod"]
