import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CreateUserCommand } from '../create-user.command';
import { User } from '../../user.entity';
import { UsersRepository } from '../../users.repository';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, User> {
  constructor(private readonly usersRepository: UsersRepository) {}

  execute(command: CreateUserCommand): Promise<User> {
    return this.usersRepository.create({
      email: command.email,
      passwordHash: command.passwordHash,
    });
  }
}
