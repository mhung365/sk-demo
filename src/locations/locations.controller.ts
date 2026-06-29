import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { ListLocationsQueryDto } from './dto/list-locations-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { LocationTreeNodeDto } from './dto/location-tree-node.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findAll(
    @Query() query: ListLocationsQueryDto,
  ): Promise<LocationResponseDto[]> {
    return this.locationsService.findAll(query.parentId);
  }

  @Get('tree')
  getTree(): Promise<LocationTreeNodeDto[]> {
    return this.locationsService.getTree();
  }

  @Get('by-number/:locationNumber')
  findByNumber(
    @Param('locationNumber') locationNumber: string,
  ): Promise<LocationResponseDto> {
    return this.locationsService.findByLocationNumber(locationNumber);
  }

  @Get(':id')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LocationResponseDto> {
    return this.locationsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLocationDto): Promise<LocationResponseDto> {
    return this.locationsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.locationsService.remove(id);
  }
}
