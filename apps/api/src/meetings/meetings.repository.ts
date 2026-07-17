import { Injectable } from '@nestjs/common';

import { Meeting } from './meeting.entity';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateMeetingData {
  title: string;
  description: string | null;
  ownerId: string;
}

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMeetingData): Promise<Meeting> {
    return this.prisma.meeting.create({ data });
  }

  findAll(): Promise<Meeting[]> {
    return this.prisma.meeting.findMany();
  }

  findById(id: string): Promise<Meeting | null> {
    return this.prisma.meeting.findUnique({ where: { id } });
  }
}
