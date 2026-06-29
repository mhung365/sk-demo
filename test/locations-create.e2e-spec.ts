import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Locations create (e2e)', () => {
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

  it('POST /locations creates a root structural node', () => {
    return request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Building A',
        locationNumber: uniqueNumber('root'),
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
          name: 'Building A',
          parentId: null,
          department: null,
          capacity: null,
          openHours: null,
          isBookable: false,
        });
        expect(res.body.id).toEqual(expect.any(String));
        expect(res.body.createdAt).toEqual(expect.any(String));
        expect(res.body.updatedAt).toEqual(expect.any(String));
      });
  });

  it('POST /locations creates a child under an existing parent', async () => {
    const parentNumber = uniqueNumber('parent');
    const parentRes = await request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Floor 1',
        locationNumber: parentNumber,
      })
      .expect(201);

    return request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId: parentRes.body.id,
        name: 'Corridor A',
        locationNumber: uniqueNumber('child'),
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
          parentId: parentRes.body.id,
          name: 'Corridor A',
          isBookable: false,
        });
      });
  });

  it('POST /locations returns 409 for duplicate locationNumber', async () => {
    const locationNumber = uniqueNumber('dup');
    await request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'First',
        locationNumber,
      })
      .expect(201);

    return request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Second',
        locationNumber,
      })
      .expect(409)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 409,
          code: 'LOCATION_NUMBER_EXISTS',
        });
      });
  });

  it('POST /locations returns 404 for unknown parentId', () => {
    return request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId: '00000000-0000-4000-8000-000000000000',
        name: 'Orphan',
        locationNumber: uniqueNumber('orphan'),
      })
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          code: 'LOCATION_NOT_FOUND',
        });
      });
  });

  it('POST /locations creates a bookable room when all bookable fields are set', async () => {
    const parentRes = await request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Floor 2',
        locationNumber: uniqueNumber('bookable-parent'),
      })
      .expect(201);

    return request(app.getHttpServer())
      .post('/locations')
      .send({
        parentId: parentRes.body.id,
        name: 'Meeting Room 1',
        locationNumber: uniqueNumber('bookable-room'),
        department: 'EFM',
        capacity: 10,
        openHours: {
          type: 'RECURRING',
          days: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '18:00',
        },
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toMatchObject({
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

  it('POST /locations returns 422 for partial bookable fields', () => {
    return request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Partial Room',
        locationNumber: uniqueNumber('partial'),
        department: 'EFM',
      })
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 422,
          code: 'INCOMPLETE_BOOKABLE_FIELDS',
        });
      });
  });

  it('POST /locations returns 400 for missing name', () => {
    return request(app.getHttpServer())
      .post('/locations')
      .send({
        locationNumber: uniqueNumber('no-name'),
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      });
  });

  it('POST /locations returns 400 for unknown fields', () => {
    return request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Bad Payload',
        locationNumber: uniqueNumber('unknown-field'),
        extra: 'nope',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
        });
      });
  });
});
