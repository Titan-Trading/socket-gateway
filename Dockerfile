FROM node:16

WORKDIR /var/www/html

COPY ./package*.json ./
COPY ./tsconfig.json ./

RUN yarn install

COPY . .

RUN yarn build

# EXPOSE 7777