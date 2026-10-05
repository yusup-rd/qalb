import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { RoutingService } from './routing.service.js';

@Controller('api/routing')
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  @Post('route')
  route(
    @Body()
    body: {
      origin?: { latitude: number; longitude: number };
      destination?: { latitude: number; longitude: number };
    },
  ) {
    if (!body.origin || !body.destination)
      throw new BadRequestException('origin and destination are required.');
    return this.routing.route(body.origin, body.destination);
  }

  @Post('metrics')
  metrics(
    @Body()
    body: {
      origin?: { latitude: number; longitude: number };
      destinations?: { latitude: number; longitude: number }[];
    },
  ) {
    if (!body.origin || !Array.isArray(body.destinations))
      throw new BadRequestException('origin and destinations are required.');
    return this.routing.metrics(body.origin, body.destinations);
  }
}
