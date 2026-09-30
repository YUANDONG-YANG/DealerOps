FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Leave VITE_GATEWAY_URL empty in Azure so the image does not bake localhost:8080.
# Runtime origin: dist/config.json gatewayUrl or window.__DEALER_GATEWAY_URL__.
ARG VITE_GATEWAY_URL=
# CI sets this to the workflow UTC timestamp. Source builds leave it as local.
ARG VITE_PUBLISHED_AT=local
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL \
    VITE_PUBLISHED_AT=$VITE_PUBLISHED_AT
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=build /app/dist ./dist
COPY vite.config.ts docker-entrypoint.cjs ./
EXPOSE 5173
# Writes dist/config.json gatewayUrl from GATEWAY_PUBLIC_URL or VITE_GATEWAY_URL, then preview.
CMD ["node", "docker-entrypoint.cjs"]
