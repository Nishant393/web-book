# # Stage 1: Build
# FROM node:22.19.0 AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install --legacy-peer-deps
# COPY . .
# ARG BUILD_ENV
# ENV BUILD_ENV=$BUILD_ENV
# RUN npm run build:${BUILD_ENV}
# # Stage 2: Production
# FROM node:22.19.0
# WORKDIR /app
# COPY --from=builder /app/dist ./build
# RUN npm install -g serve
# EXPOSE 3004
# CMD ["serve","-s", "build", "-l", "3004"]

# syntax=docker/dockerfile:1.7

# -----------------------------
# Stage 1: Dependencies
# -----------------------------
FROM node:22.19.0 AS deps

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --legacy-peer-deps --prefer-offline --no-audit --no-fund; else npm install --legacy-peer-deps --prefer-offline --no-audit --no-fund; fi


# -----------------------------
# Stage 2: Build
# -----------------------------
FROM node:22.19.0 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG BUILD_ENV=dev
ENV BUILD_ENV=${BUILD_ENV}

RUN npm run build:${BUILD_ENV}


# -----------------------------
# Stage 3: Production
# -----------------------------
FROM node:22.19.0 AS production

WORKDIR /app

COPY --from=builder /app/dist ./build

RUN --mount=type=cache,target=/root/.npm \
    npm install -g serve --prefer-offline --no-audit --no-fund

EXPOSE 3004

CMD ["serve", "-s", "build", "-l", "3004"]