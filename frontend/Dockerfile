FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY . .
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ARG VITE_APP_VERSION
ENV VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

FROM nginx:1.31-alpine@sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV BACKEND_URL=http://localhost:8000
ENV PORT=80

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
