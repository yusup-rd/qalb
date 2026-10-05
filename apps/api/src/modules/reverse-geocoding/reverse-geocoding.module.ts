import { Module } from '@nestjs/common';
import { ReverseGeocodingController } from './reverse-geocoding.controller.js';
import { ReverseGeocodingService } from './reverse-geocoding.service.js';

@Module({
  controllers: [ReverseGeocodingController],
  providers: [ReverseGeocodingService],
})
export class ReverseGeocodingModule {}
