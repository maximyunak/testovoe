const LoginController = require('../controllers/page');

const Router = require('express').Router;

const router = Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Авторизация в аккаунте
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 description: Логин пользователя
 *               password:
 *                 type: string
 *                 description: Пароль пользователя
 *               proxy_ip:
 *                 type: string
 *                 description: IP адрес прокси
 *               proxy_port:
 *                 type: string
 *                 description: Порт прокси
 *               proxy_user:
 *                 type: string
 *                 description: Имя пользователя прокси
 *               proxy_password:
 *                 type: string
 *                 description: Пароль прокси
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Ошибка авторизации
 */
router.post('/login', (req, res) => {
  const { login, password, proxy_ip, proxy_port, proxy_user, proxy_password } = req.body;

  // Здесь должна быть логика авторизации

  res.status(200).json({
    success: true,
    message: 'Авторизация успешна',
  });
});

router.post('/', LoginController.login);

module.exports = router;
