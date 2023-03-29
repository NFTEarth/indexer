FROM node:16.15

ARG DATABASE_URL
ARG PORT

EXPOSE ${PORT}

WORKDIR /indexer
#disable ipv6
RUN echo ' \n\
net.ipv6.conf.all.disable_ipv6=1 \n\
net.ipv6.conf.default.disable_ipv6=1 \n\
net.ipv6.conf.lo.disable_ipv6=1 \n\
' | tee -a /etc/sysctl.conf

ADD . /indexer
RUN yarn install
RUN yarn build
CMD yarn start
