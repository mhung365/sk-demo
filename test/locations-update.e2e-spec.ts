import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Locations update (e2e)', () => {
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

  it('PATCH /locations/:id updates name only on structural node', async () => {
    const node = await createStructuralNode('Building A', 'patch-name');

    return request(app.getHttpServer())
      .patch(`/locations/${node.id}`)
      .send({ name: 'Building A (Renamed)' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: node.id,
          name: 'Building A (Renamed)',
          isBookable: false,
        });
      });
  });

  it('PATCH /locations/:id updates capacity on bookable room', async () => {
    const parent = await createStructuralNode('Floor 1', 'patch-cap-parent');
    const room = await createBookableRoom(parent.id, 'patch-cap-room');

    return request(app.getHttpServer())
      .patch(`/locations/${room.id}`)
      .send({ capacity: 12 })
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: room.id,
          capacity: 12,
          department: 'EFM',
          isBookable: true,
        });
      });
  });

  it('PATCH /locations/:id maps Mon–Fri 9AM–6PM label to structured openHours', async () => {
    const parent = await createStructuralNode('Floor 2', 'patch-label-parent');
    const room = await createBookableRoom(parent.id, 'patch-label-room');

    return request(app.getHttpServer())
      .patch(`/locations/${room.id}`)
      .send({
        openHours: { label: 'Mon–Fri 9AM–6PM' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.openHours).toMatchObject({
          type: 'RECURRING',
          days: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '18:00',
          label: 'Mon–Fri 9AM–6PM',
        });
        expect(res.body.isBookable).toBe(true);
      });
  });

  it('PATCH /locations/:id maps Always open label to ALWAYS_OPEN', async () => {
    const parent = await createStructuralNode('Floor 3', 'patch-always-parent');
    const room = await createBookableRoom(parent.id, 'patch-always-room');

    return request(app.getHttpServer())
      .patch(`/locations/${room.id}`)
      .send({
        openHours: { label: 'Always open' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.openHours).toEqual({ type: 'ALWAYS_OPEN' });
        expect(res.body.openHours.days).toBeUndefined();
        expect(res.body.openHours.startTime).toBeUndefined();
        expect(res.body.openHours.endTime).toBeUndefined();
        expect(res.body.isBookable).toBe(true);
      });
  });

  it('PATCH /locations/:id returns 404 for unknown id', () => {
    return request(app.getHttpServer())
      .patch('/locations/00000000-0000-4000-8000-000000000000')
      .send({ name: 'Ghost' })
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          code: 'LOCATION_NOT_FOUND',
        });
      });
  });

  it('PATCH /locations/:id returns 422 for partial bookable fields on structural node', async () => {
    const node = await createStructuralNode('Wing B', 'patch-partial');

    return request(app.getHttpServer())
      .patch(`/locations/${node.id}`)
      .send({ department: 'EFM' })
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 422,
          code: 'INCOMPLETE_BOOKABLE_FIELDS',
        });
      });
  });

  it('PATCH /locations/:id returns 422 for invalid open hours label', async () => {
    const parent = await createStructuralNode('Floor 4', 'patch-invalid-parent');
    const room = await createBookableRoom(parent.id, 'patch-invalid-room');

    return request(app.getHttpServer())
      .patch(`/locations/${room.id}`)
      .send({
        openHours: { label: 'Open sometimes maybe' },
      })
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 422,
          code: 'INVALID_OPEN_HOURS_LABEL',
        });
      });
  });

  it('PATCH /locations/:id accepts structured openHours without label', async () => {
    const parent = await createStructuralNode('Floor 5', 'patch-struct-parent');
    const room = await createBookableRoom(parent.id, 'patch-struct-room');

    return request(app.getHttpServer())
      .patch(`/locations/${room.id}`)
      .send({
        openHours: {
          type: 'RECURRING',
          days: [1, 2, 3, 4, 5, 6],
          startTime: '08:00',
          endTime: '20:00',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.openHours).toMatchObject({
          type: 'RECURRING',
          days: [1, 2, 3, 4, 5, 6],
          startTime: '08:00',
          endTime: '20:00',
        });
      });
  });
});
