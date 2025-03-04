const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
require('dotenv').config();
const axios = require('axios');

puppeteer.use(StealthPlugin());

let activePage = null;

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

      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });

      await page.type('input[name="email"]', email);
      await page.type('input[name="password"]', password);

      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        console.log('Нажимаем кнопку "submit"...');
        await submitButton.click();
      } else {
        throw new Error('Кнопка "submit" не найдена');
      }

      console.log('Ожидаем появления капчи...');
      await page.waitForSelector('iframe[title="reCAPTCHA"]', { timeout: 30000 });

      const captchaElement = await page.$('iframe[title="reCAPTCHA"]');
      if (captchaElement) {
        console.log('Капча обнаружена, начинаем обработку...');

        const websiteKey = await page.evaluate(() => {
          const iframe = document.querySelector('iframe[title="reCAPTCHA"]');
          return iframe ? new URLSearchParams(iframe.src.split('?')[1]).get('k') : null;
        });

        if (!websiteKey) {
          throw new Error('Не удалось извлечь websiteKey для капчи');
        }

        console.log('Ключ сайта:', websiteKey);

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
          throw new Error('API_KEY не найден в .env');
        }

        const taskData = {
          clientKey: apiKey,
          task: {
            type: 'RecaptchaV2TaskProxyless',
            websiteURL: 'https://onlyfans.com/',
            websiteKey: websiteKey,
            isInvisible: false,
          },
        };

        const createTaskResponse = await axios
          .post('https://api.rucaptcha.com/createTask', taskData)
          .then((res) => res.data);
        if (createTaskResponse.errorId !== 0) {
          throw new Error(`Ошибка при создании задачи: ${createTaskResponse.errorDescription}`);
        }

        const taskId = createTaskResponse.taskId;
        console.log('Task ID:', taskId);

        let solution;
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const taskResultResponse = await axios
            .post('https://api.rucaptcha.com/getTaskResult', { clientKey: apiKey, taskId })
            .then((res) => res.data);
          if (taskResultResponse.status === 'ready') {
            solution = taskResultResponse.solution.gRecaptchaResponse;
            console.log('Токен капчи получен');
            break;
          } else {
            console.log('Капча еще не решена, ждем...');
          }
        }

        console.log('Ответ ruCaptcha', solution);

        await page.evaluate((token) => {
          const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
          if (textarea) {
            textarea.value = token;
            textarea.style.display = 'block';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('Токен вставлен в поле');
          } else {
            throw new Error('Поле g-recaptcha-response не найдено');
          }
        }, solution);

        const submitButtonAfterCaptcha = await page.$('button[type="submit"]');
        if (submitButtonAfterCaptcha) {
          console.log('Нажимаем кнопку "submit" после решения капчи...');
          await submitButtonAfterCaptcha.click();
        } else {
          console.log('Кнопка "submit" не найдена после решения капчи');
        }
      } else {
        console.log('Капча не обнаружена, продолжаем без нее');
      }

      console.log('Вход выполнен успешно');

      await page.screenshot({
        fullPage: true,
        path: path.join(__dirname, '../screenshots', 'screenshot.png'),
      });

      activePage = page;

      res.status(200).json({ success: true, url: page.url() });
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getInfo(req, res) {
    try {
      if (!activePage) {
        return res.status(400).json({ success: false, error: 'Сначала выполните вход' });
      }

      await activePage.waitForSelector('div.l-sidebar__username .g-user-name', { timeout: 30000 });

      const username = await activePage.evaluate(() => {
        const usernameElement = document.querySelector('div.l-sidebar__username .g-user-name');
        return usernameElement ? usernameElement.textContent.trim() : null;
      });

      if (!username) {
        throw new Error('Не удалось найти имя пользователя');
      }

      console.log('Имя пользователя:', username);

      res.status(200).json({
        success: true,
        username: username,
      });
    } catch (error) {
      console.error('Ошибка в getInfo:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = LoginController;
