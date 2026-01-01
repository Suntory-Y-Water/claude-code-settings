import { chromium } from 'playwright';

export async function fetchDynamicHtml(url: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage({
    userAgent: 'bot',
    viewport: { width: 1920, height: 1080 },
  });

  try {
    await page.goto(url, {
      waitUntil: 'load',
      timeout: 30 * 1000,
    });
    await page.waitForSelector('body', { timeout: 30 * 1000 });
    return await page.content();
  } finally {
    await page.close();
    await browser.close();
  }
}
