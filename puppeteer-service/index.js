const puppeteer = require('puppeteer');

class PuppeteerService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getPage() {
    if (!this.browser) {
      await this.initBrowser();
    }
    return await this.browser.newPage();
  }
}

module.exports = new PuppeteerService();
