import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface TokenResponse {
  accessToken: string;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const email = 'user@example.com';
  const password = 'correct-horse-battery-staple';

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/register').send(body);
  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/login').send(body);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('201: создаёт пользователя и возвращает JWT-токен (непустая строка)', async () => {
      const response = await register({ email, password }).expect(201);

      const { accessToken } = response.body as TokenResponse;
      expect(typeof accessToken).toBe('string');
      expect(accessToken.length).toBeGreaterThan(0);
    });

    it('пользователь действительно создан: после регистрации можно войти', async () => {
      await register({ email, password }).expect(201);
      await login({ email, password }).expect(201);
    });

    it('409: повторная регистрация с тем же e-mail недоступна', async () => {
      await register({ email, password }).expect(201);
      await register({ email, password: 'another-password' }).expect(409);
    });

    it('400: без e-mail регистрация не работает', async () => {
      await register({ password }).expect(400);
    });

    it('400: без пароля регистрация не работает', async () => {
      await register({ email }).expect(400);
    });

    it('400: невалидный формат e-mail не работает', async () => {
      await register({ email: 'not-an-email', password }).expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await register({ email, password }).expect(201);
    });

    it('201: возвращает JWT-токен (непустая строка) при верных данных', async () => {
      const response = await login({ email, password }).expect(201);

      const { accessToken } = response.body as TokenResponse;
      expect(typeof accessToken).toBe('string');
      expect(accessToken.length).toBeGreaterThan(0);
    });

    it('401: несуществующий пользователь не может войти', async () => {
      await login({ email: 'unknown@example.com', password }).expect(401);
    });

    it('401: неверный пароль не работает', async () => {
      await login({ email, password: 'wrong-password' }).expect(401);
    });

    it('400: без e-mail вход не работает', async () => {
      await login({ password }).expect(400);
    });

    it('400: без пароля вход не работает', async () => {
      await login({ email }).expect(400);
    });

    it('400: невалидный формат e-mail не работает', async () => {
      await login({ email: 'not-an-email', password }).expect(400);
    });
  });
});
