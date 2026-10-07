import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
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
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                },
              },
      },
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
