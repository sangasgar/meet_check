# Паттерн CQRS

> Справочный документ: описывает, что такое CQRS и как применять его в этом проекте.
> В коде `api` CQRS используется для **межмодульного взаимодействия**: Auth ищет и создаёт
> пользователей через `FindUserByEmailQuery`/`CreateUserCommand` модуля Users (`src/users`).
> Внутри модулей допустим классический стиль controller → service → repository (`meetings`).

## Что это

**CQRS (Command Query Responsibility Segregation)** — разделение операций на два типа с разными моделями:

- **Команды (Commands)** — изменяют состояние системы и не возвращают данные предметной области (создать встречу, зарегистрировать пользователя). Одна команда = одно намерение пользователя.
- **Запросы (Queries)** — читают данные и никогда не меняют состояние (список встреч, встреча по id).

Ключевое правило: метод либо изменяет состояние, либо возвращает данные — но не то и другое сразу.

## Когда применять, а когда нет

**Стоит применять, когда:**

- бизнес-логика записи сложная (валидации, инварианты, побочные эффекты), а чтение — простое и его много;
- модели чтения и записи расходятся: списки/карточки нужны в одном виде, а хранение устроено иначе;
- нужна событийность: после команды рассылаются события, на которые реагируют другие части системы (уведомления, интеграции);
- нагрузка на чтение и запись сильно различается и их нужно масштабировать раздельно.

**Не стоит применять, когда:**

- модуль — простой CRUD (как текущий `meetings`): CQRS добавит файлы и слои без выгоды;
- команда «просто вызывает репозиторий» — это тот же сервис, но с бóльшим количеством кода.

Правило для этого проекта: начинаем с classic-подхода (controller → service → repository); переходим на CQRS в модуле только тогда, когда сервис разрастается и в нём смешиваются сценарии чтения и записи.

## Как это выглядит в NestJS

