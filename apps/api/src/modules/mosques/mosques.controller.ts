import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MosquesService } from './mosques.service.js';

@Controller('api/mosques')
export class MosquesController {
  constructor(private readonly mosques: MosquesService) {}

  @Get('nearby')
  nearby(
    @Query('lat') latValue: string,
    @Query('lng') lngValue: string,
    @Query('radius') radiusValue = '200000',
    @Query('limit') limitValue = '20',
  ) {
    const lat = Number(latValue);
    const lng = Number(lngValue);
    const radius = Number(radiusValue);
    const limit = Number(limitValue);
    if (
      ![lat, lng, radius, limit].every(Number.isFinite) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      radius <= 0 ||
      limit <= 0 ||
      limit > 100
    ) {
      throw new BadRequestException('Invalid mosque search parameters.');
    }
    return this.mosques.nearby(lat, lng, radius, limit);
  }
}
