const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const request = require('request');
const path = require('path');

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

      const html = await page.htmlContent;

      // // CAPTCHA handling
      // const captchaSelector = 'iframe[src*="hcaptcha"]';
      // const captchaPresent = await page.$(captchaSelector);
      // if (captchaPresent) {
      //   console.log('CAPTCHA обнаружена, решаем через RuCaptcha...');
      //   // Получаем HTML-код страницы
      //   const htmlContent = await page.content();

      //   const siteKey = await page.evaluate(() => {
      //     return document.querySelector('iframe[src*="hcaptcha"]').dataset.sitekey;
      //   });
      //   const captchaId = await sendCaptchaToRuCaptcha(siteKey, page.url());
      //   const captchaToken = await getCaptchaSolution(captchaId);
      //   if (captchaToken) {
      //     await page.evaluate((token) => {
      //       document.querySelector('textarea[name="h-captcha-response"]').value = token;
      //     }, captchaToken);
      //     await page.click('button[type="submit"]', { delay: 100 });
      //     await page.waitForNavigation({ waitUntil: 'networkidle2' });
      //   } else {
      //     // Если не удалось решить CAPTCHA, возвращаем HTML-код страницы
      //     return res.status(200).json({
      //       success: false,
      //       error: 'Не удалось решить CAPTCHA',
      //       html: htmlContent, // Добавляем HTML-код в ответ
      //     });
      //   }
      // } else {
      //   console.log('CAPTCHA не обнаружена, продолжаем...');
      // }

      // Заполнение полей email и password
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.type('input[name="email"]', email);
      await page.type('input[name="password"]', password);

      const button = await page.$('button.g-btn.m-rounded.m-block.m-md.mb-0');
      if (button) {
        await button.click();
      } else {
        throw new Error('Кнопка "Авторизуйтесь" не найдена');
      }

      // await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await page.screenshot({
        fullPage: true,
        path: path.join(__dirname, '../screenshots', 'screenshot.png'),
      });

      res.status(200).json({
        success: true,
        url: page.url(),
        html, // В случае успеха без CAPTCHA возвращаем null для html
      });
    } catch (error) {
      console.error('Ошибка:', error);
      // Если ошибка произошла до или после CAPTCHA, пытаемся получить HTML
      try {
        let htmlContent = await page.htmlContent;
        res.status(500).json({
          success: false,
          error: error.message,
          html: htmlContent, // Добавляем HTML-код в случае ошибки, если он доступен
        });
      } catch (error) {
        console.log('net html');
        res.status(500).json({
          success: false,
          error: error.message,
          // html: htmlContent, // Добавляем HTML-код в случае ошибки, если он доступен
        });
      }
      // if (page) {
      //   htmlContent = await page.content().catch(() => null);
      // }
    } finally {
      // if (browser) await browser.close();
    }
  }
}

module.exports = LoginController;
