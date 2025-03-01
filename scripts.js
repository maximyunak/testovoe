const puppeteerService = require('../puppeteer-service');
const path = require('path');

class LoginController {
  static async login(req, res) {
    try {
      const page = await puppeteerService.getPage({
        headless: false,
        defaultViewport: null,
      });

      // Массив для хранения найденных sitekey
      const foundSitekeys = new Set();

      // Отслеживаем все запросы
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        // Ищем sitekey в URL запросов к Turnstile
        if (url.includes('turnstile') && url.includes('sitekey=')) {
          const match = url.match(/[?&]sitekey=([^&]+)/);
          if (match && !match[1].includes('%')) {
            // Проверяем, что это не закодированное сообщение об ошибке
            console.log('Found sitekey in request URL:', match[1]);
            foundSitekeys.add(match[1]);
          }
        }
        request.continue();
      });

      // Отслеживаем все ответы и ищем sitekey в скриптах
      const scriptsInfo = [];
      page.on('response', async (response) => {
        const url = response.url();
        if (response.request().resourceType() === 'script') {
          try {
            const content = await response.text();
            scriptsInfo.push({
              url: url,
              content: content.substring(0, 500) + '...',
              headers: response.headers(),
              status: response.status(),
            });

            // Ищем sitekey в содержимом скрипта, исключая сообщения об ошибках
            const sitekeyMatches = content.matchAll(/sitekey["']?\s*:\s*["']([0-9a-zA-Z]+)["']/g);
            for (const match of sitekeyMatches) {
              if (match[1] && !match[1].includes('%')) {
                console.log('Found sitekey in script content:', match[1]);
                foundSitekeys.add(match[1]);
              }
            }
          } catch (e) {
            console.log('Could not get script content:', url);
          }
        }
      });

      await page.goto('https://onlyfans.com/');

      // Ждем и собираем всю информацию о капче и скриптах
      const pageInfo = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Функция анализа скрипта
          const analyzeScript = (script) => {
            return {
              src: script.src || 'inline',
              type: script.type || 'text/javascript',
              async: script.async,
              defer: script.defer,
              content: script.innerHTML
                ? script.innerHTML.substring(0, 500) + '...'
                : 'External Script',
            };
          };

          // Улучшенная функция поиска sitekey
          const findSiteKey = () => {
            const result = {
              fromAttribute: null,
              fromIframe: null,
              fromScript: null,
              fromWindow: null,
              fromTurnstile: null,
              fromChallengeForm: null,
            };

            // 1. Поиск в data-sitekey атрибутах
            document.querySelectorAll('[data-sitekey]').forEach((el) => {
              const key = el.getAttribute('data-sitekey');
              if (key && !key.includes('%')) {
                result.fromAttribute = key;
              }
            });

            // 2. Поиск в iframe src
            document.querySelectorAll('iframe[src*="turnstile"]').forEach((iframe) => {
              if (iframe.src && iframe.src.includes('sitekey=')) {
                const match = iframe.src.match(/sitekey=([^&]+)/);
                if (match && !match[1].includes('%')) {
                  result.fromIframe = match[1];
                }
              }
            });

            // 3. Поиск в скриптах
            document.querySelectorAll('script').forEach((script) => {
              const content = script.innerHTML;
              if (content && content.includes('sitekey')) {
                const match = content.match(/sitekey["']?\s*:\s*["']([0-9a-zA-Z]+)["']/);
                if (match && !match[1].includes('%')) {
                  result.fromScript = match[1];
                }
              }
            });

            // 4. Поиск в window объекте
            if (
              window.turnstile &&
              window.turnstile.sitekey &&
              !window.turnstile.sitekey.includes('%')
            ) {
              result.fromWindow = window.turnstile.sitekey;
            }

            // 5. Поиск в Turnstile виджете
            const turnstileElement = document.querySelector('#cf-turnstile');
            if (turnstileElement) {
              const key = turnstileElement.getAttribute('data-sitekey');
              if (key && !key.includes('%')) {
                result.fromTurnstile = key;
              }
            }

            // 6. Поиск в форме challenge
            const challengeForm = document.querySelector('form[action*="challenge"]');
            if (challengeForm) {
              const sitekeyInput = challengeForm.querySelector('input[name="sitekey"]');
              if (sitekeyInput && sitekeyInput.value && !sitekeyInput.value.includes('%')) {
                result.fromChallengeForm = sitekeyInput.value;
              }
            }

            return result;
          };

          // Собираем информацию о всех скриптах на странице
          const getAllScripts = () => {
            const scripts = Array.from(document.getElementsByTagName('script'));
            return scripts.map(analyzeScript);
          };

          let attempts = 0;
          const maxAttempts = 120; // 60 секунд при интервале 500мс

          // Проверяем каждые 500мс
          const interval = setInterval(() => {
            attempts++;
            const keys = findSiteKey();
            const scripts = getAllScripts();

            // Проверяем наличие ключа или достижение максимального количества попыток
            if (
              Object.values(keys).some((key) => key && !key.includes('%')) ||
              attempts >= maxAttempts
            ) {
              clearInterval(interval);
              resolve({
                found: Object.values(keys).some((key) => key && !key.includes('%')),
                keys: keys,
                scripts: scripts,
                html: document.documentElement.outerHTML,
                attempts: attempts,
              });
            }
          }, 500);
        });
      });

      // Ждем дополнительно 10 секунд после загрузки страницы для появления динамических элементов
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Делаем скриншот
      const screenshot = await page.screenshot({
        fullPage: true,
        path: path.join(__dirname, '../screenshots', 'screenshot.png'),
      });

      // Возвращаем результаты
      res.status(200).json({
        success: true,
        pageInfo: pageInfo,
        networkScripts: scriptsInfo,
        foundSitekeys: Array.from(foundSitekeys),
        url: page.url(),
      });

      await page.close();
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = LoginController;
