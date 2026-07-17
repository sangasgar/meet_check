import { Test, TestingModule } from '@nestjs/testing';

import { FindUserByEmailHandler } from './find-user-by-email.handler';
import { FindUserByEmailQuery } from '../find-user-by-email.query';
import { User } from '../../user.entity';
import { CreateUserData, UsersRepository } from '../../users.repository';

interface UsersRepositoryMock {
  create: jest.Mock<Promise<User>, [CreateUserData]>;
  findByEmail: jest.Mock<Promise<User | null>, [string]>;
}

describe('FindUserByEmailHandler', () => {
  let handler: FindUserByEmailHandler;
  let repository: UsersRepositoryMock;

  const email = 'user@example.com';

  beforeEach(async () => {
    repository = {
      create: jest.fn<Promise<User>, [CreateUserData]>(),
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FindUserByEmailHandler, { provide: UsersRepository, useValue: repository }],
    }).compile();

    handler = module.get(FindUserByEmailHandler);
  });

  it('возвращает найденного по e-mail пользователя', async () => {
    const user: User = { id: 'user-id-1', email, passwordHash: 'hash' };
    repository.findByEmail.mockResolvedValue(user);

    const result = await handler.execute(new FindUserByEmailQuery(email));

    expect(repository.findByEmail).toHaveBeenCalledWith(email);
    expect(result).toEqual(user);
  });

  it('возвращает null, если пользователя нет', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await expect(handler.execute(new FindUserByEmailQuery(email))).resolves.toBeNull();
  });
});
