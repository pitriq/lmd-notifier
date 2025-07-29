import puppeteer from 'puppeteer';

const {
  TELEGRAM_BOT_TOKEN,
  USERS_JSON,
  EMBASSY_URL = 'https://www.citaconsular.es/',
  SCRAPE_INTERVAL_MINUTES = '10',
  PAGE_TIMEOUT_MS = '60000',
  HEADLESS = 'true',
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !USERS_JSON) {
  throw new Error(
    'Missing required environment variables: TELEGRAM_BOT_TOKEN and USERS_JSON must be set',
  );
}

interface User {
  telegram_user_id: string;
  embassy_id: string;
  embassy_password: string;
}

let users: User[];
try {
  users = JSON.parse(USERS_JSON);
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('USERS_JSON must be a non-empty array');
  }

  for (const user of users) {
    if (!user.telegram_user_id || !user.embassy_id || !user.embassy_password) {
      throw new Error(
        'Each user must have telegram_user_id, embassy_id, and embassy_password',
      );
    }
  }
} catch (error) {
  throw new Error(`Invalid USERS_JSON format: ${error}`);
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

async function sendTelegramNotification(message: string, chatId: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    console.error(
      `Failed to send Telegram notification to ${chatId}:`,
      await response.text(),
    );
  }
}

async function checkAppointments(): Promise<boolean> {
  console.log('Starting appointment check...');

  console.log('Launching browser...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: HEADLESS === 'true',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max-old-space-size=2048',
        '--incognito',
      ],
      protocolTimeout: Number(PAGE_TIMEOUT_MS),
      timeout: Number(PAGE_TIMEOUT_MS),
    });
    console.log('Browser launched successfully');
  } catch (error) {
    console.error('Failed to launch browser:', error);
    throw error;
  }

  try {
    console.log('Getting page...');
    const page = (await browser.pages())[0]!;
    await page.setDefaultNavigationTimeout(Number(PAGE_TIMEOUT_MS));
    await page.setDefaultTimeout(Number(PAGE_TIMEOUT_MS));
    console.log('Page configured with timeouts');

    const userAgent = getRandomUserAgent();
    console.log('Using User-Agent:', userAgent);
    await page.setUserAgent(userAgent);

    console.log('Setting extra headers...');
    await page.setExtraHTTPHeaders({
      referer: 'https://www.citaconsular.es/',
    });

    console.log('Setting up dialog handler...');
    page.on('dialog', async (dialog) => {
      console.log('Dialog type:', dialog.type());
      console.log('Dialog message:', dialog.message());
      await new Promise((resolve) => setTimeout(resolve, 1000));
      try {
        await dialog.accept();
        console.log('Dialog accepted successfully');
      } catch (error) {
        console.error('Error accepting dialog:', error);
      }
    });

    console.log(`Navigating to ${EMBASSY_URL}`);
    await page.goto(EMBASSY_URL, {
      waitUntil: 'networkidle0',
      timeout: Number(PAGE_TIMEOUT_MS),
    });
    console.log('Page navigation completed');

    console.log('Waiting for captcha button...');
    await page.waitForSelector('#idCaptchaButton', { visible: true });
    await page.click('#idCaptchaButton');

    console.log('Waiting for services list...');
    await page.waitForSelector('#idListServices');
    const servicesText = await page.$eval(
      '#idListServices',
      (el) => el.textContent || '',
    );

    if (servicesText.includes('LEY MEMORIA')) {
      console.log('Appointment slots found!');
      return true;
    } else {
      console.log('No appointment slots available.');
      return false;
    }
  } catch (error) {
    console.error('Error during scraping:', error);
    return false;
  } finally {
    await browser.close();
  }
}

async function notifyAllUsers() {
  console.log(`Sending notifications to ${users.length} users...`);

  await Promise.allSettled(
    users.map((user) =>
      sendTelegramNotification(
        [
          '🚨 Appointment slot available for LEY MEMORIA DEMOCRATICA!',
          `Username: <code>${user.embassy_id}</code>\nPassword: <code>${user.embassy_password}</code>`,
          'URL: https://tinyurl.com/4jux82ry',
        ].join('\n\n'),
        user.telegram_user_id,
      ),
    ),
  );

  console.log('Notifications sent to all users.');
}

async function main() {
  console.log(`Starting monitoring for ${users.length} users...`);

  while (true) {
    const appointmentsAvailable = await checkAppointments();
    if (appointmentsAvailable) await notifyAllUsers();
    const interval = Number(SCRAPE_INTERVAL_MINUTES) * 60 * 1000;
    console.log(
      `Waiting ${SCRAPE_INTERVAL_MINUTES} minutes before next check...`,
    );
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

main().catch(console.error);
