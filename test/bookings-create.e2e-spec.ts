import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Bookings create (e2e)', () => {
  let app: INestApplication<App>;
  const runId = Date.now().toString(36);

  const uniqueNumber = (suffix: string): string => `LOC-${runId}-${suffix}`;

  const validBookingWindow = {
    startAt: '2026-06-30T10:00:00+08:00',
    endAt: '2026-06-30T11:00:00+08:00',
  };

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

  it('POST /bookings creates a booking on a bookable room (201)', async () => {
    const parent = await createStructuralNode('Floor 1', 'booking-parent');
    const room = await createBookableRoom(parent.id, 'booking-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        bookedBy: 'team-alpha',
        ...validBookingWindow,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
          locationId: room.id,
          department: 'EFM',
          attendeeCount: 8,
          bookedBy: 'team-alpha',
        });
        expect(res.body.id).toEqual(expect.any(String));
        expect(res.body.startAt).toEqual(expect.any(String));
        expect(res.body.endAt).toEqual(expect.any(String));
        expect(res.body.createdAt).toEqual(expect.any(String));
        expect(new Date(res.body.startAt).toISOString()).toBe(
          new Date(validBookingWindow.startAt).toISOString(),
        );
        expect(new Date(res.body.endAt).toISOString()).toBe(
          new Date(validBookingWindow.endAt).toISOString(),
        );
      });
  });

  it('POST /bookings returns 404 LOCATION_NOT_FOUND for unknown locationId', () => {
    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: randomUUID(),
        department: 'EFM',
        attendeeCount: 8,
        ...validBookingWindow,
      })
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe('LOCATION_NOT_FOUND');
      });
  });

  it('POST /bookings returns 422 LOCATION_NOT_BOOKABLE for structural node', async () => {
    const node = await createStructuralNode('Corridor A', 'booking-structural');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: node.id,
        department: 'EFM',
        attendeeCount: 8,
        ...validBookingWindow,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe('LOCATION_NOT_BOOKABLE');
      });
  });

  it('POST /bookings returns 422 DEPARTMENT_MISMATCH when department differs from room', async () => {
    const parent = await createStructuralNode('Floor 2', 'booking-dept-parent');
    const room = await createBookableRoom(parent.id, 'booking-dept-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'FSS',
        attendeeCount: 8,
        ...validBookingWindow,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe('DEPARTMENT_MISMATCH');
      });
  });

  it('POST /bookings returns 400 VALIDATION_ERROR for attendeeCount 0', async () => {
    const parent = await createStructuralNode('Floor 3', 'booking-val-parent');
    const room = await createBookableRoom(parent.id, 'booking-val-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 0,
        ...validBookingWindow,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
  });

  it('POST /bookings returns 400 VALIDATION_ERROR when department is missing', async () => {
    const parent = await createStructuralNode('Floor 4', 'booking-miss-parent');
    const room = await createBookableRoom(parent.id, 'booking-miss-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        attendeeCount: 8,
        ...validBookingWindow,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
  });

  it('POST /bookings returns 422 CAPACITY_EXCEEDED when attendeeCount exceeds capacity', async () => {
    const parent = await createStructuralNode('Floor 5', 'booking-cap-parent');
    const room = await createBookableRoom(parent.id, 'booking-cap-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 11,
        ...validBookingWindow,
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe('CAPACITY_EXCEEDED');
        expect(res.body.details).toMatchObject({
          attendeeCount: 11,
          capacity: 10,
        });
      });
  });

  it('POST /bookings accepts attendeeCount at capacity limit (201)', async () => {
    const parent = await createStructuralNode('Floor 6', 'booking-cap-limit-parent');
    const room = await createBookableRoom(parent.id, 'booking-cap-limit-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 10,
        ...validBookingWindow,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.attendeeCount).toBe(10);
      });
  });

  it('POST /bookings returns 422 OUTSIDE_OPEN_HOURS for Saturday on Mon–Fri room', async () => {
    const parent = await createStructuralNode('Floor 7', 'booking-weekend-parent');
    const room = await createBookableRoom(parent.id, 'booking-weekend-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        startAt: '2026-07-04T10:00:00+08:00',
        endAt: '2026-07-04T11:00:00+08:00',
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe('OUTSIDE_OPEN_HOURS');
      });
  });

  it('POST /bookings returns 422 OUTSIDE_OPEN_HOURS for weekday outside daily window', async () => {
    const parent = await createStructuralNode('Floor 8', 'booking-hours-parent');
    const room = await createBookableRoom(parent.id, 'booking-hours-room');

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        startAt: '2026-06-30T08:00:00+08:00',
        endAt: '2026-06-30T09:00:00+08:00',
      })
      .expect(422)
      .expect((res) => {
        expect(res.body.code).toBe('OUTSIDE_OPEN_HOURS');
      });
  });

  it('POST /bookings accepts Saturday booking on ALWAYS_OPEN room (201)', async () => {
    const parent = await createStructuralNode('Floor 9', 'booking-always-parent');
    const room = await createBookableRoom(parent.id, 'booking-always-room', {
      openHours: { type: 'ALWAYS_OPEN' },
    });

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        startAt: '2026-07-04T02:00:00+08:00',
        endAt: '2026-07-04T03:00:00+08:00',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.locationId).toBe(room.id);
      });
  });

  it('POST /bookings returns 409 BOOKING_OVERLAP for partial overlap', async () => {
    const parent = await createStructuralNode('Floor 10', 'booking-overlap-parent');
    const room = await createBookableRoom(parent.id, 'booking-overlap-room');

    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        ...validBookingWindow,
      })
      .expect(201);

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        startAt: '2026-06-30T10:30:00+08:00',
        endAt: '2026-06-30T11:30:00+08:00',
      })
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe('BOOKING_OVERLAP');
        expect(res.body.details).toMatchObject({
          locationId: room.id,
        });
      });
  });

  it('POST /bookings accepts adjacent booking (half-open window, 201)', async () => {
    const parent = await createStructuralNode('Floor 11', 'booking-adjacent-parent');
    const room = await createBookableRoom(parent.id, 'booking-adjacent-room');

    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        ...validBookingWindow,
      })
      .expect(201);

    return request(app.getHttpServer())
      .post('/bookings')
      .send({
        locationId: room.id,
        department: 'EFM',
        attendeeCount: 8,
        startAt: '2026-06-30T11:00:00+08:00',
        endAt: '2026-06-30T12:00:00+08:00',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.locationId).toBe(room.id);
      });
  });

  it('POST /bookings concurrent requests — exactly one wins (201 + 409)', async () => {
    const parent = await createStructuralNode('Floor 12', 'booking-concurrent-parent');
    const room = await createBookableRoom(parent.id, 'booking-concurrent-room');

    const payload = {
      locationId: room.id,
      department: 'EFM',
      attendeeCount: 8,
      ...validBookingWindow,
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer()).post('/bookings').send(payload),
      request(app.getHttpServer()).post('/bookings').send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect([first.body.code, second.body.code]).toContain('BOOKING_OVERLAP');
  });
});
