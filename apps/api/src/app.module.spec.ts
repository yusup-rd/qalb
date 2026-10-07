import { createServer } from 'node:http';
import { Writable } from 'node:stream';
import { LoggerModule } from 'nestjs-pino';
import { pinoHttp, type Options } from 'pino-http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('HTTP logging configuration', () => {
  let options: Options;

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'info');
    const configureLogger = vi.spyOn(LoggerModule, 'forRoot');
    try {
      await import('./app.module.js');
      options = configureLogger.mock.calls[0]![0]!.pinoHttp as Options;
    } finally {
      configureLogger.mockRestore();
    }
  });

  afterAll(() => vi.unstubAllEnvs());

  it('does not load a pretty transport in production', () => {
    expect(options.transport).toBeUndefined();
  });

  it('excludes credentials and URL data from request and completion logs', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const middleware = pinoHttp(options, stream);
    const server = createServer((req, res) => {
      Object.assign(req, {
        query: { token: 'query-secret' },
        params: { id: 'private-location' },
      });
      middleware(req, res);
      req.log.info('Handling request');
      res.end('ok');
    });

    await request(server)
      .get('/private-location?lat=3.139&lng=101.6869&token=query-secret')
      .set('Authorization', 'Bearer header-secret')
      .set('Cookie', 'session=cookie-secret')
      .set('Referer', 'https://example.com/?token=referer-secret')
      .expect(200);

    const logs = lines.map((line) => JSON.parse(line));
    expect(logs).toHaveLength(2);
    for (const log of logs) {
      expect(log.req.method).toBe('GET');
      expect(log.req).not.toHaveProperty('url');
      expect(log.req).not.toHaveProperty('query');
      expect(log.req).not.toHaveProperty('params');
      expect(log.req.headers).not.toHaveProperty('authorization');
      expect(log.req.headers).not.toHaveProperty('cookie');
      expect(log.req.headers).not.toHaveProperty('referer');
    }
    expect(lines.join('')).not.toMatch(
      /header-secret|cookie-secret|query-secret|referer-secret|private-location|3\.139|101\.6869/,
    );
  });
});
