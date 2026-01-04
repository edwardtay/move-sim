# Use official Node.js image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (only production)
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port (Cloud Run sets this env var, default 8080)
ENV PORT=8080
EXPOSE 8080

# Start command
CMD ["npm", "start"]
