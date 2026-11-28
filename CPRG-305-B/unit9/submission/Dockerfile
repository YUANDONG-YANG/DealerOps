# Test environment for the React application.
# Base image: official Node.js LTS on Alpine keeps the image small while providing node and npm.
FROM node:22-alpine

# Dedicated working directory for the project inside the container.
WORKDIR /app

# Copy only the manifests first so Docker can cache the dependency layer.
COPY package.json package-lock.json ./

# Install project and development dependencies (Jest and React Testing Library included).
RUN npm install

# Copy the remaining project contents (components, tests, public assets).
COPY . .

# CI=true makes react-scripts treat warnings as non-interactive output and exit after the run.
ENV CI=true

# Run the suite once, non-interactively, and write a coverage report to /app/coverage.
CMD ["npm", "test", "--", "--watchAll=false", "--coverage"]
