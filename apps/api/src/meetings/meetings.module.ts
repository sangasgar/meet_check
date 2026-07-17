import { Module } from '@nestjs/common';

import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { MeetingsService } from './meetings.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
