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
docker compose up -d     # запустить (localhost:5432, база meet_startap, postgres/postgres)
docker compose down      # остановить (данные сохраняются в volume)
```

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

## Линтинг и форматирование

- **ESLint** — конфиг у каждого приложения свой: `apps/web/eslint.config.mjs` (eslint-config-next) и `apps/api/eslint.config.mjs` (typescript-eslint + prettier).
- **Prettier** — общий конфиг в корне: `.prettierrc`.

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
