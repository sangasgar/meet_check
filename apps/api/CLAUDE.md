# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

`api` — бэкенд монорепозитория (см. корневой `CLAUDE.md`): NestJS 11, TypeScript, Jest. Точка входа `src/main.ts` поднимает `AppModule` на порту `3001` (переопределяется переменной `PORT`).

## Переменные окружения

Загружаются через `@nestjs/config` из `.env` в этой директории (в git не попадает, образец — `.env.example`):

- `JWT_SECRET` — секрет подписи JWT, обязателен (без него приложение не стартует).

## Модули

- `src/auth` — аутентификация: `AuthService` (`login`, `register`, bcrypt-хеширование, выдача JWT на 15 минут через `@nestjs/jwt`), `AuthController` (`POST /auth/register`, `POST /auth/login` → `201 { accessToken }`; `400` при невалидном теле, `401` при неверных данных входа, `409` при занятом e-mail). DTO валидируются глобальным `ValidationPipe` (провайдер `APP_PIPE` в `AppModule`).
- `src/users` — пользователи: `UsersRepository` (`findByEmail`, `create`). Сейчас это временное in-memory хранилище — заменить на Postgres-реализацию, сохранив интерфейс методов.

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
npm run test -- app.controller     # один тест по паттерну имени файла
npm run test:watch                 # watch-режим
npm run test:cov                   # с покрытием → coverage/
```

E2e-тесты (отдельный конфиг `test/jest-e2e.json`, файлы `*.e2e-spec.ts` в `test/`):

```bash
npm run test:e2e
```
