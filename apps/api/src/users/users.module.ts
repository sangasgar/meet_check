import { Module } from '@nestjs/common';

import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { FindUserByEmailHandler } from './queries/handlers/find-user-by-email.handler';
import { UsersRepository } from './users.repository';
import { PrismaModule } from '../prisma/prisma.module';

// Модуль общается с остальными через CQRS-шину (команды/запросы),
// поэтому репозиторий наружу не экспортируется.
@Module({
  imports: [PrismaModule],
  providers: [UsersRepository, CreateUserHandler, FindUserByEmailHandler],
})
export class UsersModule {}
