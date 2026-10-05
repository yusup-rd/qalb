import { Module } from '@nestjs/common';
import { MetalsController } from './metals.controller.js';
import { MetalsService } from './metals.service.js';

@Module({ controllers: [MetalsController], providers: [MetalsService] })
export class MetalsModule {}
