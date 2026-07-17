import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface MeetingResponse {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
}

describe('Meetings (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  const registerAndGetToken = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery-staple' })
      .expect(201);
    return (response.body as { accessToken: string }).accessToken;
  };

  const createMeeting = (body: Record<string, unknown>, token = accessToken) =>
    request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  const listMeetings = (token = accessToken) =>
    request(app.getHttpServer()).get('/meetings').set('Authorization', `Bearer ${token}`);
  const getMeeting = (id: string, token = accessToken) =>
    request(app.getHttpServer()).get(`/meetings/${id}`).set('Authorization', `Bearer ${token}`);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Тесты работают с реальным Postgres — чистим таблицы перед каждым тестом.
    const prisma = app.get(PrismaService);
    await prisma.meeting.deleteMany();
    await prisma.user.deleteMany();

    accessToken = await registerAndGetToken('organizer@example.com');
  });

  afterEach(async () => {
    await app.close();
  });

  describe('авторизация', () => {
    it('401: POST /meetings без токена недоступен', async () => {
      await request(app.getHttpServer()).post('/meetings').send({ title: 'Планёрка' }).expect(401);
    });

    it('401: GET /meetings без токена недоступен', async () => {
      await request(app.getHttpServer()).get('/meetings').expect(401);
    });

    it('401: GET /meetings/:id без токена недоступен', async () => {
      await request(app.getHttpServer()).get('/meetings/some-id').expect(401);
    });

    it('401: невалидный токен не принимается', async () => {
      await listMeetings('not-a-valid.jwt.token').expect(401);
    });
  });

  describe('POST /meetings', () => {
    it('201: создаёт встречу и возвращает её с id', async () => {
      const response = await createMeeting({
        title: 'Планёрка',
        description: 'Обсудить спринт',
      }).expect(201);

      const meeting = response.body as MeetingResponse;
      expect(typeof meeting.id).toBe('string');
      expect(meeting.id.length).toBeGreaterThan(0);
      expect(meeting.title).toBe('Планёрка');
      expect(meeting.description).toBe('Обсудить спринт');
    });

    it('201: описание необязательно (в ответе description = null)', async () => {
      const response = await createMeeting({ title: 'Планёрка' }).expect(201);

      expect((response.body as MeetingResponse).description).toBeNull();
    });

    it('привязывает встречу к создателю: ownerId — непустая строка', async () => {
      const response = await createMeeting({ title: 'Планёрка' }).expect(201);

      const { ownerId } = response.body as MeetingResponse;
      expect(typeof ownerId).toBe('string');
      expect(ownerId.length).toBeGreaterThan(0);
    });

    it('встреча действительно сохранена: доступна по GET /meetings/:id', async () => {
      const createResponse = await createMeeting({ title: 'Планёрка' }).expect(201);
      const created = createResponse.body as MeetingResponse;

      const getResponse = await getMeeting(created.id).expect(200);
      expect(getResponse.body).toEqual(created);
    });

    it('400: без title создать встречу нельзя', async () => {
      await createMeeting({ description: 'Без названия' }).expect(400);
    });

    it('400: пустой title не принимается', async () => {
      await createMeeting({ title: '' }).expect(400);
    });

    it('400: title должен быть строкой', async () => {
      await createMeeting({ title: 42 }).expect(400);
    });
  });

  describe('GET /meetings', () => {
    it('200: пустой список, пока встречи не созданы', async () => {
      const response = await listMeetings().expect(200);

      expect(response.body).toEqual([]);
    });

    it('200: возвращает все созданные встречи', async () => {
      await createMeeting({ title: 'Планёрка' }).expect(201);
      await createMeeting({ title: 'Ретроспектива' }).expect(201);

      const response = await listMeetings().expect(200);

      const meetings = response.body as MeetingResponse[];
      expect(meetings).toHaveLength(2);
      expect(meetings.map((meeting) => meeting.title)).toEqual(
        expect.arrayContaining(['Планёрка', 'Ретроспектива']),
      );
    });
  });

  describe('GET /meetings/:id', () => {
    it('200: возвращает встречу по id', async () => {
      const createResponse = await createMeeting({
        title: 'Планёрка',
        description: 'Обсудить спринт',
      }).expect(201);
      const created = createResponse.body as MeetingResponse;

      const response = await getMeeting(created.id).expect(200);

      expect(response.body).toEqual(created);
    });

    it('404: несуществующий id', async () => {
      await getMeeting('non-existent-id').expect(404);
    });
  });
});
