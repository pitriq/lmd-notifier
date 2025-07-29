# Spanish Embassy Appointment Notifier

This application automatically checks the Spanish Embassy's appointment website for available slots and sends notifications via Telegram to multiple users when appointments become available.

## Features

- **Multi-user support**: Monitor appointments for multiple users simultaneously
- **Efficient checking**: Single appointment check per cycle, then notifies all users
- **Parallel notifications**: All users get notified instantly when slots are found
- **Personalized credentials**: Each user receives their own embassy credentials in notifications

## Prerequisites

- Docker and Docker Compose
- Telegram Bot Token (get it from [@BotFather](https://t.me/botfather))
- Telegram User IDs for each user you want to notify
- Embassy website credentials for each user

## Setup

1. Clone this repository
2. Create a `compose.override.yml` file with your environment variables:
   ```yaml
   services:
     notifier:
       environment:
         - EMBASSY_URL=your_embassy_appointments_url_here
         - TELEGRAM_BOT_TOKEN=your_bot_token_here
         - 'USERS_JSON=[{"telegram_user_id":"123456789","embassy_id":"user1@example.com","embassy_password":"password1"},{"telegram_user_id":"987654321","embassy_id":"user2@example.com","embassy_password":"password2"}]'
         - HEADLESS=true
   ```

### User Configuration Format

The `USERS_JSON` environment variable should contain a JSON array of user objects. Each user object must have:

- `telegram_user_id`: The Telegram user ID to send notifications to
- `embassy_id`: The user's embassy website username/ID
- `embassy_password`: The user's embassy website password

**Example for a single user:**
```json
[{"telegram_user_id":"410079790","embassy_id":"92350447","embassy_password":"your_password"}]
```

**Example for multiple users:**
```json
[
  {
    "telegram_user_id":"410079790",
    "embassy_id":"user1@example.com",
    "embassy_password":"password1"
  },
  {
    "telegram_user_id":"987654321",
    "embassy_id":"user2@example.com", 
    "embassy_password":"password2"
  }
]
```

> **Note**: Make sure to wrap the USERS_JSON value in single quotes in YAML to prevent parsing issues.

## Running with Docker Compose

Start the application:
```bash
docker compose -f docker-compose.yml -f compose.override.yml up -d
```

View logs:
```bash
docker compose -f docker-compose.yml -f compose.override.yml logs -f
```

Stop the application:
```bash
docker compose -f docker-compose.yml -f compose.override.yml down
```

## Development

Install dependencies:
```bash
bun install
```

Run in development mode:
```bash
bun run dev
```

The development script will automatically load environment variables from your `compose.override.yml` file.

## How it works

1. The application runs in a loop, checking for appointments at the configured interval
2. It uses Puppeteer to scrape the embassy website
3. When appointment slots are found, it sends personalized notifications to **all users** via Telegram
4. Each user receives their own embassy credentials in the notification
5. The application runs in headless mode by default, suitable for server deployment

## Configuration

The following environment variables can be configured in the compose files:

- `EMBASSY_URL`: The URL of the embassy appointment page (default: https://www.citaconsular.es/)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token (required)
- `USERS_JSON`: JSON array of users with their telegram_user_id, embassy_id, and embassy_password (required)
- `SCRAPE_INTERVAL_MINUTES`: Check interval in minutes (default: 10)
- `PAGE_TIMEOUT_MS`: Page load timeout in milliseconds (default: 60000)
- `HEADLESS`: Whether to run in headless mode (default: true)

## Getting Your Telegram User ID

To find your Telegram User ID:
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. The bot will reply with your user ID
3. Use this ID in the `telegram_user_id` field
