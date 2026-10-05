import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { IslamicEventsService } from './islamic-events.service.js';

@Controller('api/islamic-events')
export class IslamicEventsController {
  constructor(private readonly events: IslamicEventsService) {}

  @Get('calendar')
  getCalendar(
    @Query('month') monthValue: string,
    @Query('year') yearValue: string,
  ) {
    const month = Number(monthValue);
    const year = Number(yearValue);
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2200
    ) {
      throw new BadRequestException(
        'month and year must be valid calendar values.',
      );
    }
    return this.events.getCalendar(month, year);
  }
}
