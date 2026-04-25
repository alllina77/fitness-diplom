# Запуск и деплой фитнес-системы (PostgreSQL + Render)

Этот файл теперь для новой схемы:
- backend на `Node.js + Express`;
- БД `PostgreSQL` (облако, бесплатно);
- многопользовательность: все данные строго по `user_id`;
- базовая безопасность: `helmet`, `cors`, `rate-limit`;
- приложение доступно в интернете без покупки сервера.

---

## 1) Что уже сделано в коде

- Backend переведен с `SQLite` на `PostgreSQL` (`pg` драйвер).
- Таблицы создаются автоматически при старте (`initDb`).
- Логика профиля/хранилища и соц. ленты адаптирована под PostgreSQL.
- Добавлен endpoint здоровья: `GET /health`.
- Добавлены ограничения на частые попытки входа/регистрации.
- Проверка обязательных переменных окружения (`JWT_SECRET`, `DATABASE_URL`).

---

## 2) Что нужно установить на компьютер

1. Установить `Node.js` версии 18+ с [https://nodejs.org](https://nodejs.org)
2. Перезапустить терминал после установки.

Проверка:
```powershell
node -v
npm -v
```

---

## 3) Локальный запуск (чтобы проверить перед деплоем)

Открой PowerShell и выполни:

```powershell
cd "c:\Users\msi\Downloads\DIPLOM_24 04 — копия\DIPLOM_4\DIPLOM_22\backend"
npm install
copy .env.example .env
```

Дальше нужно заполнить `backend/.env`:
- `JWT_SECRET` - длинная случайная строка (минимум 32 символа);
- `DATABASE_URL` - строка подключения к Postgres (получим ниже в шаге Supabase);
- `PG_SSL=true`.

После заполнения `.env`:
```powershell
npm start
```

Открыть в браузере:
- `http://localhost:4000`
- `http://localhost:4000/health` (должно вернуть `{ "ok": true, ... }`)

---

## 4) Создание бесплатной PostgreSQL (Supabase) — по кнопкам

1. Открой [https://supabase.com](https://supabase.com)
2. Нажми `Start your project`
3. Войди через GitHub (или email)
4. Нажми `New project`
5. Заполни:
   - `Organization` - любая
   - `Project name` - например `fitness-diplom`
   - `Database Password` - придумай пароль и сохрани
   - `Region` - ближайший
6. Нажми `Create new project`
7. Дождись статуса `Healthy` (обычно 1-3 минуты)
8. В левом меню: `Project Settings` -> `Database`
9. Найди блок `Connection string` и выбери `URI`
10. Нажми `Copy` и замени `[YOUR-PASSWORD]` на свой пароль
11. Эту строку вставь в `DATABASE_URL` в `backend/.env`

Пример:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

---

## 5) Деплой в интернет бесплатно (Render) — по кнопкам

### Подготовка
Если проект еще не на GitHub:
1. Открой [https://github.com](https://github.com)
2. Нажми `New repository`
3. Название, например `fitness-diplom`
4. Нажми `Create repository`
5. Загрузи туда текущий проект (через GitHub Desktop или git в терминале)

### Деплой backend
1. Открой [https://render.com](https://render.com)
2. Нажми `Get Started`
3. Авторизуйся через GitHub
4. Нажми `New +` -> `Web Service`
5. Выбери свой репозиторий и нажми `Connect`
6. Заполни:
   - `Name`: `fitness-backend` (или любой)
   - `Root Directory`: `DIPLOM_4/DIPLOM_22/backend` (если репо с корня архивом)
   - `Environment`: `Node`
   - `Build Command`: `npm install`
   - `Start Command`: `npm start`
7. Выбери `Free` план
8. Ниже открой `Environment Variables` и добавь:
   - `PORT` = `4000`
   - `JWT_SECRET` = длинная случайная строка
   - `JWT_EXPIRES_IN` = `7d`
   - `DATABASE_URL` = строка из Supabase
   - `PG_SSL` = `true`
   - `CORS_ORIGIN` = `*` (временно для простоты)
9. Нажми `Create Web Service`
10. Дождись статуса `Live`

После этого получишь URL вида:
- `https://fitness-backend.onrender.com`

Проверка:
- открой `https://.../health` -> должен быть JSON с `ok: true`.

---

## 6) Проверка многопользовательности (обязательно)

Сделай эти шаги в браузере:

1. Открой сайт (твоя render-ссылка).
2. Зарегистрируй пользователя №1 (например `user_a`), заполни профиль.
3. Добавь данные (тренировки/поля профиля), выйди из аккаунта.
4. Зарегистрируй пользователя №2 (`user_b`), добавь другие данные.
5. Проверь:
   - у `user_b` нет данных `user_a`;
   - у `user_a` после входа только его данные.

Если это так - многопользовательность работает корректно.

---

## 7) Важные замечания

- Текущий backend раздает фронтенд из папки `ДИПЛОМ 2`.
- Если в Render путь к фронтенду другой, скорректируй структуру репозитория.
- На бесплатном Render сервис может "засыпать" и первый запрос будет дольше.
- Для публичного релиза после дедлайна желательно:
  - настроить отдельный домен;
  - ограничить `CORS_ORIGIN` конкретным доменом;
  - добавить резервные копии БД;
  - добавить мониторинг ошибок (например Sentry).
