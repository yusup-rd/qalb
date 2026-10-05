import { Module } from '@nestjs/common';
import { IslamicEventsController } from './islamic-events.controller.js';
import { IslamicEventsService } from './islamic-events.service.js';

@Module({
  controllers: [IslamicEventsController],
  providers: [IslamicEventsService],
})
export class IslamicEventsModule {}
