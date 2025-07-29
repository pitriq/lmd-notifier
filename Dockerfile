FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libxshmfence1 \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && dpkg -i chrome.deb || apt-get -f install -y \
    && rm chrome.deb \
    && which google-chrome-stable \
    && google-chrome-stable --version

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

CMD ["npm", "start"]