# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Что это

`web` — фронтенд монорепозитория (см. корневой `CLAUDE.md`): Next.js 16, App Router, TypeScript, React 19. Исходники в `src/app/`.

**Перед написанием кода** читай гайды в `node_modules/next/dist/docs/` — в Next.js 16 есть breaking changes относительно того, что ты знаешь о Next.js (см. AGENTS.md выше).

## Команды

Из корня репозитория: `npm run dev:web`, `npm run build:web`, `npm run lint:web`.

Из этой директории:

```bash
npm run dev      # dev-сервер → http://localhost:3000
npm run build    # прод-сборка
npm run start    # прод-запуск (после build)
npm run lint     # ESLint (eslint-config-next, flat-конфиг eslint.config.mjs)
```

Тестов в этом приложении пока нет.

## Заметки

- API бэкенда в dev-режиме доступен на `http://localhost:3001` (`apps/api`).
- Форматирование — общий Prettier-конфиг в корне репозитория (`.prettierrc`); запускать `npm run format` из корня.
- Для UI-компонентов используется HeroUI — есть скил `heroui-react` (`.claude/skills/heroui-react` в корне репозитория).
