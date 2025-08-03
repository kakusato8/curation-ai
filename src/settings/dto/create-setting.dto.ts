import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsString()
  @IsNotEmpty()
  geminiQuery: string;

  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  weeklyDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  monthlyDay?: number;
}