import { Test, TestingModule } from '@nestjs/testing';

import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from '../create-user.command';
import { User } from '../../user.entity';
import { CreateUserData, UsersRepository } from '../../users.repository';

interface UsersRepositoryMock {
  create: jest.Mock<Promise<User>, [CreateUserData]>;
  findByEmail: jest.Mock<Promise<User | null>, [string]>;
}

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let repository: UsersRepositoryMock;

  const email = 'user@example.com';
  const passwordHash = 'bcrypt-hash';

  beforeEach(async () => {
    repository = {
      create: jest.fn<Promise<User>, [CreateUserData]>(),
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CreateUserHandler, { provide: UsersRepository, useValue: repository }],
    }).compile();

    handler = module.get(CreateUserHandler);
  });

  it('создаёт пользователя через репозиторий и возвращает его', async () => {
    const user: User = { id: 'user-id-1', email, passwordHash };
    repository.create.mockResolvedValue(user);

    const result = await handler.execute(new CreateUserCommand(email, passwordHash));

    expect(repository.create).toHaveBeenCalledWith({ email, passwordHash });
    expect(result).toEqual(user);
  });
});
