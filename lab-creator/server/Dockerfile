FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

#copy prisma folder from build context (host machine)
#int oa folder named prisma in the containers current working directory
COPY prisma ./prisma
#need to create @prisma in node_modules
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .

# RUN mkdir -p /app/uploads && chown node:node /app/uploads
# VOLUME /app/uploads

EXPOSE 4000

# CMD ["npx","nodemon", "app.js"]
# Production run: plain node (nodemon is provided via docker-compose.override.yml for local dev)
CMD ["node", "app.js"]
