FROM node:24-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]