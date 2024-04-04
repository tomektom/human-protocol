import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { NS } from '../common/constant';

import { TypeOrmLoggerModule, TypeOrmLoggerService } from './typeorm';
import { LoggerOptions } from 'typeorm';
import { ConfigNames } from '../common/config';
import { JobEntity } from '../modules/job/job.entity';
import { AssignmentEntity } from '../modules/assignment/assignment.entity';
import { WebhookEntity } from '../modules/webhook/webhook.entity';
import { CronJobEntity } from '../modules/cron-job/cron-job.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [TypeOrmLoggerModule, ConfigModule],
      inject: [TypeOrmLoggerService, ConfigService],
      useFactory: (
        typeOrmLoggerService: TypeOrmLoggerService,
        configService: ConfigService,
      ) => {
        const loggerOptions = configService
          .get<string>(ConfigNames.POSTGRES_LOGGING)
          ?.split(', ');
        typeOrmLoggerService.setOptions(
          loggerOptions && loggerOptions[0] === 'all'
            ? 'all'
            : (loggerOptions as LoggerOptions) ?? false,
        );
        return {
          name: 'default',
          type: 'postgres',
          entities: [JobEntity, AssignmentEntity, WebhookEntity, CronJobEntity],
          // We are using migrations, synchronize should be set to false.
          synchronize: false,
          // Run migrations automatically,
          // you can disable this if you prefer running migration manually.
          migrationsTableName: NS,
          migrationsTransactionMode: 'each',
          namingStrategy: new SnakeNamingStrategy(),
          logging: true,
          // Allow both start:prod and start:dev to use migrations
          // __dirname is either dist or server folder, meaning either
          // the compiled js in prod or the ts in dev.
          migrations: [path.join(__dirname, '/migrations/**/*{.ts,.js}')],
          //"migrations": ["dist/migrations/*{.ts,.js}"],
          logger: typeOrmLoggerService,
          url: configService.get<string | undefined>(
            ConfigNames.POSTGRES_URL,
            undefined,
          ),
          host: configService.get<string | undefined>(
            ConfigNames.POSTGRES_HOST,
            undefined,
          ),
          port: configService.get<number | undefined>(
            ConfigNames.POSTGRES_PORT,
            undefined,
          ),
          username: configService.get<string | undefined>(
            ConfigNames.POSTGRES_USER,
            undefined,
          ),
          password: configService.get<string | undefined>(
            ConfigNames.POSTGRES_PASSWORD,
            undefined,
          ),
          database: configService.get<string | undefined>(
            ConfigNames.POSTGRES_DATABASE,
            undefined,
          ),
          keepConnectionAlive:
            configService.get<string>(ConfigNames.NODE_ENV) === 'test',
          migrationsRun: false,
          ssl:
            configService
              .get<string>(ConfigNames.POSTGRES_SSL)
              ?.toLowerCase() === 'true',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
