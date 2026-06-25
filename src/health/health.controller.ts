import { Body, Controller, Get, Post } from '@nestjs/common';
import { ValidationProbeDto } from './dto/validation-probe.dto';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<{ status: string; database: string }> {
    return this.healthService.check();
  }

  @Post('validation-probe')
  validationProbe(@Body() _body: ValidationProbeDto): { ok: true } {
    return { ok: true };
  }
}
