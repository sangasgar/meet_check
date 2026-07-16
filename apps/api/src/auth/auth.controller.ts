import { Body, Controller, Post } from '@nestjs/common';

import { AuthService, AuthTokens } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: AuthCredentialsDto): Promise<AuthTokens> {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: AuthCredentialsDto): Promise<AuthTokens> {
    return this.authService.login(dto.email, dto.password);
  }
}
