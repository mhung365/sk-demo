import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Department } from '../common/enums/department.enum';
import { LocationResponseDto } from '../locations/dto/location-response.dto';
import { LocationsService } from '../locations/locations.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { Booking } from './entities/booking.entity';
import { BookingNotFoundException } from './exceptions/booking-not-found.exception';
import { BookingOverlapException } from './exceptions/booking-overlap.exception';
import { CapacityExceededException } from './exceptions/capacity-exceeded.exception';
import { DepartmentMismatchException } from './exceptions/department-mismatch.exception';
import { LocationNotBookableException } from './exceptions/location-not-bookable.exception';
import { OutsideOpenHoursException } from './exceptions/outside-open-hours.exception';
import { isWithinOpenHours } from './utils/is-within-open-hours.util';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly locationsService: LocationsService,
    private readonly configService: ConfigService,
  ) {}

  async findById(id: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findOneBy({ id });
    if (!booking) {
      this.logger.warn(`Booking not found: ${id}`);
      throw new BookingNotFoundException(id);
    }
    return BookingResponseDto.fromEntity(booking);
  }

  async findAll(query: ListBookingsQueryDto): Promise<BookingResponseDto[]> {
    const qb = this.bookingRepository.createQueryBuilder('b');

    if (query.locationId) {
      qb.andWhere('b.location_id = :locationId', {
        locationId: query.locationId,
      });
    }
    if (query.from) {
      qb.andWhere('b.end_at > :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('b.start_at < :to', { to: new Date(query.to) });
    }

    qb.orderBy('b.start_at', 'ASC');

    const bookings = await qb.getMany();
    return bookings.map(BookingResponseDto.fromEntity);
  }

  async create(dto: CreateBookingDto): Promise<BookingResponseDto> {
    const location = await this.resolveAndValidateLocation(dto.locationId);
    this.validateDepartmentMatch(dto.department, location);
    this.validateCapacity(dto, location);
    this.validateOpenHours(dto, location);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT id FROM locations WHERE id = $1 FOR UPDATE`, [
        dto.locationId,
      ]);

      const overlapping = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .where('b.location_id = :locationId', { locationId: dto.locationId })
        .andWhere('b.start_at < :endAt', { endAt })
        .andWhere('b.end_at > :startAt', { startAt })
        .getOne();

      if (overlapping) {
        this.logger.warn(`Booking overlap for location ${dto.locationId}`);
        throw new BookingOverlapException(dto.locationId, startAt, endAt);
      }

      const booking = manager.create(Booking, {
        locationId: dto.locationId,
        department: dto.department,
        attendeeCount: dto.attendeeCount,
        startAt,
        endAt,
        bookedBy: dto.bookedBy ?? null,
      });
      const saved = await manager.save(booking);
      return BookingResponseDto.fromEntity(saved);
    });
  }

  private async resolveAndValidateLocation(
    locationId: string,
  ): Promise<LocationResponseDto> {
    const location = await this.locationsService.findById(locationId);
    if (!location.isBookable) {
      this.logger.warn(`Location not bookable: ${locationId}`);
      throw new LocationNotBookableException(locationId);
    }
    return location;
  }

  private validateDepartmentMatch(
    requestDepartment: Department,
    location: LocationResponseDto,
  ): void {
    if (requestDepartment !== location.department) {
      this.logger.warn(`Department mismatch for location ${location.id}`);
      throw new DepartmentMismatchException(
        requestDepartment,
        location.department!,
      );
    }
  }

  private validateCapacity(
    dto: CreateBookingDto,
    location: LocationResponseDto,
  ): void {
    if (dto.attendeeCount > location.capacity!) {
      this.logger.warn(
        `Capacity exceeded for location ${location.id}: ${dto.attendeeCount} > ${location.capacity}`,
      );
      throw new CapacityExceededException(
        dto.attendeeCount,
        location.capacity!,
      );
    }
  }

  private validateOpenHours(
    dto: CreateBookingDto,
    location: LocationResponseDto,
  ): void {
    const timezone =
      this.configService.get<string>('APP_TIMEZONE') ?? 'Asia/Singapore';
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (
      !isWithinOpenHours(startAt, endAt, location.openHours!, timezone)
    ) {
      this.logger.warn(`Outside open hours for location ${location.id}`);
      throw new OutsideOpenHoursException(
        startAt,
        endAt,
        location.openHours!,
      );
    }
  }
}
