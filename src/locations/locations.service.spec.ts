import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Location } from './entities/location.entity';
import { LocationHasBookingsException } from './exceptions/location-has-bookings.exception';
import { LocationHasChildrenException } from './exceptions/location-has-children.exception';
import { LocationNotFoundException } from './exceptions/location-not-found.exception';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  let service: LocationsService;
  let locationRepository: jest.Mocked<
    Pick<
      Repository<Location>,
      'find' | 'findOneBy' | 'create' | 'save' | 'count' | 'remove'
    >
  >;
  let bookingRepository: jest.Mocked<Pick<Repository<Booking>, 'count'>>;

  const locationId = '11111111-1111-1111-1111-111111111111';
  const mockLocation = {
    id: locationId,
    parentId: null,
    name: 'Building A',
    locationNumber: 'LOC-001',
    department: null,
    capacity: null,
    openHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Location;

  beforeEach(async () => {
    locationRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
    };
    bookingRepository = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(Location),
          useValue: locationRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingRepository,
        },
      ],
    }).compile();

    service = module.get(LocationsService);
  });

  describe('getTree', () => {
    it('returns empty array when no locations exist', async () => {
      locationRepository.find.mockResolvedValue([]);

      await expect(service.getTree()).resolves.toEqual([]);
      expect(locationRepository.find).toHaveBeenCalledWith({
        order: { locationNumber: 'ASC' },
      });
    });
  });

  describe('remove', () => {
    it('deletes a leaf location with no children and no bookings', async () => {
      locationRepository.findOneBy.mockResolvedValue(mockLocation);
      locationRepository.count.mockResolvedValue(0);
      bookingRepository.count.mockResolvedValue(0);
      locationRepository.remove.mockResolvedValue(mockLocation);

      await expect(service.remove(locationId)).resolves.toBeUndefined();

      expect(locationRepository.findOneBy).toHaveBeenCalledWith({
        id: locationId,
      });
      expect(locationRepository.count).toHaveBeenCalledWith({
        where: { parentId: locationId },
      });
      expect(bookingRepository.count).toHaveBeenCalledWith({
        where: { locationId },
      });
      expect(locationRepository.remove).toHaveBeenCalledWith(mockLocation);
    });

    it('throws LocationNotFoundException for unknown id', async () => {
      locationRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(locationId)).rejects.toThrow(
        LocationNotFoundException,
      );
      expect(locationRepository.count).not.toHaveBeenCalled();
      expect(bookingRepository.count).not.toHaveBeenCalled();
      expect(locationRepository.remove).not.toHaveBeenCalled();
    });

    it('throws LocationHasChildrenException when location has children', async () => {
      locationRepository.findOneBy.mockResolvedValue(mockLocation);
      locationRepository.count.mockResolvedValue(2);

      await expect(service.remove(locationId)).rejects.toThrow(
        LocationHasChildrenException,
      );
      expect(bookingRepository.count).not.toHaveBeenCalled();
      expect(locationRepository.remove).not.toHaveBeenCalled();
    });

    it('throws LocationHasBookingsException when location has bookings', async () => {
      locationRepository.findOneBy.mockResolvedValue(mockLocation);
      locationRepository.count.mockResolvedValue(0);
      bookingRepository.count.mockResolvedValue(1);

      await expect(service.remove(locationId)).rejects.toThrow(
        LocationHasBookingsException,
      );
      expect(locationRepository.remove).not.toHaveBeenCalled();
    });

    it('throws LocationHasChildrenException when both children and bookings exist', async () => {
      locationRepository.findOneBy.mockResolvedValue(mockLocation);
      locationRepository.count.mockResolvedValue(1);
      bookingRepository.count.mockResolvedValue(1);

      await expect(service.remove(locationId)).rejects.toThrow(
        LocationHasChildrenException,
      );
      expect(bookingRepository.count).not.toHaveBeenCalled();
      expect(locationRepository.remove).not.toHaveBeenCalled();
    });
  });
});
