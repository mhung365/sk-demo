import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Bookings query (e2e)', () => {
  let app: INestApplication<App>;
  const runId = Date.now().toString(36);

  const uniqueNumber = (suffix: string): string => `LOC-${runId}-${suffix}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createStructuralNode(name: string, suffix: string) {
    const res = await request(app.getHttpServer())
      .post('/locations')
      .send({
        name,
        locationNumber: uniqueNumber(suffix),
      })
      .expect(201);
    return res.body;
  }

  async function createBookableRoom(
    parentId: string,
    suffix: string,
    overrides: Record<string, unknown> = {},
  ) {
    const res = await request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId,
        name: 'Meeting Room 1',
        locationNumber: uniqueNumber(suffix),
        department: 'EFM',
        capacity: 10,
        openHours: {
          type: 'RECURRING',
          days: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '18:00',
        },
        ...overrides,
      })
      .expect(201);
    return res.body;
  }

  async function createBooking(
    locationId: string,
    startAt: string,
    endAt: string,
    overrides: Record<string, unknown> = {},
  ) {
    const res = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId,
        department: 'EFM',
        attendeeCount: 8,
        bookedBy: 'team-alpha',
        startAt,
        endAt,
        ...overrides,
      })
      .expect(201);
    return res.body;
  }

  it('GET /bookings/:id returns booking with full shape (200)', async () => {
    const parent = await createStructuralNode('Floor 1', 'query-get-parent');
    const room = await createBookableRoom(parent.id, 'query-get-room');
    const created = await createBooking(
      room.id,
      '2026-06-30T10:00:00+08:00',
      '2026-06-30T11:00:00+08:00',
    );

    return request(app.getHttpServer())
      .get(`/bookings/${created.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: created.id,
          locationId: room.id,
          department: 'EFM',
          attendeeCount: 8,
          bookedBy: 'team-alpha',
        });
        expect(res.body.startAt).toEqual(expect.any(String));
        expect(res.body.endAt).toEqual(expect.any(String));
        expect(res.body.createdAt).toEqual(expect.any(String));
        expect(new Date(res.body.startAt).toISOString()).toBe(
          new Date('2026-06-30T10:00:00+08:00').toISOString(),
        );
        expect(new Date(res.body.endAt).toISOString()).toBe(
          new Date('2026-06-30T11:00:00+08:00').toISOString(),
        );
      });
  });

  it('GET /bookings/:id returns 404 BOOKING_NOT_FOUND for unknown id', () => {
    return request(app.getHttpServer())
      .get(`/bookings/${randomUUID()}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe('BOOKING_NOT_FOUND');
      });
  });

  it('GET /bookings returns all bookings ordered by startAt ascending (200)', async () => {
    const parent = await createStructuralNode('Floor 2', 'query-list-parent');
    const room = await createBookableRoom(parent.id, 'query-list-room');

    const first = await createBooking(
      room.id,
      '2026-07-01T14:00:00+08:00',
      '2026-07-01T15:00:00+08:00',
    );
    const second = await createBooking(
      room.id,
      '2026-07-01T10:00:00+08:00',
      '2026-07-01T11:00:00+08:00',
    );

    return request(app.getHttpServer())
      .get('/bookings')
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(first.id);
        expect(ids).toContain(second.id);
        const firstIdx = ids.indexOf(first.id);
        const secondIdx = ids.indexOf(second.id);
        expect(secondIdx).toBeLessThan(firstIdx);
      });
  });

  it('GET /bookings?locationId filters by location (200)', async () => {
    const parent = await createStructuralNode('Floor 3', 'query-loc-parent');
    const roomA = await createBookableRoom(parent.id, 'query-loc-room-a');
    const roomB = await createBookableRoom(parent.id, 'query-loc-room-b', {
      name: 'Meeting Room 2',
    });

    const bookingA = await createBooking(
      roomA.id,
      '2026-07-02T10:00:00+08:00',
      '2026-07-02T11:00:00+08:00',
    );
    await createBooking(
      roomB.id,
      '2026-07-02T10:00:00+08:00',
      '2026-07-02T11:00:00+08:00',
    );

    return request(app.getHttpServer())
      .get(`/bookings?locationId=${roomA.id}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body.every((b: { locationId: string }) => b.locationId === roomA.id)).toBe(
          true,
        );
        expect(res.body.map((b: { id: string }) => b.id)).toContain(bookingA.id);
      });
  });

  it('GET /bookings?from=&to= returns only bookings overlapping the window (200)', async () => {
    const parent = await createStructuralNode('Floor 4', 'query-time-parent');
    const room = await createBookableRoom(parent.id, 'query-time-room');

    const overlapping = await createBooking(
      room.id,
      '2026-06-30T10:00:00+08:00',
      '2026-06-30T11:00:00+08:00',
    );
    const adjacent = await createBooking(
      room.id,
      '2026-06-30T11:00:00+08:00',
      '2026-06-30T12:00:00+08:00',
    );

    return request(app.getHttpServer())
      .get(
        '/bookings?from=2026-06-30T10:30:00%2B08:00&to=2026-06-30T11:00:00%2B08:00',
      )
      .expect(200)
      .expect((res) => {
        const ids = res.body.map((b: { id: string }) => b.id);
        expect(ids).toContain(overlapping.id);
        expect(ids).not.toContain(adjacent.id);
      });
  });

  it('GET /bookings returns 400 VALIDATION_ERROR for invalid locationId', () => {
    return request(app.getHttpServer())
      .get('/bookings?locationId=not-a-uuid')
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
  });

  it('GET /bookings returns 400 VALIDATION_ERROR for malformed date', () => {
    return request(app.getHttpServer())
      .get('/bookings?from=not-a-date')
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
  });
});
