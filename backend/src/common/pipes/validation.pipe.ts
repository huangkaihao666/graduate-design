import {
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipe as NestValidationPipe,
} from '@nestjs/common';

@Injectable()
export class ValidationPipe
  extends NestValidationPipe
  implements PipeTransform
{
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  }

  catch(error: any) {
    if (error.getResponse) {
      const response = error.getResponse();
      const messages = response.message || [];
      const formattedMessages = Array.isArray(messages)
        ? messages.join(', ')
        : messages;
      throw new BadRequestException(formattedMessages);
    }
    throw error;
  }
}
