import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from './auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/request.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getUser(req.user.uid);
  }
}