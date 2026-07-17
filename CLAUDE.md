# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Монорепозиторий на npm workspaces (Node.js >= 20) с двумя приложениями:

| Приложение | Путь       | Стек                    | Порт (dev)                     |
| ---------- | ---------- | ----------------------- | ------------------------------ |
| `web`      | `apps/web` | Next.js 16 (App Router) | 3000                           |
| `api`      | `apps/api` | NestJS 11               | 3001 (переопределяется `PORT`) |

У каждого приложения есть свой `CLAUDE.md` с деталями — читай его при работе внутри `apps/web` или `apps/api`.

## Инфраструктура

PostgreSQL 17 поднимается через `docker-compose.yml` в корне:

```bash
docker compose up -d     # запустить Postgres (localhost:5433)
docker compose down      # остановить (данные сохраняются в volume postgres_data)
```

Параметры подключения (dev): хост-порт `5433` (на `5432` может быть локальный PostgreSQL Windows), база `meet_startap`, пользователь/пароль `postgres`/`postgres`.

ORM — **Prisma** (детали в `apps/api/CLAUDE.md`): схема `apps/api/prisma/schema.prisma`, миграции `npm run prisma:migrate --workspace api`. Для работы api и его e2e-тестов Postgres должен быть запущен, а миграции применены.

**Важно про web:** используется Next.js 16 с breaking changes относительно предыдущих версий — перед написанием кода в `apps/web` читай гайды в `apps/web/node_modules/next/dist/docs/` (подробнее в `apps/web/AGENTS.md`).

## Команды (запускать из корня)

```bash
npm install              # ставит зависимости всех workspaces

npm run dev              # web + api одновременно (concurrently)
npm run dev:web          # только Next.js → http://localhost:3000
npm run dev:api          # только NestJS в watch-режиме → http://localhost:3001

npm run build            # сборка всех приложений (или build:web / build:api)
npm run lint             # ESLint во всех приложениях (или lint:web / lint:api)
npm run test             # тесты во всех workspaces (сейчас есть только у api)
npm run format           # Prettier: форматировать apps/**
npm run format:check     # Prettier: только проверка
```

Один тест (Jest есть только у api):

```bash
npm run test --workspace api -- auth.service          # по имени файла/паттерну
npm run test:e2e --workspace api                      # e2e-тесты (apps/api/test)
```

## Линтинг и форматирование

- **Prettier** — общий конфиг в корне `.prettierrc` (singleQuote, printWidth 100, trailingComma all).
- **ESLint** — у каждого приложения свой flat-конфиг: `apps/web/eslint.config.mjs` (eslint-config-next), `apps/api/eslint.config.mjs` (typescript-eslint + prettier). `lint` у api запускается с `--fix`.
- **husky** — pre-commit хук (`.husky/pre-commit`) прогоняет `format:check`, `lint` и unit-тесты; коммит не пройдёт, пока они красные. E2e-тесты в хук не входят (нужен запущенный Postgres).

## UI

Для компонентов интерфейса используется HeroUI — в `.claude/skills/heroui-react` установлен скил с документацией и скриптами (`list_components.mjs`, `get_component_docs.mjs` и др.); используй его при работе с UI-компонентами.

## Актуализация документации

При изменении архитектуры проекта обновляй документацию в том же изменении:

- новое приложение/workspace, смена стека, портов или npm-скриптов → корневые `CLAUDE.md` и `README.md`;
- изменения внутри `apps/web` или `apps/api` (новые модули, страницы, структура, команды) → `CLAUDE.md` соответствующего приложения.

Документация не должна расходиться с кодом: если правка делает написанное здесь неверным — исправь это сразу, не откладывая.

Save screenshot in /screenshot folder
