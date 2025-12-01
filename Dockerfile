# Use Node.js 18 on Debian (glibc-compatible, not Alpine)
FROM node:18

# Set working directory
WORKDIR /app

# Install system dependencies for Haskell binaries (glibc-based)
RUN apt-get update && \
    apt-get install -y \
        libgmp10 \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy entire project (including bin/ with Haskell binaries)
COPY . .

# Make Haskell binaries executable
RUN chmod +x bin/fml_linux bin/fml_darwin bin/fml_win32

# Test binary (optional but recommended)
RUN bin/fml_linux -c 'script ()\nTest => (div $ "OK")'

# Expose port
EXPOSE 3000

# Start unified server
CMD ["node", "dist/server.js"]
