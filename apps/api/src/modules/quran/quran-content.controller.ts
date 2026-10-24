import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QuranContentSyncService } from './quran-content-sync.service.js';

@Controller('api/quran')
export class QuranContentController {
  constructor(private readonly contentSync: QuranContentSyncService) {}

  @Get('status')
  async getStatus() {
    this.contentSync.requestCatchUp();
    const status = await this.contentSync.getStatus();
    if (!status.available) {
      throw new ServiceUnavailableException(
        'Quran content is not available yet.',
      );
    }
    return status;
  }

  @Get('snapshot')
  async getSnapshot() {
    const content = await this.contentSync.getDataset();
    return content;
  }

  @Get('changes')
  async getChanges(@Query('revision') revision?: string) {
    if (revision && revision.length > 128) {
      throw new BadRequestException('Client revision is invalid.');
    }
    return this.contentSync.getChanges(revision || null);
  }
}
