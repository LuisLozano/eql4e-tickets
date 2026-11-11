# syntax=docker/dockerfile:1
# Imagen de eql4e-tickets (ADR-0006): compilación en varias etapas, ejecución sin privilegios.

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Dependencias de ejecución (las que el adapter-node deja fuera del bundle).
FROM base AS dependencias
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm install --prod --frozen-lockfile --ignore-scripts

# Compilación.
FROM base AS compilacion
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
	pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Ejecución.
FROM node:24-bookworm-slim
ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	BODY_SIZE_LIMIT=60M \
	RUTA_FICHEROS=/data/ficheros
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY --from=compilacion /app/build ./build
COPY package.json ./
COPY drizzle ./drizzle
COPY scripts/migrar.js scripts/restablecer-acceso.js ./scripts/
COPY --chmod=755 docker-entrypoint.sh ./
RUN mkdir -p /data/ficheros && chown node:node /data/ficheros
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:3000/salud').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
