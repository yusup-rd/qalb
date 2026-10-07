import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppModule } from '../src/app.module.js';
import { RedisService } from '../src/common/redis.service.js';

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
};

describe('Qalb API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/metals/latest', () => {
    it('returns cached metal prices', async () => {
      redisMock.get.mockResolvedValue({
        goldPerGram: 140.78,
        silverPerGram: 2.13,
        updatedAt: '2026-10-07T12:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .get('/api/metals/latest')
        .expect(200);

      expect(response.body).toEqual({
        goldPerGram: 140.78,
        silverPerGram: 2.13,
        updatedAt: '2026-10-07T12:00:00.000Z',
      });

      expect(redisMock.get).toHaveBeenCalledWith('qalb:metals:latest:usd:g');
    });
  });

  describe('GET /api/islamic-events/calendar', () => {
    it('returns cached Islamic calendar data', async () => {
      const cached = [
        {
          date: '2026-10-07',
          hijriDate: {
            day: 15,
            month: 4,
            year: 1448,
          },
          events: [],
        },
      ];

      redisMock.get.mockResolvedValue(cached);

      const response = await request(app.getHttpServer())
        .get('/api/islamic-events/calendar')
        .query({ month: 10, year: 2026 })
        .expect(200);

      expect(response.body).toEqual(cached);
      expect(redisMock.get).toHaveBeenCalledWith('qalb:islamic-events:2026:10');
    });

    it('rejects invalid calendar values', async () => {
      await request(app.getHttpServer())
        .get('/api/islamic-events/calendar')
        .query({ month: 13, year: 2026 })
        .expect(400);
    });
  });

  describe('GET /api/mosques/nearby', () => {
    it('returns cached nearby mosques', async () => {
      const cached = [
        {
          id: 'mosque-1',
          name: 'Test Mosque',
          street: 'Test Street',
          latitude: 3.1579,
          longitude: 101.7123,
        },
      ];

      redisMock.get.mockResolvedValue(cached);

      const response = await request(app.getHttpServer())
        .get('/api/mosques/nearby')
        .query({
          lat: 3.1579,
          lng: 101.7123,
          radius: 10000,
          limit: 20,
        })
        .expect(200);

      expect(response.body).toEqual(cached);
    });

    it('rejects invalid coordinates', async () => {
      await request(app.getHttpServer())
        .get('/api/mosques/nearby')
        .query({
          lat: 999,
          lng: 101.7123,
        })
        .expect(400);
    });
  });

  describe('GET /api/reverse-geocoding', () => {
    it('returns cached location data', async () => {
      const cached = {
        city: 'Kuala Lumpur',
        country: 'Malaysia',
      };

      redisMock.get.mockResolvedValue(cached);

      const response = await request(app.getHttpServer())
        .get('/api/reverse-geocoding')
        .query({
          lat: 3.139,
          lon: 101.6869,
          language: 'en',
        })
        .expect(200);

      expect(response.body).toEqual(cached);
    });

    it('rejects invalid coordinates', async () => {
      await request(app.getHttpServer())
        .get('/api/reverse-geocoding')
        .query({
          lat: 100,
          lon: 101.6869,
        })
        .expect(400);
    });
  });

  describe('POST /api/routing/route', () => {
    it('returns a cached route', async () => {
      const cached = {
        distanceMeters: 2500,
        durationSeconds: 420,
        coordinates: [
          {
            latitude: 3.139,
            longitude: 101.6869,
          },
          {
            latitude: 3.1579,
            longitude: 101.7123,
          },
        ],
      };

      redisMock.get.mockResolvedValue(cached);

      const response = await request(app.getHttpServer())
        .post('/api/routing/route')
        .send({
          origin: {
            latitude: 3.139,
            longitude: 101.6869,
          },
          destination: {
            latitude: 3.1579,
            longitude: 101.7123,
          },
        })
        .expect(201);

      expect(response.body).toEqual(cached);
    });

    it('rejects a request without origin or destination', async () => {
      await request(app.getHttpServer())
        .post('/api/routing/route')
        .send({
          origin: {
            latitude: 3.139,
            longitude: 101.6869,
          },
        })
        .expect(400);
    });
  });

  describe('POST /api/routing/metrics', () => {
    it('returns cached route metrics', async () => {
      const cached = [
        {
          distanceMeters: 2500,
          durationSeconds: 420,
        },
      ];

      redisMock.get.mockResolvedValue(cached);

      const response = await request(app.getHttpServer())
        .post('/api/routing/metrics')
        .send({
          origin: {
            latitude: 3.139,
            longitude: 101.6869,
          },
          destinations: [
            {
              latitude: 3.1579,
              longitude: 101.7123,
            },
          ],
        })
        .expect(201);

      expect(response.body).toEqual(cached);
    });

    it('rejects a request without destinations', async () => {
      await request(app.getHttpServer())
        .post('/api/routing/metrics')
        .send({
          origin: {
            latitude: 3.139,
            longitude: 101.6869,
          },
        })
        .expect(400);
    });
  });
});
