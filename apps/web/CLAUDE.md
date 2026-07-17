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

## Стили и UI

- **Tailwind CSS v4** — подключён через PostCSS (`postcss.config.mjs`, плагин `@tailwindcss/postcss`); конфиг-файла `tailwind.config` нет (в v4 конфигурация в CSS).
- **HeroUI v3** (`@heroui/react` + `@heroui/styles`) — библиотека UI-компонентов. Провайдер не нужен; компоненты композитные (`Card.Header` и т.п.), обработчик — `onPress`, а не `onClick`. Импорты в `src/app/globals.css` строго в порядке: сначала `tailwindcss`, затем `@heroui/styles`.
- Переменные `--background`/`--foreground` определяет тема HeroUI (oklch) — не переопределяй их в `globals.css`.
- Детали по компонентам — скил `heroui-react` (`.claude/skills/heroui-react` в корне репозитория): `node scripts/get_component_docs.mjs Button` и др.

## Страницы

- `/` — главная, только для авторизованных (без токена или при `401` → редирект на `/login`): приветствие с e-mail (декодируется из payload JWT, `decodeJwtEmail` в `src/lib/api.ts`), счётчик встреч, последние три встречи (новые сверху), кнопка «Создать встречу» (`POST /meetings` с автоназванием «Встреча №N») и кнопка «Выйти» (чистит токен).
- `/register`, `/login` — общий компонент `src/components/auth-form.tsx` (HeroUI `Form`/`TextField`/`InputGroup`/`Card`/`Alert`): русская валидация (пустые поля, формат e-mail на blur, лимиты 254/72 символа), переключатель видимости пароля, `autocomplete`, поля/кнопки 44px. `POST {API_URL}/auth/register|login` с таймаутом 10 с; успех → токен в `localStorage` и редирект на главную `/`; `409` → сообщение со ссылкой «Войти», `401` → «Неверный e-mail или пароль», сетевые ошибки/таймаут — отдельные тексты. Формы перелинкованы («Уже есть аккаунт?» / «Нет аккаунта?»).

## Проверка изменений (обязательно)

- **Каждое изменение UI проверяй через скилл `ui-ux-pro-max`** (`.agents/skills/ui-ux-pro-max`): прогони поиск по релевантным доменам (`--domain ux`, при необходимости `style`/`color`/`typography` или `--design-system`) и сверь результат с правилами из `references/quick-reference.md`. Изменение считается завершённым **только когда проверка пройдена**: нарушения исправлены либо явно согласованы с пользователем.
- **Для тестирования фронта в браузере используется MCP Playwright** (сервер `playwright` из `.mcp.json`): открытие страниц, снапшоты, клики, заполнение форм, скриншоты. Проверяй реальное поведение (валидация, редиректы, состояния загрузки/ошибок), а не только сборку.

## Заметки

- API бэкенда в dev-режиме доступен на `http://localhost:3001` (`apps/api`); базовый URL берётся из `NEXT_PUBLIC_API_URL` (по умолчанию `http://localhost:3001`).
- Форматирование — общий Prettier-конфиг в корне репозитория (`.prettierrc`); запускать `npm run format` из корня.
