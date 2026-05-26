FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY . .
RUN npm run build

FROM nginx:1.30-alpine@sha256:0272e4604ed93c1792f03695a033a6e8546840f86e0de20a884bb17d2c924883

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV BACKEND_URL=http://localhost:8000
ENV PORT=80

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
