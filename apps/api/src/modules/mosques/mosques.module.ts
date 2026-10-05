import { Module } from '@nestjs/common';
import { MosquesController } from './mosques.controller.js';
import { MosquesService } from './mosques.service.js';

@Module({ controllers: [MosquesController], providers: [MosquesService] })
export class MosquesModule {}
