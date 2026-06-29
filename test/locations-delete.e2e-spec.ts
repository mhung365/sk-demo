import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Booking } from '../src/bookings/entities/booking.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { Department } from '../src/common/enums/department.enum';

describe('Locations delete (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
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
    dataSource = app.get(DataSource);
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

  async function seedBooking(locationId: string) {
    await dataSource.getRepository(Booking).save({
      locationId,
      department: Department.EFM,
      attendeeCount: 5,
      startAt: new Date('2025-01-01T01:00:00.000Z'),
      endAt: new Date('2025-01-01T02:00:00.000Z'),
    });
  }

  it('DELETE /locations/:id removes a leaf location and returns 204', async () => {
    const node = await createStructuralNode('Wing A', 'delete-leaf');

    await request(app.getHttpServer())
      .delete(`/locations/${node.id}`)
      .expect(204)
      .expect((res) => {
        expect(res.body).toEqual({});
      });

    await request(app.getHttpServer())
      .get(`/locations/${node.id}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe('LOCATION_NOT_FOUND');
      });
  });

  it('DELETE /locations/:id returns 409 LOCATION_HAS_CHILDREN when location has children', async () => {
    const parent = await createStructuralNode('Building B', 'delete-parent');
    await request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId: parent.id,
        name: 'Floor 1',
        locationNumber: uniqueNumber('delete-child'),
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/locations/${parent.id}`)
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe('LOCATION_HAS_CHILDREN');
      });

    await request(app.getHttpServer())
      .get(`/locations/${parent.id}`)
      .expect(200);
  });

  it('DELETE /locations/:id returns 409 LOCATION_HAS_BOOKINGS when location has bookings', async () => {
    const parent = await createStructuralNode('Building C', 'delete-book-parent');
    const room = await createBookableRoom(parent.id, 'delete-book-room');
    await seedBooking(room.id);

    await request(app.getHttpServer())
      .delete(`/locations/${room.id}`)
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe('LOCATION_HAS_BOOKINGS');
      });

    await request(app.getHttpServer())
      .get(`/locations/${room.id}`)
      .expect(200);
  });

  it('DELETE /locations/:id returns 404 LOCATION_NOT_FOUND for unknown id', () => {
    return request(app.getHttpServer())
      .delete('/locations/22222222-2222-2222-2222-222222222222')
      .expect(404)
      .expect((res) => {
        expect(res.body.code).toBe('LOCATION_NOT_FOUND');
      });
  });

  it('DELETE /locations/:id returns 400 VALIDATION_ERROR for invalid uuid', () => {
    return request(app.getHttpServer())
      .delete('/locations/not-a-uuid')
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
  });
});
