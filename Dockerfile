# Build stage: compile swetest from the Swiss Ephemeris sources
FROM node:22-alpine AS swetest-build

RUN apk add --no-cache git build-base

RUN git clone --depth 1 https://github.com/aloistr/swisseph.git /tmp/swisseph && \
    cd /tmp/swisseph && \
    make swetest

# Runtime stage: only Node, the app and the swetest binary (no compilers)
FROM node:22-alpine

WORKDIR /app

COPY --from=swetest-build /tmp/swisseph/swetest /usr/local/bin/swetest

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY index.js ./

# Copy vendor directory with ephemeris data files
COPY vendor/ ./vendor/

# Run as the image's built-in non-root user
RUN chown -R node:node /app
USER node

# Expose port for HTTP mode
EXPOSE 8000

# Default to stdio mode, can be overridden with environment variables
ENV MCP_HTTP_MODE=false
ENV NODE_ENV=production
ENV SE_EPHE_PATH=/app/vendor/swisseph

# Start the MCP server
CMD ["node", "index.js"]
