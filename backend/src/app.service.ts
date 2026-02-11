import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): object {
    return {
      name: 'Graduation Design Project API',
      version: '1.0.0',
      description: 'RESTful API with NestJS',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
