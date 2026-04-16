FROM node:24-alpine@sha256:ff2c02f071f9e56778013b47d70f7524f5d4eacb032027f0f434838d77cf25e0 AS build

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

FROM nginx:1.30-alpine@sha256:f60d139a69209d4340f6621fc6a50c9843702214231522a3390432f8db0ed870

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
