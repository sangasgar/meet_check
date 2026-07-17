import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Meeting } from './meeting.entity';
import { CreateMeetingData, MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';

interface MeetingsRepositoryMock {
  create: jest.Mock<Promise<Meeting>, [CreateMeetingData]>;
  findAll: jest.Mock<Promise<Meeting[]>, []>;
  findById: jest.Mock<Promise<Meeting | null>, [string]>;
}

describe('MeetingsService', () => {
  let service: MeetingsService;
  let repository: MeetingsRepositoryMock;

  const ownerId = 'user-id-1';
  const meeting: Meeting = {
    id: 'meeting-id-1',
    title: 'Планёрка',
    description: 'Обсудить спринт',
    ownerId,
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn<Promise<Meeting>, [CreateMeetingData]>(),
      findAll: jest.fn<Promise<Meeting[]>, []>(),
      findById: jest.fn<Promise<Meeting | null>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MeetingsService, { provide: MeetingsRepository, useValue: repository }],
    }).compile();

    service = module.get(MeetingsService);
  });

  describe('create', () => {
    it('создаёт встречу с ownerId создателя и возвращает её', async () => {
      repository.create.mockResolvedValue(meeting);

      const result = await service.create(
        { title: 'Планёрка', description: 'Обсудить спринт' },
        ownerId,
      );

      expect(repository.create).toHaveBeenCalledWith({
        title: 'Планёрка',
        description: 'Обсудить спринт',
        ownerId,
      });
      expect(result).toEqual(meeting);
    });

    it('подставляет null, если описание не передано', async () => {
      repository.create.mockResolvedValue({ ...meeting, description: null });

      await service.create({ title: 'Планёрка' }, ownerId);

      expect(repository.create).toHaveBeenCalledWith({
        title: 'Планёрка',
        description: null,
        ownerId,
      });
    });
  });

  describe('findAll', () => {
    it('возвращает список встреч из репозитория', async () => {
      repository.findAll.mockResolvedValue([meeting]);

      await expect(service.findAll()).resolves.toEqual([meeting]);
    });
  });

  describe('findById', () => {
    it('возвращает встречу по id', async () => {
      repository.findById.mockResolvedValue(meeting);

      await expect(service.findById('meeting-id-1')).resolves.toEqual(meeting);
      expect(repository.findById).toHaveBeenCalledWith('meeting-id-1');
    });

    it('бросает NotFoundException, если встречи нет', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
