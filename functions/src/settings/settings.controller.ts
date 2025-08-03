import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  async findAll(@Request() req) {
    return this.settingsService.getUserSettings(req.user.uid);
  }

  @Post()
  async create(@Request() req, @Body() createSettingDto: CreateSettingDto) {
    return this.settingsService.createSetting(req.user.uid, createSettingDto);
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.updateSetting(req.user.uid, id, updateSettingDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.settingsService.deleteSetting(req.user.uid, id);
    return { message: 'Setting deleted successfully' };
  }

}