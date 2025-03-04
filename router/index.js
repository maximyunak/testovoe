const LoginController = require('../controllers/page');

const Router = require('express').Router;

const router = Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Авторизация в аккаунте с поддержкой прокси
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email пользователя
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 url:
 *                   type: string
 *                   description: URL после успешной авторизации
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Ошибка авторизации
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/login', LoginController.login);

/**
 * @swagger
 * /loginproxyless:
 *   post:
 *     summary: Авторизация в аккаунте без использования прокси
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email пользователя
 *               password:
 *                 type: string
 *                 description: Пароль пользователя
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 url:
 *                   type: string
 *                   description: URL после успешной авторизации
 *       400:
 *         description: Неверные параметры запроса
 *       401:
 *         description: Ошибка авторизации
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/loginproxyless', LoginController.loginProxyless);

/**
 * @swagger
 * /getInfo:
 *   get:
 *     summary: Получение информации о текущем пользователе
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Успешное получение информации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 username:
 *                   type: string
 *                   description: Имя пользователя
 *       400:
 *         description: Необходима предварительная авторизация
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/getInfo', LoginController.getInfo);

module.exports = router;
