# Ludo: Telegram bot + Mini App (Node 22, Express, WebSocket, Telegraf)
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Build-time values baked into the Mini App. Set them as Render env vars.
ARG BOT_USERNAME=""
ARG MINIAPP_SHORT_NAME="ludo"
RUN VITE_BOT_USERNAME="${BOT_USERNAME}" \
    VITE_MINIAPP_SHORT="${MINIAPP_SHORT_NAME}" \
    npm run build

ENV NODE_ENV=production
CMD ["npm", "start"]
