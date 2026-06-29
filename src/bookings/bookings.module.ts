import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationsModule } from '../locations/locations.module';
import { Booking } from './entities/booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), LocationsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
