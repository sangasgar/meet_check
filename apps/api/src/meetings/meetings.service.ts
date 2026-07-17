import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateMeetingDto } from './dto/create-meeting.dto';
import { Meeting } from './meeting.entity';
import { MeetingsRepository } from './meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(private readonly meetingsRepository: MeetingsRepository) {}

  create(dto: CreateMeetingDto, ownerId: string): Promise<Meeting> {
    return this.meetingsRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      ownerId,
    });
  }

  findAll(): Promise<Meeting[]> {
    return this.meetingsRepository.findAll();
  }

  async findById(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findById(id);
    if (!meeting) {
      throw new NotFoundException(`Встреча с id ${id} не найдена`);
    }
    return meeting;
  }
}
