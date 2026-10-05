import { Controller, Get } from '@nestjs/common';
import { MetalsService } from './metals.service.js';

@Controller('api/metals')
export class MetalsController {
  constructor(private readonly metals: MetalsService) {}

  @Get('latest')
  getLatest() {
    return this.metals.getLatest();
  }
}
