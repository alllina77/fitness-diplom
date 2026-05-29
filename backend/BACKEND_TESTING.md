# Проверка backend (для отчёта и защиты)

Документ описывает, **какие тесты запускать**, что они проверяют и как зафиксировать результат в отчёте.

---

## 1. Автоматические тесты (обязательно для отчёта)

### Где запускать

PowerShell, папка проекта:

```powershell
cd "c:\Users\msi\Downloads\DIPLOM_24 04 — копия\DIPLOM_4\DIPLOM_22\backend"
```

### Команда

```powershell
npm test
```

### Что проверяется

| Файл | Что проверяет |
|------|-------------|
| `authValidation.test.js` | Политика пароля (мин. 8 символов, буква + цифра) |
| `storageValidation.test.js` | Whitelist ключей `user_storage` |
| `storage.routes.test.js` | Разрешённые ключи хранилища |
| `training.service.test.js` | Валидация планов/тренировок и расчёт аналитики |
| `training.routes.test.js` | Доп. проверки валидаторов тренировок |
| `profile.test.js` | Профиль и URL аватара (не base64) |
| `dotenv.test.js` | Наличие `.env` и загрузка переменных |
| `http.basic.test.js` | HTTP: `/health`, защита без токена |

### Ожидаемый результат

```
# tests 12+
# pass 12+
# fail 0
```

### Что вставить в отчёт

> Выполнены автоматические модульные тесты backend (`npm test`).  
> Покрыты: валидация пароля, whitelist storage, валидация тренировок, аналитика, загрузка `.env`, базовые HTTP-проверки.

---

## 2. Запуск сервера (перед ручными проверками)

```powershell
cd "c:\Users\msi\Downloads\DIPLOM_24 04 — копия\DIPLOM_4\DIPLOM_22\backend"
npm start
```

Успех:

```
Server started: http://localhost:4000
Health check: http://localhost:4000/health
```

Если ошибка `DATABASE_URL is required` — файл `.env` не подхватывается. Убедитесь, что запускаете из папки `backend` и что в `.env` есть строка `DATABASE_URL=...` (без пробелов вокруг `=`).

---

## 3. Ручная проверка API (рекомендуется для демонстрации)

После `npm start` открой в браузере или PowerShell:

| Проверка | URL / команда | Ожидание |
|----------|--------------|----------|
| Health | http://localhost:4000/health | JSON `{ "ok": true, "service": "fitness-backend" }` |
| Frontend | http://localhost:4000 | Открывается приложение |
| Регистрация | POST `/api/auth/register` | 201, токен в ответе |
| Логин | POST `/api/auth/login` | 200, токен |
| Планы (с токеном) | GET `/api/training/plans` | 200, массив планов |
| Аналитика | GET `/api/training/analytics` | 200, объект с `exercises`, `muscleLoad` |
| Статистика | GET `/api/training/stats` | 200, `workoutsCount`, `setsCount` |

Пример регистрации (PowerShell, подставьте свои данные):

```powershell
$body = @{
  username = "testuser01"
  password = "TestPass9"
  firstName = "Тест"
  lastName = "Пользователь"
  birthDate = "2000-01-01"
  gender = "male"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" -Method POST -ContentType "application/json" -Body $body
```

---

## 4. Проверка предметной области (для защиты ВКР)

На защите можно показать:

1. **Модуль тренировок на сервере** — таблицы `training_plans`, `training_workouts`, API `/api/training/*`.
2. **Аналитика на сервере** — `GET /api/training/analytics`, `GET /api/training/stats`.
3. **Транзакции** — регистрация user + profile в одной транзакции.
4. **Безопасность** — сильный пароль, rate limit, pin только автором, CORS, миграции SQL.
5. **Тесты** — `npm test` + скриншот вывода в отчёт.

---

## 5. Структура backend (после рефакторинга)

```
backend/src/
  server.js          — точка входа, загрузка .env
  app.js             — Express, middleware
  db.js              — PostgreSQL, миграции
  routes/            — auth, profile, storage, social, training
  services/          — training.service, social (логика)
  middleware/        — auth, asyncHandler
  utils/             — validation, profile
  migrations/        — 001_init.sql, 002_upgrade...
  tests/               — автотесты
```

---

## 6. Частые проблемы

| Симптом | Решение |
|--------|---------|
| `DATABASE_URL is required` | Запуск из папки `backend`, проверить `.env`, перезапустить терминал |
| Ошибка пароля БД | Проверить пароль в URI; спецсимволы кодировать (`!` → `%21`) |
| `password authentication failed` | Неверный пароль в `DATABASE_URL` |
| Порт занят | Закрыть старый процесс Node или сменить `PORT` в `.env` |
