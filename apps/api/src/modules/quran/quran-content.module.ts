import { Module } from '@nestjs/common';
import { QuranContentController } from './quran-content.controller.js';
import { QuranContentSyncService } from './quran-content-sync.service.js';

@Module({
  controllers: [QuranContentController],
  providers: [QuranContentSyncService],
})
export class QuranContentModule {}
