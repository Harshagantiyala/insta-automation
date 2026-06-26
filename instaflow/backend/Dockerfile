# InstaFlow Backend - multi-purpose image (API server + workers)
# The actual process started is decided by docker-compose's `command:`
# override per service, so one image serves all three roles.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production

EXPOSE 4000

# Default command runs the API server; docker-compose overrides this for
# the dm-worker and fallback-worker services.
CMD ["node", "src/server.js"]
