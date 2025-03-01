const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const request = require('request');
const path = require('path');

// Подключаем плагин для скрытия автоматизации
puppeteer.use(StealthPlugin());

class LoginController {
  static async login(req, res) {
    let browser;
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email и пароль обязательны' });
      }

      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      );

      await page.goto('https://onlyfans.com/', { waitUntil: 'networkidle2' });

      // CAPTCHA handling (unchanged)
      const captchaSelector = 'iframe[src*="hcaptcha"]';
      const captchaPresent = await page.$(captchaSelector);
      if (captchaPresent) {
        console.log('CAPTCHA обнаружена, решаем через RuCaptcha...');
        const siteKey = await page.evaluate(() => {
          return document.querySelector('iframe[src*="hcaptcha"]').dataset.sitekey;
        });
        const captchaId = await sendCaptchaToRuCaptcha(siteKey, page.url());
        const captchaToken = await getCaptchaSolution(captchaId);
        if (captchaToken) {
          await page.evaluate((token) => {
            document.querySelector('textarea[name="h-captcha-response"]').value = token;
          }, captchaToken);
          await page.click('button[type="submit"]', { delay: 100 });
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
        } else {
          throw new Error('Не удалось решить CAPTCHA');
        }
      } else {
        console.log('CAPTCHA не обнаружена, продолжаем...');
      }

      // Fill email and password fields
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.type('input[name="email"]', email);
      await page.type('input[name="password"]', password);

      // Find and click the "Авторизуйтесь" button
      const button = await page.$('button.g-btn.m-rounded.m-block.m-md.mb-0');
      if (button) {
        await button.click();
      } else {
        throw new Error('Кнопка "Авторизуйтесь" не найдена');
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      await page.screenshot({
        fullPage: true,
        path: path.join(__dirname, '../screenshots', 'screenshot.png'),
      });

      res.status(200).json({
        success: true,
        url: page.url(),
      });
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      if (browser) await browser.close();
    }
  }
}

// Функция для отправки CAPTCHA на RuCaptcha
function sendCaptchaToRuCaptcha(siteKey, pageUrl) {
  return new Promise((resolve, reject) => {
    const apiKey = '4a55e80727c2054001be94655212d6d7'; // Замените на ваш API-ключ
    const url = `http://rucaptcha.com/in.php?key=${apiKey}&method=hcaptcha&sitekey=${siteKey}&pageurl=${encodeURIComponent(
      pageUrl,
    )}`;

    request(url, (error, response, body) => {
      if (error) return reject(error);
      if (body.startsWith('OK|')) {
        resolve(body.split('|')[1]); // Возвращаем ID задачи
      } else {
        reject(new Error('Ошибка при отправке CAPTCHA: ' + body));
      }
    });
  });
}

// Функция для получения решения CAPTCHA
function getCaptchaSolution(captchaId) {
  return new Promise((resolve, reject) => {
    const apiKey = '4a55e80727c2054001be94655212d6d7'; // Замените на ваш API-ключ
    const url = `http://rucaptcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}`;

    const interval = setInterval(() => {
      request(url, (error, response, body) => {
        if (error) return reject(error);
        if (body === 'CAPCHA_NOT_READY') {
          console.log('CAPTCHA ещё не решена, ждём...');
        } else if (body.startsWith('OK|')) {
          clearInterval(interval);
          resolve(body.split('|')[1]); // Возвращаем токен
        } else {
          clearInterval(interval);
          reject(new Error('Ошибка при получении решения CAPTCHA: ' + body));
        }
      });
    }, 5000); // Проверяем каждые 5 секунд
  });
}

module.exports = LoginController;
