import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { Meeting } from './meeting.entity';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: JwtPayload): Promise<Meeting> {
    return this.meetingsService.create(dto, user.sub);
  }

  @Get()
  findAll(): Promise<Meeting[]> {
    return this.meetingsService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findById(id);
  }
}
