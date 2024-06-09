FROM node:14-slim

ENV DEBIAN_FRONTEND='noninteractive'
ENV LANG='C.UTF-8'
ENV LANGUAGE='C.UTF-8'
ENV LC_ALL='C.UTF-8'
ENV NODE_ENV='production'
ENV TZ='Europe/Moscow'

COPY certs/* /usr/local/share/ca-certificates/

RUN set -eux; \
    apt-get -qq update ; \
    apt-get -y upgrade ;\
    apt-get install -y \
    procps ca-certificates curl; \
    cp /usr/share/zoneinfo/Europe/Moscow /etc/localtime; \
    echo 'Europe/Moscow' > /etc/timezone; \
    cd /usr/local/share/ca-certificates/ && csplit -s -z -f sberbank_ca_pem_individual_ sberbank_ca_pem.crt '/-----BEGIN CERTIFICATE-----/' '{*}' ; \
    rm sberbank_ca_pem.crt; ls sberbank_ca_pem_individual* | while read cert; do mv ${cert} ${cert}.crt; done ;\
    update-ca-certificates --fresh; \
    rm -rf /tmp/* && rm -rf /var/lib/apt/lists/* ;

WORKDIR /app
RUN npm i pm2 webpack webpack-cli -g
COPY package.json .
RUN npm i
COPY . .
RUN webpack
CMD ["pm2-runtime", "start", "./index.js", "--name", "taroirena"]
EXPOSE 4001
