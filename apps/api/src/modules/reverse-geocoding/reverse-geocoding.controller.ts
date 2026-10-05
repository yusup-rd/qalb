import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReverseGeocodingService } from './reverse-geocoding.service.js';

@Controller('api/reverse-geocoding')
export class ReverseGeocodingController {
  constructor(private readonly geocoding: ReverseGeocodingService) {}

  @Get()
  reverse(
    @Query('lat') latValue: string,
    @Query('lon') lonValue: string,
    @Query('language') language = 'en',
  ) {
    const lat = Number(latValue);
    const lon = Number(lonValue);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      throw new BadRequestException('Invalid coordinates.');
    }
    return this.geocoding.reverse(lat, lon, language);
  }
}
