# Use official Node.js runtime as base image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the React app
RUN npm run build

# Install serve to run the built app
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Command to serve the app
CMD ["serve", "-s", "build", "-l", "3000"]