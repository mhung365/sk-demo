import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(
    @Query() query: ListBookingsQueryDto,
  ): Promise<BookingResponseDto[]> {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto): Promise<BookingResponseDto> {
    return this.bookingsService.create(dto);
  }
}
