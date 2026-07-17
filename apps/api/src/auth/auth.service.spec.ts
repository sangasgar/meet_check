import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { CreateUserCommand } from '../users/commands/create-user.command';
import { FindUserByEmailQuery } from '../users/queries/find-user-by-email.query';
import { User } from '../users/user.entity';

interface QueryBusMock {
  execute: jest.Mock<Promise<User | null>, [FindUserByEmailQuery]>;
}

interface CommandBusMock {
  execute: jest.Mock<Promise<User>, [CreateUserCommand]>;
}

interface JwtServiceMock {
  signAsync: jest.Mock<Promise<string>, [Record<string, unknown>]>;
}

describe('AuthService', () => {
  let service: AuthService;
  let queryBus: QueryBusMock;
  let commandBus: CommandBusMock;
  let jwtService: JwtServiceMock;

  const email = 'user@example.com';
  const password = 'correct-horse-battery-staple';
  const signedToken = 'signed.jwt.token';

  let passwordHash: string;
  let existingUser: User;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(async () => {
    existingUser = { id: 'user-id-1', email, passwordHash };

    queryBus = { execute: jest.fn<Promise<User | null>, [FindUserByEmailQuery]>() };
    commandBus = { execute: jest.fn<Promise<User>, [CreateUserCommand]>() };
    jwtService = {
      signAsync: jest
        .fn<Promise<string>, [Record<string, unknown>]>()
        .mockResolvedValue(signedToken),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: QueryBus, useValue: queryBus },
        { provide: CommandBus, useValue: commandBus },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('ищет пользователя запросом FindUserByEmailQuery и возвращает JWT при верном пароле', async () => {
      queryBus.execute.mockResolvedValue(existingUser);

      const result = await service.login(email, password);

      expect(queryBus.execute).toHaveBeenCalledWith(new FindUserByEmailQuery(email));
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: existingUser.id,
        email: existingUser.email,
      });
      expect(result).toEqual({ accessToken: signedToken });
    });

    it('бросает UnauthorizedException и не выдаёт токен, если пользователь не найден', async () => {
      queryBus.execute.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('бросает UnauthorizedException и не выдаёт токен при неверном пароле', async () => {
      queryBus.execute.mockResolvedValue(existingUser);

      await expect(service.login(email, 'wrong-password')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('не отправляет команд (ничего не создаёт) при входе', async () => {
      queryBus.execute.mockResolvedValue(existingUser);
      await service.login(email, password);

      queryBus.execute.mockResolvedValue(null);
      await expect(service.login('unknown@example.com', password)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('создаёт пользователя командой CreateUserCommand и возвращает JWT', async () => {
      queryBus.execute.mockResolvedValue(null);
      commandBus.execute.mockImplementation((command) =>
        Promise.resolve({
          id: 'new-user-id',
          email: command.email,
          passwordHash: command.passwordHash,
        }),
      );

      const result = await service.register(email, password);

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(CreateUserCommand);
      expect(command.email).toBe(email);
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'new-user-id', email });
      expect(result).toEqual({ accessToken: signedToken });
    });

    it('передаёт в команду bcrypt-хеш пароля, а не открытый текст', async () => {
      queryBus.execute.mockResolvedValue(null);
      commandBus.execute.mockImplementation((command) =>
        Promise.resolve({
          id: 'new-user-id',
          email: command.email,
          passwordHash: command.passwordHash,
        }),
      );

      await service.register(email, password);

      const storedHash = commandBus.execute.mock.calls[0][0].passwordHash;
      expect(storedHash).not.toBe(password);
      await expect(bcrypt.compare(password, storedHash)).resolves.toBe(true);
    });

    it('бросает ConflictException и не отправляет команду, если e-mail уже занят', async () => {
      queryBus.execute.mockResolvedValue(existingUser);

      await expect(service.register(email, password)).rejects.toThrow(ConflictException);
      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
