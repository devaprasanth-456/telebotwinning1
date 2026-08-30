# Base image with Python and Linux
FROM python:3.11-slim

# Install Node.js 18 & build essentials
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and requirements.txt
COPY package*.json ./
COPY requirements.txt ./

# Install dependencies
RUN npm install --omit=dev && pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Expose port for health checks and web service
EXPOSE 3000

# Start 24/7 Master Autonomous Pipeline
CMD ["python", "start_automation.py"]
