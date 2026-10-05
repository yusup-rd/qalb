import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module.js';
import { IslamicEventsModule } from './modules/islamic-events/islamic-events.module.js';
import { MetalsModule } from './modules/metals/metals.module.js';
import { MosquesModule } from './modules/mosques/mosques.module.js';
import { ReverseGeocodingModule } from './modules/reverse-geocoding/reverse-geocoding.module.js';
import { RoutingModule } from './modules/routing/routing.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CommonModule,
    MetalsModule,
    IslamicEventsModule,
    MosquesModule,
    ReverseGeocodingModule,
    RoutingModule,
  ],
})
export class AppModule {}
