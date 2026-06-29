import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { OpenHoursDto } from '../common/dto/open-hours.dto';
import { DomainException } from '../common/exceptions/domain.exception';
import { OpenHours } from '../common/types/open-hours.type';
import {
  InvalidOpenHoursLabelError,
  parseOpenHoursLabel,
} from '../common/utils/parse-open-hours-label.util';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { LocationTreeNodeDto } from './dto/location-tree-node.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { Location } from './entities/location.entity';
import { LocationHasBookingsException } from './exceptions/location-has-bookings.exception';
import { LocationHasChildrenException } from './exceptions/location-has-children.exception';
import { LocationNotFoundException } from './exceptions/location-not-found.exception';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async findById(id: string): Promise<LocationResponseDto> {
    const location = await this.locationRepository.findOneBy({ id });
    if (!location) {
      this.logger.warn(`Location not found: ${id}`);
      throw new LocationNotFoundException(id);
    }
    return LocationResponseDto.fromEntity(location);
  }

  async findByLocationNumber(
    locationNumber: string,
  ): Promise<LocationResponseDto> {
    const location = await this.locationRepository.findOneBy({ locationNumber });
    if (!location) {
      this.logger.warn(`Location not found by number: ${locationNumber}`);
      throw new LocationNotFoundException(locationNumber);
    }
    return LocationResponseDto.fromEntity(location);
  }

  async findAll(parentId?: string): Promise<LocationResponseDto[]> {
    const where = parentId !== undefined ? { parentId } : {};
    const locations = await this.locationRepository.find({ where });
    return locations.map(LocationResponseDto.fromEntity);
  }

  async getTree(): Promise<LocationTreeNodeDto[]> {
    const locations = await this.locationRepository.find({
      order: { locationNumber: 'ASC' },
    });

    const nodeById = new Map<string, LocationTreeNodeDto>();
    const roots: LocationTreeNodeDto[] = [];

    for (const location of locations) {
      const node = LocationTreeNodeDto.fromEntity(location);
      nodeById.set(location.id, node);
    }

    for (const location of locations) {
      const node = nodeById.get(location.id)!;
      if (location.parentId === null) {
        roots.push(node);
      } else {
        nodeById.get(location.parentId)?.children.push(node);
      }
    }

    return roots;
  }

  async create(dto: CreateLocationDto): Promise<LocationResponseDto> {
    this.validateBookableFieldSet(
      dto.department ?? null,
      dto.capacity ?? null,
      (dto.openHours as OpenHours | undefined) ?? null,
      'create location request',
    );

    const parentId = dto.parentId ?? null;
    if (parentId !== null) {
      const parent = await this.locationRepository.findOneBy({ id: parentId });
      if (!parent) {
        this.logger.warn(`Parent location not found: ${parentId}`);
        throw new LocationNotFoundException(parentId);
      }
    }

    const location = this.locationRepository.create({
      parentId,
      name: dto.name,
      locationNumber: dto.locationNumber,
      department: dto.department ?? null,
      capacity: dto.capacity ?? null,
      openHours: (dto.openHours as OpenHours | undefined) ?? null,
    });

    try {
      const saved = await this.locationRepository.save(location);
      return LocationResponseDto.fromEntity(saved);
    } catch (error) {
      if (this.isLocationNumberUniqueViolation(error)) {
        this.logger.warn(`Duplicate location number: ${dto.locationNumber}`);
        throw new DomainException(
          `Location number already exists: ${dto.locationNumber}`,
          HttpStatus.CONFLICT,
          'LOCATION_NUMBER_EXISTS',
        );
      }
      throw error;
    }
  }

  /**
   * Partial update for name, department, capacity, and openHours.
   * AD-11: changing bookable fields does not re-validate existing bookings.
   */
  async update(
    id: string,
    dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    const location = await this.locationRepository.findOneBy({ id });
    if (!location) {
      this.logger.warn(`Location not found: ${id}`);
      throw new LocationNotFoundException(id);
    }

    if (dto.name !== undefined) {
      location.name = dto.name;
    }
    if (dto.department !== undefined) {
      location.department = dto.department;
    }
    if (dto.capacity !== undefined) {
      location.capacity = dto.capacity;
    }
    if (dto.openHours !== undefined) {
      location.openHours = this.resolveOpenHoursFromDto(dto.openHours);
    }

    this.validateMergedBookableFields(location);

    const saved = await this.locationRepository.save(location);
    return LocationResponseDto.fromEntity(saved);
  }

  async remove(id: string): Promise<void> {
    const location = await this.locationRepository.findOneBy({ id });
    if (!location) {
      this.logger.warn(`Location not found: ${id}`);
      throw new LocationNotFoundException(id);
    }

    const childCount = await this.locationRepository.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      this.logger.warn(
        `Cannot delete location ${id}: has ${childCount} child(ren)`,
      );
      throw new LocationHasChildrenException(id);
    }

    const bookingCount = await this.bookingRepository.count({
      where: { locationId: id },
    });
    if (bookingCount > 0) {
      this.logger.warn(
        `Cannot delete location ${id}: has ${bookingCount} booking(s)`,
      );
      throw new LocationHasBookingsException(id);
    }

    await this.locationRepository.remove(location);
  }

  private resolveOpenHoursFromDto(
    openHours: OpenHoursDto | null,
  ): OpenHours | null {
    if (openHours === null) {
      return null;
    }

    if (openHours.label) {
      try {
        return parseOpenHoursLabel(openHours.label);
      } catch (error) {
        if (error instanceof InvalidOpenHoursLabelError) {
          this.logger.warn(`Invalid open hours label: ${openHours.label}`);
          throw new DomainException(
            `Unrecognized open hours label: ${openHours.label}`,
            HttpStatus.UNPROCESSABLE_ENTITY,
            'INVALID_OPEN_HOURS_LABEL',
          );
        }
        throw error;
      }
    }

    return openHours as OpenHours;
  }

  private validateMergedBookableFields(location: Location): void {
    this.validateBookableFieldSet(
      location.department,
      location.capacity,
      location.openHours,
      'update location request',
    );
  }

  private validateBookableFieldSet(
    department: Location['department'],
    capacity: Location['capacity'],
    openHours: OpenHours | null,
    context: string,
  ): void {
    const anySet =
      department !== null || capacity !== null || openHours !== null;
    const allSet =
      department !== null && capacity !== null && openHours !== null;

    if (anySet && !allSet) {
      this.logger.warn(`Incomplete bookable fields on ${context}`);
      throw new DomainException(
        'Bookable locations require department, capacity, and openHours together',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INCOMPLETE_BOOKABLE_FIELDS',
      );
    }
  }

  private isLocationNumberUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = (
      error as QueryFailedError & { driverError?: { code?: string } }
    ).driverError;

    return driverError?.code === '23505';
  }
}
