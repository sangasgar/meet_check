import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { CreateUserData, UsersRepository } from '../users/users.repository';

interface UsersRepositoryMock {
  findByEmail: jest.Mock<Promise<User | null>, [string]>;
  create: jest.Mock<Promise<User>, [CreateUserData]>;
}

interface JwtServiceMock {
  signAsync: jest.Mock<Promise<string>, [Record<string, unknown>]>;
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: UsersRepositoryMock;
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

    usersRepository = {
      findByEmail: jest.fn<Promise<User | null>, [string]>(),
      create: jest.fn<Promise<User>, [CreateUserData]>(),
    };
    jwtService = {
      signAsync: jest
        .fn<Promise<string>, [Record<string, unknown>]>()
        .mockResolvedValue(signedToken),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('ищет пользователя по e-mail и возвращает JWT-токен при верном пароле', async () => {
      usersRepository.findByEmail.mockResolvedValue(existingUser);

      const result = await service.login(email, password);

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: existingUser.id,
        email: existingUser.email,
      });
      expect(result).toEqual({ accessToken: signedToken });
    });

    it('бросает UnauthorizedException и не выдаёт токен, если пользователь не найден', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('бросает UnauthorizedException и не выдаёт токен при неверном пароле', async () => {
      usersRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(service.login(email, 'wrong-password')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('не создаёт нового пользователя ни при успехе, ни при неудаче', async () => {
      usersRepository.findByEmail.mockResolvedValue(existingUser);
      await service.login(email, password);

      usersRepository.findByEmail.mockResolvedValue(null);
      await expect(service.login('unknown@example.com', password)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('создаёт нового пользователя и возвращает JWT-токен', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockImplementation((data) =>
        Promise.resolve({ id: 'new-user-id', ...data }),
      );

      const result = await service.register(email, password);

      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create.mock.calls[0][0].email).toBe(email);
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'new-user-id', email });
      expect(result).toEqual({ accessToken: signedToken });
    });

    it('сохраняет пароль в виде bcrypt-хеша, а не открытым текстом', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockImplementation((data) =>
        Promise.resolve({ id: 'new-user-id', ...data }),
      );

      await service.register(email, password);

      const storedHash = usersRepository.create.mock.calls[0][0].passwordHash;
      expect(storedHash).not.toBe(password);
      await expect(bcrypt.compare(password, storedHash)).resolves.toBe(true);
    });

    it('бросает ConflictException и никого не создаёт, если e-mail уже занят', async () => {
      usersRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(email, password)).rejects.toThrow(ConflictException);
      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
