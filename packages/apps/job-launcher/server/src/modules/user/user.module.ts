import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { UserController } from './user.controller';
import { AuthEntity } from '../auth/auth.entity';
import { UserRepository } from './user.repository';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AuthEntity]), ConfigModule, PaymentModule],
  controllers: [UserController],
  providers: [Logger, UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
