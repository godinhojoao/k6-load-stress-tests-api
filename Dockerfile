FROM node:22

WORKDIR /usr/src/app

COPY api.js .

EXPOSE 3000

CMD ["node", "api.js"]
