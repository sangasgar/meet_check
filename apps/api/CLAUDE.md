# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

`api` — бэкенд монорепозитория (см. корневой `CLAUDE.md`): NestJS 11, TypeScript, Jest. Точка входа `src/main.ts` поднимает `AppModule` на порту `3001` (переопределяется переменной `PORT`). Корневого маршрута `GET /` нет — все маршруты объявлены внутри модулей (`auth`, `meetings`).

## Переменные окружения

Загружаются через `@nestjs/config` из `.env` в этой директории (в git не попадает, образец — `.env.example`):

- `JWT_SECRET` — секрет подписи JWT, обязателен (без него приложение не стартует).
- `DATABASE_URL` — строка подключения Prisma к PostgreSQL, обязательна (значения dev-базы — в `docker-compose.yml` корня).
- `WEB_ORIGIN` — origin фронтенда для CORS, опционален (по умолчанию `http://localhost:3000`; включается в `main.ts`).

## База данных

ORM — **Prisma 6** (PostgreSQL из `docker-compose.yml` корня, поднимать перед запуском: `docker compose up -d`). Схема — `prisma/schema.prisma` (модели `User`, `Meeting`), миграции — `prisma/migrations/`. `PrismaService` (`src/prisma`) наследует `PrismaClient` и экспортируется из `PrismaModule`.

```bash
npm run prisma:migrate     # применить/создать миграции (prisma migrate dev)
npm run prisma:generate    # перегенерировать клиент после правки схемы
```

После изменения `schema.prisma` всегда: миграция + генерация клиента.

## Модули

- `src/auth` — авторизация: `AuthService` (`login`, `register`, bcrypt-хеширование, выдача JWT на 15 минут через `@nestjs/jwt`), `AuthController` (`POST /auth/register`, `POST /auth/login` → `201 { accessToken }`; `400` при невалидном теле, `401` при неверных данных входа, `409` при занятом e-mail). DTO валидируются глобальным `ValidationPipe` (провайдер `APP_PIPE` в `AppModule`). Также экспортирует `JwtModule` и содержит `JwtAuthGuard` (проверка `Authorization: Bearer <JWT>`, кладёт payload в `request.user`) и декоратор `@CurrentUser()` — используй их для защиты маршрутов в других модулях. **С UsersModule не связан импортами** — пользователей ищет/создаёт только через CQRS-шину.
- `src/users` — пользователи: команда `CreateUserCommand` и запрос `FindUserByEmailQuery` с хендлерами в `commands/handlers/` и `queries/handlers/`; `UsersRepository` — приватная деталь модуля (не экспортируется), работает с Postgres через `PrismaService`. Новую функциональность (профиль и т.п.) добавляй новыми командами/запросами.
- `src/meetings` — встречи (все маршруты под `JwtAuthGuard`, без токена — `401`): `POST /meetings` (`201`, тело `{ title, description? }`, `400` при невалидном теле), `GET /meetings` (`200`, список), `GET /meetings/:id` (`200` или `404`, если встречи нет). `MeetingsRepository` работает с Postgres через `PrismaService`.
- `src/prisma` — `PrismaModule`/`PrismaService`: единственная точка доступа к базе, импортируется модулями с репозиториями.

## Архитектурные паттерны

**Межмодульное взаимодействие — через CQRS** (`@nestjs/cqrs`, `CqrsModule.forRoot()` в `AppModule`): модуль не импортирует чужие сервисы/репозитории, а отправляет команды/запросы в шину (`CommandBus`/`QueryBus`); хендлеры регистрируются провайдерами внутри модуля-владельца. Пример — связь Auth ↔ Users. Внутри модуля допустим классический стиль controller → service → repository (`meetings`). Подробнее про паттерн и миграцию — `docs/cqrs.md`.

## Команды

Из корня репозитория: `npm run dev:api`, `npm run build:api`, `npm run lint:api`.

Из этой директории:

```bash
npm run start:dev      # watch-режим → http://localhost:3001
npm run start:debug    # watch + отладчик
npm run build          # nest build → dist/
npm run start:prod     # node dist/main (после build)
npm run lint           # ESLint с --fix (typescript-eslint + prettier)
```

## Тесты

Unit-тесты (Jest, `rootDir: src`, файлы `*.spec.ts` рядом с кодом):

```bash
npm run test                       # все unit-тесты
npm run test -- auth.service       # один тест по паттерну имени файла
npm run test:watch                 # watch-режим
npm run test:cov                   # с покрытием → coverage/
```

E2e-тесты (отдельный конфиг `test/jest-e2e.json`, файлы `*.e2e-spec.ts` в `test/`):

```bash
npm run test:e2e
```

E2e-тесты ходят в реальный Postgres (`DATABASE_URL`), перед каждым тестом чистят таблицы `meetings` и `users` и выполняются последовательно (`maxWorkers: 1` в конфиге) — база должна быть запущена и миграции применены. **Не запускай e2e на базе с данными, которые жалко потерять.**
