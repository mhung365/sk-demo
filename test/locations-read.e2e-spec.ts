import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Locations read (e2e)', () => {
  let app: INestApplication<App>;
  const runId = Date.now().toString(36);

  const uniqueNumber = (suffix: string): string => `READ-${runId}-${suffix}`;

  let rootId: string;
  let rootNumber: string;
  let childId: string;
  let childNumber: string;
  let roomId: string;
  let roomNumber: string;

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

    rootNumber = uniqueNumber('root');
    const rootRes = await request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Building A',
        locationNumber: rootNumber,
      })
      .expect(201);
    rootId = rootRes.body.id;

    childNumber = uniqueNumber('child');
    const childRes = await request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId: rootId,
        name: 'Floor 1',
        locationNumber: childNumber,
      })
      .expect(201);
    childId = childRes.body.id;

    roomNumber = uniqueNumber('room');
    const roomRes = await request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId: childId,
        name: 'Meeting Room 1',
        locationNumber: roomNumber,
        department: 'EFM',
        capacity: 10,
        openHours: {
          type: 'RECURRING',
          days: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '18:00',
        },
      })
      .expect(201);
    roomId = roomRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /locations/:id returns full location shape with isBookable', async () => {
    await request(app.getHttpServer())
      .get(`/locations/${rootId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: rootId,
          parentId: null,
          name: 'Building A',
          locationNumber: rootNumber,
          department: null,
          capacity: null,
          openHours: null,
          isBookable: false,
        });
        expect(res.body.createdAt).toEqual(expect.any(String));
        expect(res.body.updatedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get(`/locations/${roomId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: roomId,
          parentId: childId,
          name: 'Meeting Room 1',
          locationNumber: roomNumber,
          department: 'EFM',
          capacity: 10,
          openHours: {
            type: 'RECURRING',
            days: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '18:00',
          },
          isBookable: true,
        });
      });
  });

  it('GET /locations/by-number/:locationNumber returns matching location', () => {
    return request(app.getHttpServer())
      .get(`/locations/by-number/${childNumber}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          id: childId,
          parentId: rootId,
          name: 'Floor 1',
          locationNumber: childNumber,
          isBookable: false,
        });
      });
  });

  it('GET /locations returns all locations when parentId is omitted', () => {
    return request(app.getHttpServer())
      .get('/locations')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        const ids = res.body.map((loc: { id: string }) => loc.id);
        expect(ids).toEqual(expect.arrayContaining([rootId, childId, roomId]));
      });
  });

  it('GET /locations?parentId=<uuid> returns only direct children', () => {
    return request(app.getHttpServer())
      .get(`/locations?parentId=${rootId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({
          id: childId,
          parentId: rootId,
          name: 'Floor 1',
        });
      });
  });

  it('GET /locations?parentId=<uuid-with-no-children> returns empty array', () => {
    return request(app.getHttpServer())
      .get(`/locations?parentId=${roomId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });
  });

  it('GET /locations/:id returns 404 for unknown UUID', () => {
    return request(app.getHttpServer())
      .get('/locations/00000000-0000-4000-8000-000000000000')
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          code: 'LOCATION_NOT_FOUND',
        });
      });
  });

  it('GET /locations/by-number/:locationNumber returns 404 for unknown number', () => {
    return request(app.getHttpServer())
      .get(`/locations/by-number/UNKNOWN-${runId}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          code: 'LOCATION_NOT_FOUND',
        });
      });
  });

  it('GET /locations/not-a-uuid returns 400 for invalid UUID', () => {
    return request(app.getHttpServer())
      .get('/locations/not-a-uuid')
      .expect(400);
  });

  it('GET /locations?parentId=not-a-uuid returns 400 validation error', () => {
    return request(app.getHttpServer())
      .get('/locations?parentId=not-a-uuid')
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      });
  });
});
