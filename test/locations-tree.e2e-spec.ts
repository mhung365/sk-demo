import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Locations tree (e2e)', () => {
  let app: INestApplication<App>;
  const runId = Date.now().toString(36);

  const uniqueNumber = (suffix: string): string => `TREE-${runId}-${suffix}`;

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

  it('GET /locations/tree returns nested hierarchy with bookable leaf', async () => {
    await request(app.getHttpServer())
      .get('/locations/tree')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);

        const root = res.body.find(
          (node: { id: string }) => node.id === rootId,
        );
        expect(root).toBeDefined();
        expect(root).toMatchObject({
          id: rootId,
          parentId: null,
          name: 'Building A',
          locationNumber: rootNumber,
          department: null,
          capacity: null,
          openHours: null,
          isBookable: false,
        });
        expect(root.children).toHaveLength(1);

        const floor = root.children[0];
        expect(floor).toMatchObject({
          id: childId,
          parentId: rootId,
          name: 'Floor 1',
          locationNumber: childNumber,
          isBookable: false,
        });
        expect(floor.children).toHaveLength(1);

        const room = floor.children[0];
        expect(room).toMatchObject({
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
          children: [],
        });
      });
  });

  it('GET /locations/tree returns forest of multiple root buildings', async () => {
    const secondRootNumber = uniqueNumber('root-b');
    const secondRootRes = await request(app.getHttpServer())
      .post('/locations')
      .send({
        name: 'Building B',
        locationNumber: secondRootNumber,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/locations/tree')
      .expect(200)
      .expect((res) => {
        const rootIds = res.body.map((node: { id: string }) => node.id);
        expect(rootIds).toEqual(
          expect.arrayContaining([rootId, secondRootRes.body.id]),
        );
      });
  });
});
