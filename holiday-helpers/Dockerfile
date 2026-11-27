FROM node:22-alpine
WORKDIR /app
COPY server.js lists.json ./
COPY public ./public
ENV PORT=3000 DATA_DIR=/data TRUST_PROXY=1
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