Официальный пакет — [`@nestjs/cqrs`](https://docs.nestjs.com/recipes/cqrs):

```bash
npm install @nestjs/cqrs --workspace api
```

Он даёт три шины: `CommandBus` (команды), `QueryBus` (запросы), `EventBus` (события). Контроллер не вызывает сервис напрямую, а отправляет команду/запрос в шину; шина находит хендлер по классу.

### Структура модуля

```
src/meetings/
├── commands/
│   ├── create-meeting.command.ts        # DTO-класс команды (входные данные)
│   └── handlers/
│       └── create-meeting.handler.ts    # @CommandHandler — логика записи
├── queries/
│   ├── get-meetings.query.ts
│   ├── get-meeting-by-id.query.ts
│   └── handlers/
│       ├── get-meetings.handler.ts      # @QueryHandler — логика чтения
│       └── get-meeting-by-id.handler.ts
├── events/
│   ├── meeting-created.event.ts
│   └── handlers/
│       └── meeting-created.handler.ts   # @EventsHandler — реакция на событие
├── dto/create-meeting.dto.ts            # HTTP-DTO с class-validator (без изменений)
├── meeting.entity.ts
├── meetings.repository.ts               # репозиторий переиспользуется хендлерами
├── meetings.controller.ts
└── meetings.module.ts
```

### Команда и её хендлер

```ts
// commands/create-meeting.command.ts
export class CreateMeetingCommand {
  constructor(
    public readonly title: string,
    public readonly description: string | null,
    public readonly ownerId: string,
  ) {}
}
```

```ts
// commands/handlers/create-meeting.handler.ts
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { CreateMeetingCommand } from '../create-meeting.command';
import { MeetingCreatedEvent } from '../../events/meeting-created.event';
import { Meeting } from '../../meeting.entity';
import { MeetingsRepository } from '../../meetings.repository';

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<CreateMeetingCommand, Meeting> {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateMeetingCommand): Promise<Meeting> {
    const meeting = await this.meetingsRepository.create({
      title: command.title,
      description: command.description,
      ownerId: command.ownerId,
    });

    this.eventBus.publish(new MeetingCreatedEvent(meeting.id, meeting.ownerId));

    return meeting;
  }
}
```

### Запрос и его хендлер

```ts
// queries/get-meeting-by-id.query.ts
export class GetMeetingByIdQuery {
  constructor(public readonly id: string) {}
}
```

```ts
// queries/handlers/get-meeting-by-id.handler.ts
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { GetMeetingByIdQuery } from '../get-meeting-by-id.query';
import { Meeting } from '../../meeting.entity';
import { MeetingsRepository } from '../../meetings.repository';

@QueryHandler(GetMeetingByIdQuery)
export class GetMeetingByIdHandler implements IQueryHandler<GetMeetingByIdQuery, Meeting> {
  constructor(private readonly meetingsRepository: MeetingsRepository) {}

  async execute(query: GetMeetingByIdQuery): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findById(query.id);
    if (!meeting) {
      throw new NotFoundException(`Встреча с id ${query.id} не найдена`);
    }
    return meeting;
  }
}
```

### Контроллер с шинами

```ts
// meetings.controller.ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateMeetingCommand } from './commands/create-meeting.command';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { Meeting } from './meeting.entity';
import { GetMeetingByIdQuery } from './queries/get-meeting-by-id.query';
import { GetMeetingsQuery } from './queries/get-meetings.query';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: JwtPayload): Promise<Meeting> {
    return this.commandBus.execute(
      new CreateMeetingCommand(dto.title, dto.description ?? null, user.sub),
    );
  }

  @Get()
  findAll(): Promise<Meeting[]> {
    return this.queryBus.execute(new GetMeetingsQuery());
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<Meeting> {
    return this.queryBus.execute(new GetMeetingByIdQuery(id));
  }
}
```

### Регистрация в модуле

```ts
// meetings.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CreateMeetingHandler } from './commands/handlers/create-meeting.handler';
import { MeetingCreatedHandler } from './events/handlers/meeting-created.handler';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { GetMeetingByIdHandler } from './queries/handlers/get-meeting-by-id.handler';
import { GetMeetingsHandler } from './queries/handlers/get-meetings.handler';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MeetingsController],
  providers: [
    MeetingsRepository,
    CreateMeetingHandler,
    GetMeetingsHandler,
    GetMeetingByIdHandler,
    MeetingCreatedHandler,
  ],
})
export class MeetingsModule {}
```

## Тестирование (TDD не меняется)

- **E2e-тесты не зависят от CQRS**: они проверяют HTTP-контракт (`201/200/400/401/404`), поэтому текущие `test/meetings.e2e-spec.ts` остаются рабочими при миграции — это и есть страховка рефакторинга.
- **Unit-тесты пишутся на хендлеры** вместо сервиса: каждый хендлер тестируется изолированно с мок-репозиторием (как сейчас `meetings.service.spec.ts`). `EventBus` в тестах мокается так же, как `JwtService` в тестах auth.
- Контроллер в unit-тестах при желании проверяется мок-шинами (`CommandBus`/`QueryBus`), но обычно достаточно e2e.

## План миграции модуля на CQRS

1. Убедиться, что e2e-тесты модуля зелёные (они — контракт).
2. Установить `@nestjs/cqrs`, подключить `CqrsModule` в модуль.
3. Перенести методы сервиса по одному: метод записи → команда + хендлер, метод чтения → запрос + хендлер; unit-тесты сервиса переезжают в тесты хендлеров.
4. Переключить контроллер на `CommandBus`/`QueryBus`.
5. Удалить опустевший сервис, прогнать `npm run test && npm run test:e2e`.
6. Обновить `CLAUDE.md` приложения (структура модуля изменилась).

## Ссылки

- [NestJS: CQRS](https://docs.nestjs.com/recipes/cqrs) — официальный рецепт с полным API (`Saga`, `IEventHandler` и т.д.)
- [Martin Fowler: CQRS](https://martinfowler.com/bliki/CQRS.html) — границы применимости паттерна
- Правила скилла `nestjs-best-practices`: `arch-use-events`, `arch-single-responsibility`, `arch-use-repository-pattern`
