#FROM node:16-alpine as build
#
#WORKDIR /app
#
## Copy package files
#COPY package*.json ./
#
## Install dependencies
#RUN npm install
#
## Copy app source
#COPY . .
#
## Build the app
#RUN npm run build
#
## Production environment
#FROM nginx:alpine
#
## Copy built files from build stage
#COPY --from=build /app/build /usr/share/nginx/html
#
## Copy nginx configuration
#COPY nginx.conf /etc/nginx/conf.d/default.conf
#
## Expose port
#EXPOSE 3000
#
## Start Nginx server
#CMD ["nginx", "-g", "daemon off;"]
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]