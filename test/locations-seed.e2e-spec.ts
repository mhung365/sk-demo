import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ASSIGNMENT_LOCATION_NUMBERS } from '../src/database/seed/assignment-locations.data';
import {
  removeAssignmentSeed,
  runAssignmentSeed,
} from '../src/database/seed/run-assignment-seed';
import { Location } from '../src/locations/entities/location.entity';

type TreeNode = {
  locationNumber: string;
  children?: TreeNode[];
};

function findNodeByNumber(
  nodes: TreeNode[],
  locationNumber: string,
): TreeNode | undefined {
  for (const node of nodes) {
    if (node.locationNumber === locationNumber) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeByNumber(node.children, locationNumber);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe('Assignment location seed (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

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
    await removeAssignmentSeed(dataSource);
    await runAssignmentSeed(dataSource);
  });

  afterAll(async () => {
    await removeAssignmentSeed(dataSource);
    await app.close();
  });

  it('inserts 15 assignment location rows', async () => {
    const repo = dataSource.getRepository(Location);
    const count = await repo.count({
      where: { locationNumber: In(ASSIGNMENT_LOCATION_NUMBERS) },
    });
    expect(count).toBe(15);
  });

  it('GET /locations/by-number/A-01-01 returns bookable EFM room with Mon–Fri hours', async () => {
    await request(app.getHttpServer())
      .get('/locations/by-number/A-01-01')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          name: 'Meeting Room 1',
          locationNumber: 'A-01-01',
          department: 'EFM',
          capacity: 10,
          isBookable: true,
          openHours: {
            type: 'RECURRING',
            days: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '18:00',
          },
        });
      });
  });

  it('GET /locations/by-number/B-05-11 returns bookable ASS room with ALWAYS_OPEN', async () => {
    await request(app.getHttpServer())
      .get('/locations/by-number/B-05-11')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          name: 'Utility Room',
          locationNumber: 'B-05-11',
          department: 'ASS',
          capacity: 30,
          isBookable: true,
          openHours: { type: 'ALWAYS_OPEN' },
        });
      });
  });

  it('GET /locations/by-number/A-01-Corridor returns structural non-bookable node', async () => {
    await request(app.getHttpServer())
      .get('/locations/by-number/A-01-Corridor')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          name: 'Corridor Floor 1',
          locationNumber: 'A-01-Corridor',
          department: null,
          capacity: null,
          openHours: null,
          isBookable: false,
        });
      });
  });

  it('GET /locations/tree returns assignment hierarchy under roots A and B', async () => {
    await request(app.getHttpServer())
      .get('/locations/tree')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);

        const rootA = findNodeByNumber(res.body, 'A');
        const rootB = findNodeByNumber(res.body, 'B');
        expect(rootA).toBeDefined();
        expect(rootB).toBeDefined();

        const floorA = findNodeByNumber(rootA!.children ?? [], 'A-01');
        const floorB = findNodeByNumber(rootB!.children ?? [], 'B-05');
        expect(floorA?.children).toHaveLength(5);
        expect(floorB?.children).toHaveLength(6);

        expect(findNodeByNumber(floorA!.children ?? [], 'A-01-01')).toBeDefined();
        expect(findNodeByNumber(floorB!.children ?? [], 'B-05-11')).toBeDefined();
      });
  });

  it('running seed twice does not change assignment row count', async () => {
    const repo = dataSource.getRepository(Location);
    const countBefore = await repo.count({
      where: { locationNumber: In(ASSIGNMENT_LOCATION_NUMBERS) },
    });

    await runAssignmentSeed(dataSource);

    const countAfter = await repo.count({
      where: { locationNumber: In(ASSIGNMENT_LOCATION_NUMBERS) },
    });
    expect(countAfter).toBe(countBefore);
    expect(countAfter).toBe(15);
  });
});
