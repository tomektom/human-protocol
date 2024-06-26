import { Injectable, Logger } from '@nestjs/common';

import { BaseRepository } from '../../database/base.repository';
import { DataSource, LessThanOrEqual } from 'typeorm';
import { ServerConfigService } from '../../common/config/server-config.service';
import { WebhookStatus } from '../../common/enums/webhook';
import { WebhookEntity } from './webhook.entity';

@Injectable()
export class WebhookRepository extends BaseRepository<WebhookEntity> {
  private readonly logger = new Logger(WebhookRepository.name);
  constructor(
    private dataSource: DataSource,
    public readonly serverConfigService: ServerConfigService,
  ) {
    super(WebhookEntity, dataSource);
  }

  public findByStatus(status: WebhookStatus): Promise<WebhookEntity[]> {
    return this.find({
      where: {
        status: status,
        retriesCount: LessThanOrEqual(this.serverConfigService.maxRetryCount),
        waitUntil: LessThanOrEqual(new Date()),
      },

      order: {
        createdAt: 'DESC',
      },
    });
  }
}
