# Meet Startap

Монорепозиторий на npm workspaces с двумя приложениями:

| Приложение | Путь       | Стек                    | Порт (dev) |
| ---------- | ---------- | ----------------------- | ---------- |
| `web`      | `apps/web` | Next.js 16 (App Router) | 3000       |
| `api`      | `apps/api` | NestJS 11               | 3001       |

## Требования

- Node.js >= 20
- npm >= 10
- Docker (для локальной базы данных)

## Установка

```bash
npm install
```

Одна команда в корне ставит зависимости для всех workspaces.

## База данных

PostgreSQL 17 поднимается через Docker Compose:

```bash
docker compose up -d     # запустить (localhost:5433, база meet_startap, postgres/postgres)
docker compose down      # остановить (данные сохраняются в volume)
```

ORM — Prisma (`apps/api/prisma/schema.prisma`). После первого запуска базы примени миграции:

```bash
npm run prisma:migrate --workspace api    # prisma migrate dev
```

Строка подключения берётся из `DATABASE_URL` в `apps/api/.env` (образец — `apps/api/.env.example`).

## Скрипты (запускать из корня)

| Команда                | Что делает                                           |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Запускает web и api одновременно (concurrently)      |
| `npm run dev:web`      | Только Next.js (http://localhost:3000)               |
| `npm run dev:api`      | Только NestJS в watch-режиме (http://localhost:3001) |
| `npm run build`        | Сборка всех приложений                               |
| `npm run build:web`    | Сборка только web                                    |
| `npm run build:api`    | Сборка только api                                    |
| `npm run start:web`    | Прод-запуск web (после build)                        |
| `npm run start:api`    | Прод-запуск api (после build)                        |
| `npm run lint`         | ESLint во всех приложениях                           |
| `npm run test`         | Тесты во всех приложениях (сейчас только api)        |
| `npm run format`       | Prettier: форматировать все файлы                    |
| `npm run format:check` | Prettier: проверить форматирование                   |

## Тесты

Тесты есть только у `api` (Jest): unit-тесты `*.spec.ts` лежат рядом с кодом в `apps/api/src`, e2e-тесты `*.e2e-spec.ts` — в `apps/api/test` (проверяют HTTP-контракт реального приложения).

```bash
npm run test                                  # unit-тесты всех workspaces (сейчас только api)
npm run test --workspace api -- auth.service  # один файл по паттерну имени
npm run test:e2e --workspace api              # e2e-тесты api
```

Для e2e-тестов нужны: файл `apps/api/.env` с `JWT_SECRET` и `DATABASE_URL` (образец — `apps/api/.env.example`) и запущенный Postgres с применёнными миграциями (`docker compose up -d`, затем `npm run prisma:migrate --workspace api`). Перед каждым e2e-тестом таблицы очищаются — не гоняй их на базе с нужными данными.

## Линтинг и форматирование

- **ESLint** — конфиг у каждого приложения свой: `apps/web/eslint.config.mjs` (eslint-config-next) и `apps/api/eslint.config.mjs` (typescript-eslint + prettier).
- **Prettier** — общий конфиг в корне: `.prettierrc`.
- **husky** — pre-commit хук запускает `format:check`, `lint` и unit-тесты перед каждым коммитом (устанавливается автоматически при `npm install` через скрипт `prepare`).

## Структура

```
.
├── apps/
│   ├── web/   # Next.js (TypeScript, App Router, src/)
│   └── api/   # NestJS (TypeScript, Jest)
├── docker-compose.yml   # PostgreSQL для локальной разработки
├── package.json   # workspaces + общие скрипты
├── .prettierrc    # общий конфиг Prettier
└── .gitignore
```
