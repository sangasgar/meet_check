import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthenticatedRequest, JwtPayload } from './jwt-payload.interface';

interface JwtServiceMock {
  verifyAsync: jest.Mock<Promise<JwtPayload>, [string]>;
}

const createRequest = (headers: Record<string, string>): AuthenticatedRequest =>
  ({ headers }) as unknown as AuthenticatedRequest;

const createContext = (request: AuthenticatedRequest): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtServiceMock;

  const payload: JwtPayload = { sub: 'user-id-1', email: 'user@example.com' };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn<Promise<JwtPayload>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, { provide: JwtService, useValue: jwtService }],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  it('пропускает запрос с валидным Bearer-токеном и кладёт payload в request.user', async () => {
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request = createRequest({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual(payload);
  });

  it('бросает UnauthorizedException без заголовка Authorization', async () => {
    const request = createRequest({});

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('бросает UnauthorizedException, если схема авторизации не Bearer', async () => {
    const request = createRequest({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('бросает UnauthorizedException, если токен не проходит проверку', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
    const request = createRequest({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(UnauthorizedException);
  });
});
