FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN npm install -g --omit=dev --no-audit --no-fund serve@14.2.4 \
  && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]
