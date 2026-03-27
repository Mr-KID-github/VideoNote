FROM node:20-alpine AS build

WORKDIR /docs

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run docs:build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY --from=build /docs/.vitepress/dist /usr/share/nginx/html

EXPOSE 80
