import { DataSource, QueryFailedError } from 'typeorm';
import { OpenHours } from '../../common/types/open-hours.type';
import { Location } from '../../locations/entities/location.entity';
import {
  ASSIGNMENT_LOCATIONS,
  ASSIGNMENT_LOCATION_NUMBERS,
} from './assignment-locations.data';

export async function runAssignmentSeed(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Location);

  const existing = await repo.count({ where: { locationNumber: 'A' } });
  if (existing > 0) {
    console.log('Assignment seed already applied — skipping');
    return;
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const parentMap = new Map<string, string>();
    const locationRepo = queryRunner.manager.getRepository(Location);

    for (const row of ASSIGNMENT_LOCATIONS) {
      const parentId = row.parentLocationNumber
        ? (parentMap.get(row.parentLocationNumber) ?? null)
        : null;

      if (row.parentLocationNumber && !parentId) {
        throw new Error(
          `Assignment seed failed: parent ${row.parentLocationNumber} not found for ${row.locationNumber}`,
        );
      }

      const saved = await locationRepo.save(
        locationRepo.create({
          name: row.name,
          locationNumber: row.locationNumber,
          parentId,
          department: row.department ?? null,
          capacity: row.capacity ?? null,
          openHours: (row.openHours ?? null) as OpenHours | null,
        }),
      );
      parentMap.set(row.locationNumber, saved.id);
    }

    await queryRunner.commitTransaction();
    console.log(
      `Assignment seed applied — ${ASSIGNMENT_LOCATIONS.length} locations inserted`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();

    if (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === '23505'
    ) {
      console.error(
        'Assignment seed failed: duplicate location_number detected — transaction rolled back',
      );
    } else {
      console.error('Assignment seed failed — transaction rolled back:', error);
    }

    throw error;
  } finally {
    await queryRunner.release();
  }
}

export async function removeAssignmentSeed(
  dataSource: DataSource,
): Promise<void> {
  const repo = dataSource.getRepository(Location);

  for (const locationNumber of [...ASSIGNMENT_LOCATION_NUMBERS].reverse()) {
    await repo.delete({ locationNumber });
  }
}

async function main(): Promise<void> {
  const { default: dataSource } = await import('../data-source');
  await dataSource.initialize();

  try {
    await runAssignmentSeed(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
