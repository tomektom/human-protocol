import { createMock } from '@golevelup/ts-jest';
import { ChainId, EscrowClient, StorageClient } from '@human-protocol/sdk';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  ErrorBucket,
  ErrorJob,
  ErrorWeb3,
} from '../../common/constants/errors';
import {
  PaymentSource,
  PaymentStatus,
  PaymentType,
  TokenId,
} from '../../common/enums/payment';
import {
  JobRequestType,
  JobStatus,
  JobStatusFilter,
} from '../../common/enums/job';
import {
  MOCK_ADDRESS,
  MOCK_BUCKET_NAME,
  MOCK_CHAIN_ID,
  MOCK_EXCHANGE_ORACLE_WEBHOOK_URL,
  MOCK_FILE_HASH,
  MOCK_FILE_KEY,
  MOCK_FILE_URL,
  MOCK_JOB_ID,
  MOCK_JOB_LAUNCHER_FEE,
  MOCK_PRIVATE_KEY,
  MOCK_RECORDING_ORACLE_ADDRESS,
  MOCK_RECORDING_ORACLE_FEE,
  MOCK_REPUTATION_ORACLE_ADDRESS,
  MOCK_REPUTATION_ORACLE_FEE,
  MOCK_REQUESTER_DESCRIPTION,
  MOCK_REQUESTER_TITLE,
  MOCK_SUBMISSION_REQUIRED,
  MOCK_USER_ID,
} from '../../../test/constants';
import { PaymentService } from '../payment/payment.service';
import { Web3Service } from '../web3/web3.service';
import {
  FortuneFinalResultDto,
  FortuneManifestDto,
  CvatManifestDto,
  JobFortuneDto,
  JobCvatDto,
  CvatFinalResultDto,
} from './job.dto';
import { JobEntity } from './job.entity';
import { JobRepository } from './job.repository';
import { JobService } from './job.service';

import { div, mul } from '../../common/utils/decimal';
import { PaymentRepository } from '../payment/payment.repository';
import { RoutingProtocolService } from './routing-protocol.service';
import { In } from 'typeorm';

const rate = 1.5;
jest.mock('@human-protocol/sdk', () => ({
  ...jest.requireActual('@human-protocol/sdk'),
  EscrowClient: {
    build: jest.fn().mockImplementation(() => ({
      createAndSetupEscrow: jest.fn().mockResolvedValue(MOCK_ADDRESS),
    })),
  },
  StorageClient: jest.fn().mockImplementation(() => ({
    uploadFiles: jest
      .fn()
      .mockResolvedValue([
        { key: MOCK_FILE_KEY, url: MOCK_FILE_URL, hash: MOCK_FILE_HASH },
      ]),
  })),
}));

jest.mock('../../common/utils', () => ({
  getRate: jest.fn().mockImplementation(() => rate),
}));

describe('JobService', () => {
  let jobService: JobService,
    jobRepository: JobRepository,
    paymentRepository: PaymentRepository,
    paymentService: PaymentService,
    createPaymentMock: any,
    routingProtocolService: RoutingProtocolService,
    web3Service: Web3Service;

  const signerMock = {
    address: MOCK_ADDRESS,
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
  };

  beforeEach(async () => {
    const mockConfigService: Partial<ConfigService> = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JOB_LAUNCHER_FEE':
            return MOCK_JOB_LAUNCHER_FEE;
          case 'RECORDING_ORACLE_FEE':
            return MOCK_RECORDING_ORACLE_FEE;
          case 'REPUTATION_ORACLE_FEE':
            return MOCK_REPUTATION_ORACLE_FEE;
          case 'WEB3_JOB_LAUNCHER_PRIVATE_KEY':
            return MOCK_PRIVATE_KEY;
          case 'RECORDING_ORACLE_ADDRESS':
            return MOCK_RECORDING_ORACLE_ADDRESS;
          case 'REPUTATION_ORACLE_ADDRESS':
            return MOCK_REPUTATION_ORACLE_ADDRESS;
          case 'EXCHANGE_ORACLE_WEBHOOK_URL':
            return MOCK_EXCHANGE_ORACLE_WEBHOOK_URL;
          case 'HOST':
            return '127.0.0.1';
          case 'PORT':
            return 5000;
          case 'WEB3_PRIVATE_KEY':
            return MOCK_PRIVATE_KEY;
          case 'S3_BUCKET':
            return MOCK_BUCKET_NAME;
        }
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: Web3Service,
          useValue: {
            getSigner: jest.fn().mockReturnValue(signerMock),
            validateChainId: jest.fn().mockReturnValue(new Error()),
          },
        },
        { provide: JobRepository, useValue: createMock<JobRepository>() },
        {
          provide: PaymentRepository,
          useValue: createMock<PaymentRepository>(),
        },
        { provide: PaymentService, useValue: createMock<PaymentService>() },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: createMock<HttpService>() },
        {
          provide: RoutingProtocolService,
          useValue: createMock<RoutingProtocolService>(),
        },
      ],
    }).compile();

    jobService = moduleRef.get<JobService>(JobService);
    jobRepository = moduleRef.get(JobRepository);
    paymentRepository = moduleRef.get(PaymentRepository);
    paymentService = moduleRef.get(PaymentService);
    routingProtocolService = moduleRef.get(RoutingProtocolService);
    createPaymentMock = jest.spyOn(paymentRepository, 'create');
    web3Service = moduleRef.get<Web3Service>(Web3Service);
  });

  describe('createJob', () => {
    const userId = 1;
    const fortuneJobDto: JobFortuneDto = {
      chainId: MOCK_CHAIN_ID,
      submissionsRequired: MOCK_SUBMISSION_REQUIRED,
      requesterTitle: MOCK_REQUESTER_TITLE,
      requesterDescription: MOCK_REQUESTER_DESCRIPTION,
      fundAmount: 10,
    };

    let getUserBalanceMock: any;

    beforeEach(() => {
      getUserBalanceMock = jest.spyOn(paymentService, 'getUserBalance');
      createPaymentMock.mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a job successfully', async () => {
      const fundAmount = 10;
      const fee = (MOCK_JOB_LAUNCHER_FEE / 100) * fundAmount;

      const userBalance = 25;
      getUserBalanceMock.mockResolvedValue(userBalance);

      await jobService.createJob(userId, JobRequestType.FORTUNE, fortuneJobDto);

      expect(paymentService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(paymentRepository.create).toHaveBeenCalledWith({
        userId,
        source: PaymentSource.BALANCE,
        type: PaymentType.WITHDRAWAL,
        currency: TokenId.HMT,
        amount: -mul(fundAmount + fee, rate),
        rate: div(1, rate),
        status: PaymentStatus.SUCCEEDED,
      });
      expect(jobRepository.create).toHaveBeenCalledWith({
        chainId: fortuneJobDto.chainId,
        userId,
        manifestUrl: expect.any(String),
        manifestHash: expect.any(String),
        fee: mul(fee, rate),
        fundAmount: mul(fundAmount, rate),
        status: JobStatus.PENDING,
        waitUntil: expect.any(Date),
      });
    });

    it('should create a fortune job successfully on network selected from round robin logic', async () => {
      const fundAmount = 10;
      const fee = (MOCK_JOB_LAUNCHER_FEE / 100) * fundAmount;

      const userBalance = 25;
      getUserBalanceMock.mockResolvedValue(userBalance);

      jest
        .spyOn(routingProtocolService, 'selectNetwork')
        .mockReturnValue(ChainId.MOONBEAM);

      await jobService.createJob(userId, JobRequestType.FORTUNE, {
        ...fortuneJobDto,
        chainId: undefined,
      });

      expect(paymentService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(jobRepository.create).toHaveBeenCalledWith({
        chainId: ChainId.MOONBEAM,
        userId,
        manifestUrl: expect.any(String),
        manifestHash: expect.any(String),
        fee: mul(fee, rate),
        fundAmount: mul(fundAmount, rate),
        status: JobStatus.PENDING,
        waitUntil: expect.any(Date),
      });
    });

    it('should throw an exception for invalid chain id provided', async () => {
      web3Service.validateChainId = jest.fn(() => {
        throw new Error(ErrorWeb3.InvalidTestnetChainId);
      });

      await expect(
        jobService.createJob(userId, JobRequestType.FORTUNE, fortuneJobDto),
      ).rejects.toThrowError(ErrorWeb3.InvalidTestnetChainId);
    });

    it('should throw an exception for insufficient user balance', async () => {
      const userBalance = 1;
      jest
        .spyOn(paymentService, 'getUserBalance')
        .mockResolvedValue(userBalance);

      getUserBalanceMock.mockResolvedValue(userBalance);

      await expect(
        jobService.createJob(userId, JobRequestType.FORTUNE, fortuneJobDto),
      ).rejects.toThrowError(ErrorJob.NotEnoughFunds);
    });

    it('should throw an exception if job entity creation fails', async () => {
      const userBalance = 25;

      getUserBalanceMock.mockResolvedValue(userBalance);

      jest.spyOn(jobRepository, 'create').mockResolvedValue(undefined!);

      await expect(
        jobService.createJob(userId, JobRequestType.FORTUNE, fortuneJobDto),
      ).rejects.toThrowError(ErrorJob.NotCreated);
    });
  });

  describe('createJob with image label binary type', () => {
    const userId = 1;

    const imageLabelBinaryJobDto: JobCvatDto = {
      chainId: MOCK_CHAIN_ID,
      dataUrl: MOCK_FILE_URL,
      labels: ['cat', 'dog'],
      requesterDescription: MOCK_REQUESTER_DESCRIPTION,
      minQuality: 0.95,
      fundAmount: 10,
      gtUrl: '',
      jobBounty: '1',
      type: JobRequestType.IMAGE_LABEL_BINARY,
    };

    let getUserBalanceMock: any;

    beforeEach(() => {
      getUserBalanceMock = jest.spyOn(paymentService, 'getUserBalance');
      createPaymentMock.mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a job successfully', async () => {
      const fundAmount = 10;
      const fee = (MOCK_JOB_LAUNCHER_FEE / 100) * fundAmount;

      const userBalance = 25;
      getUserBalanceMock.mockResolvedValue(userBalance);

      await jobService.createJob(
        userId,
        JobRequestType.IMAGE_LABEL_BINARY,
        imageLabelBinaryJobDto,
      );

      expect(paymentService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(paymentRepository.create).toHaveBeenCalledWith({
        userId,
        source: PaymentSource.BALANCE,
        type: PaymentType.WITHDRAWAL,
        currency: TokenId.HMT,
        amount: -mul(fundAmount + fee, rate),
        rate: div(1, rate),
        status: PaymentStatus.SUCCEEDED,
      });
      expect(jobRepository.create).toHaveBeenCalledWith({
        chainId: imageLabelBinaryJobDto.chainId,
        userId,
        manifestUrl: expect.any(String),
        manifestHash: expect.any(String),
        fee: mul(fee, rate),
        fundAmount: mul(fundAmount, rate),
        status: JobStatus.PENDING,
        waitUntil: expect.any(Date),
      });
    });

    it('should create a fortune job successfully on network selected from round robin logic', async () => {
      const fundAmount = imageLabelBinaryJobDto.fundAmount;
      const fee = (MOCK_JOB_LAUNCHER_FEE / 100) * fundAmount;

      const userBalance = 25;
      getUserBalanceMock.mockResolvedValue(userBalance);

      jest
        .spyOn(routingProtocolService, 'selectNetwork')
        .mockReturnValue(ChainId.MOONBEAM);

      await jobService.createJob(userId, JobRequestType.IMAGE_LABEL_BINARY, {
        ...imageLabelBinaryJobDto,
        chainId: undefined,
      });

      expect(paymentService.getUserBalance).toHaveBeenCalledWith(userId);
      expect(jobRepository.create).toHaveBeenCalledWith({
        chainId: ChainId.MOONBEAM,
        userId,
        manifestUrl: expect.any(String),
        manifestHash: expect.any(String),
        fee: mul(fee, rate),
        fundAmount: mul(fundAmount, rate),
        status: JobStatus.PENDING,
        waitUntil: expect.any(Date),
      });
    });

    it('should throw an exception for invalid chain id provided', async () => {
      web3Service.validateChainId = jest.fn(() => {
        throw new Error(ErrorWeb3.InvalidTestnetChainId);
      });

      await expect(
        jobService.createJob(
          userId,
          JobRequestType.IMAGE_LABEL_BINARY,
          imageLabelBinaryJobDto,
        ),
      ).rejects.toThrowError(ErrorWeb3.InvalidTestnetChainId);
    });

    it('should throw an exception for insufficient user balance', async () => {
      const userBalance = 1;

      jest
        .spyOn(paymentService, 'getUserBalance')
        .mockResolvedValue(userBalance);

      getUserBalanceMock.mockResolvedValue(userBalance);

      await expect(
        jobService.createJob(
          userId,
          JobRequestType.IMAGE_LABEL_BINARY,
          imageLabelBinaryJobDto,
        ),
      ).rejects.toThrowError(ErrorJob.NotEnoughFunds);
    });

    it('should throw an exception if job entity creation fails', async () => {
      const userBalance = 100;

      getUserBalanceMock.mockResolvedValue(userBalance);

      jest.spyOn(jobRepository, 'create').mockResolvedValue(undefined!);

      await expect(
        jobService.createJob(
          userId,
          JobRequestType.IMAGE_LABEL_BINARY,
          imageLabelBinaryJobDto,
        ),
      ).rejects.toThrowError(ErrorJob.NotCreated);
    });
  });

  describe('launchJob', () => {
    const chainId = ChainId.LOCALHOST;

    it('should launch a job successfully', async () => {
      const fundAmount = 10;
      const fee = (MOCK_JOB_LAUNCHER_FEE / 100) * fundAmount;

      const mockJobEntity: Partial<JobEntity> = {
        chainId,
        manifestUrl: MOCK_FILE_URL,
        manifestHash: MOCK_FILE_HASH,
        fee,
        fundAmount,
        status: JobStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      const jobEntityResult = await jobService.launchJob(
        mockJobEntity as JobEntity,
      );

      mockJobEntity.escrowAddress = MOCK_ADDRESS;
      expect(jobEntityResult).toMatchObject(mockJobEntity);
      expect(mockJobEntity.save).toHaveBeenCalled();
    });

    it('should handle error during job launch', async () => {
      (EscrowClient.build as any).mockImplementation(() => ({
        createAndSetupEscrow: jest.fn().mockRejectedValue(new Error()),
      }));

      const mockJobEntity: Partial<JobEntity> = {
        chainId: 1,
        manifestUrl: MOCK_FILE_URL,
        manifestHash: MOCK_FILE_HASH,
        status: JobStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      await expect(
        jobService.launchJob(mockJobEntity as JobEntity),
      ).rejects.toThrow();
    });
  });

  describe('fundJob', () => {
    const chainId = ChainId.LOCALHOST;

    it('should fund a job successfully', async () => {
      (EscrowClient.build as any).mockImplementation(() => ({
        fund: jest.fn(),
      }));

      const fundAmount = 10;
      const fee = (MOCK_JOB_LAUNCHER_FEE / 100) * fundAmount;

      const mockJobEntity: Partial<JobEntity> = {
        chainId,
        manifestUrl: MOCK_FILE_URL,
        manifestHash: MOCK_FILE_HASH,
        fee,
        fundAmount,
        status: JobStatus.PAID,
        save: jest.fn().mockResolvedValue(true),
      };

      const jobEntityResult = await jobService.fundJob(
        mockJobEntity as JobEntity,
      );

      mockJobEntity.escrowAddress = MOCK_ADDRESS;
      expect(jobEntityResult).toMatchObject(mockJobEntity);
      expect(jobEntityResult.status).toBe(JobStatus.LAUNCHED);
      expect(mockJobEntity.save).toHaveBeenCalled();
    });

    it('should handle error during job fund', async () => {
      (EscrowClient.build as any).mockImplementation(() => ({
        fund: jest.fn().mockRejectedValue(new Error()),
      }));

      const mockJobEntity: Partial<JobEntity> = {
        chainId: 1,
        manifestUrl: MOCK_FILE_URL,
        manifestHash: MOCK_FILE_HASH,
        status: JobStatus.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };

      await expect(
        jobService.fundJob(mockJobEntity as JobEntity),
      ).rejects.toThrow();
    });
  });

  describe('saveManifest with fortune request type', () => {
    const fortuneManifestParams = {
      requestType: JobRequestType.FORTUNE,
      submissionsRequired: MOCK_SUBMISSION_REQUIRED,
      requesterDescription: MOCK_REQUESTER_DESCRIPTION,
      fundAmount: 10,
      requesterTitle: MOCK_REQUESTER_TITLE,
    };

    let uploadFilesMock: any;

    beforeEach(() => {
      uploadFilesMock = jest.spyOn(jobService.storageClient, 'uploadFiles');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should save the manifest and return the manifest URL and hash', async () => {
      uploadFilesMock.mockResolvedValue([
        {
          url: MOCK_FILE_URL,
          hash: MOCK_FILE_HASH,
        },
      ]);

      const result = await jobService.saveManifest(fortuneManifestParams);

      expect(result).toEqual({
        manifestUrl: MOCK_FILE_URL,
        manifestHash: MOCK_FILE_HASH,
      });
      expect(jobService.storageClient.uploadFiles).toHaveBeenCalledWith(
        [fortuneManifestParams],
        MOCK_BUCKET_NAME,
      );
    });

    it('should throw an error if the manifest file fails to upload', async () => {
      const uploadError = new Error(ErrorBucket.UnableSaveFile);

      uploadFilesMock.mockRejectedValue(uploadError);

      await expect(
        jobService.saveManifest(fortuneManifestParams),
      ).rejects.toThrowError(
        new BadGatewayException(ErrorBucket.UnableSaveFile),
      );
      expect(jobService.storageClient.uploadFiles).toHaveBeenCalledWith(
        [fortuneManifestParams],
        MOCK_BUCKET_NAME,
      );
    });

    it('should rethrow any other errors encountered', async () => {
      const errorMessage = 'Something went wrong';
      const uploadError = new Error(errorMessage);

      uploadFilesMock.mockRejectedValue(uploadError);

      await expect(
        jobService.saveManifest(fortuneManifestParams),
      ).rejects.toThrowError(new Error(errorMessage));
      expect(jobService.storageClient.uploadFiles).toHaveBeenCalledWith(
        [fortuneManifestParams],
        MOCK_BUCKET_NAME,
      );
    });
  });

  describe('saveManifest with image label binary request type', () => {
    const manifest: CvatManifestDto = {
      data: {
        data_url: MOCK_FILE_URL,
      },
      annotation: {
        labels: [{ name: 'label1' }],
        description: MOCK_REQUESTER_DESCRIPTION,
        type: JobRequestType.IMAGE_LABEL_BINARY,
        job_size: 10,
        max_time: 300,
      },
      validation: {
        min_quality: 1,
        val_size: 2,
        gt_url: '',
      },
      job_bounty: '1',
    };

    let uploadFilesMock: any;

    beforeEach(() => {
      uploadFilesMock = jest.spyOn(jobService.storageClient, 'uploadFiles');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should save the manifest and return the manifest URL and hash', async () => {
      uploadFilesMock.mockResolvedValue([
        {
          url: MOCK_FILE_URL,
          hash: MOCK_FILE_HASH,
        },
      ]);

      const result = await jobService.saveManifest(manifest);

      expect(result).toEqual({
        manifestUrl: MOCK_FILE_URL,
        manifestHash: MOCK_FILE_HASH,
      });
      expect(jobService.storageClient.uploadFiles).toHaveBeenCalledWith(
        [manifest],
        MOCK_BUCKET_NAME,
      );
    });

    it('should throw an error if the manifest file fails to upload', async () => {
      const uploadError = new Error(ErrorBucket.UnableSaveFile);

      uploadFilesMock.mockRejectedValue(uploadError);

      await expect(jobService.saveManifest(manifest)).rejects.toThrowError(
        new BadGatewayException(ErrorBucket.UnableSaveFile),
      );
      expect(jobService.storageClient.uploadFiles).toHaveBeenCalledWith(
        [manifest],
        MOCK_BUCKET_NAME,
      );
    });

    it('should rethrow any other errors encountered', async () => {
      const errorMessage = 'Something went wrong';
      const uploadError = new Error(errorMessage);

      uploadFilesMock.mockRejectedValue(uploadError);

      await expect(jobService.saveManifest(manifest)).rejects.toThrowError(
        new Error(errorMessage),
      );
      expect(jobService.storageClient.uploadFiles).toHaveBeenCalledWith(
        [manifest],
        MOCK_BUCKET_NAME,
      );
    });
  });

  describe('getManifest', () => {
    it('should download and return the manifest', async () => {
      const fundAmount = 10;

      const manifest: FortuneManifestDto = {
        submissionsRequired: 10,
        requesterTitle: MOCK_REQUESTER_TITLE,
        requesterDescription: MOCK_REQUESTER_DESCRIPTION,
        fundAmount,
        requestType: JobRequestType.FORTUNE,
      };

      StorageClient.downloadFileFromUrl = jest.fn().mockReturnValue(manifest);

      const result = await jobService.getManifest(MOCK_FILE_URL);

      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
      expect(result).toEqual(manifest);
    });

    it('should throw a NotFoundException if the manifest is not found', async () => {
      StorageClient.downloadFileFromUrl = jest.fn().mockResolvedValue(null);

      await expect(jobService.getManifest(MOCK_FILE_URL)).rejects.toThrowError(
        new NotFoundException(ErrorJob.ManifestNotFound),
      );
    });
  });

  describe('getManifest', () => {
    let downloadFileFromUrlMock: any;

    beforeEach(() => {
      downloadFileFromUrlMock = jest.spyOn(
        StorageClient,
        'downloadFileFromUrl',
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should download and return the manifest', async () => {
      const fundAmount = 10;

      const manifest: FortuneManifestDto = {
        submissionsRequired: 10,
        requesterTitle: MOCK_REQUESTER_TITLE,
        requesterDescription: MOCK_REQUESTER_DESCRIPTION,
        fundAmount,
        requestType: JobRequestType.FORTUNE,
      };

      downloadFileFromUrlMock.mockReturnValue(manifest);

      const result = await jobService.getManifest(MOCK_FILE_URL);

      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
      expect(result).toEqual(manifest);
    });

    it('should throw a NotFoundException if the manifest is not found', async () => {
      downloadFileFromUrlMock.mockResolvedValue(null);

      await expect(jobService.getManifest(MOCK_FILE_URL)).rejects.toThrowError(
        new NotFoundException(ErrorJob.ManifestNotFound),
      );
      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
    });
  });

  describe('getResult', () => {
    let downloadFileFromUrlMock: any;

    beforeEach(() => {
      downloadFileFromUrlMock = jest.spyOn(
        StorageClient,
        'downloadFileFromUrl',
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should download and return the fortune result', async () => {
      const fortuneResult: FortuneFinalResultDto = {
        exchangeAddress: MOCK_ADDRESS,
        workerAddress: MOCK_ADDRESS,
        solution: 'good',
      };

      (EscrowClient.build as any).mockImplementation(() => ({
        getResultsUrl: jest.fn().mockResolvedValue(MOCK_FILE_URL),
      }));
      downloadFileFromUrlMock.mockResolvedValue(fortuneResult);

      const result = await jobService.getResult(MOCK_USER_ID, MOCK_JOB_ID);

      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
      expect(result).toEqual(fortuneResult);
    });

    it('should download and return the image binary result', async () => {
      const imageBinaryResult: CvatFinalResultDto = {
        url: 'https://example.com',
        final_answer: 'good',
        correct: ['good', 'good', 'good'],
        wrong: [''],
      };

      downloadFileFromUrlMock.mockResolvedValue(imageBinaryResult);

      const result = await jobService.getResult(MOCK_USER_ID, MOCK_JOB_ID);

      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
      expect(result).toEqual(imageBinaryResult);
    });

    it('should throw a NotFoundException if the result is not found', async () => {
      downloadFileFromUrlMock.mockResolvedValue(null);

      await expect(
        jobService.getResult(MOCK_USER_ID, MOCK_JOB_ID),
      ).rejects.toThrowError(new NotFoundException(ErrorJob.ResultNotFound));
      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
    });

    it('should throw a NotFoundException if the result is not valid', async () => {
      downloadFileFromUrlMock.mockResolvedValue({
        exchangeAddress: MOCK_ADDRESS,
        workerAddress: MOCK_ADDRESS,
        solutionNotFortune: 'good',
      });

      await expect(
        jobService.getResult(MOCK_USER_ID, MOCK_JOB_ID),
      ).rejects.toThrowError(
        new NotFoundException(ErrorJob.ResultValidationFailed),
      );
      expect(StorageClient.downloadFileFromUrl).toHaveBeenCalledWith(
        MOCK_FILE_URL,
      );
    });
  });

  describe('getJobsByStatus', () => {
    const userId = 1;
    const skip = 0;
    const limit = 5;

    it('should call the database with PENDING status', async () => {
      jobService.getJobsByStatus(userId, JobStatusFilter.PENDING, skip, limit);
      expect(jobRepository.find).toHaveBeenCalledWith(
        {
          status: In([JobStatus.PENDING, JobStatus.PAID]),
          userId: userId,
        },
        {
          skip: skip,
          take: limit,
        },
      );
    });
    it('should call the database with LAUNCHED status', async () => {
      jobService.getJobsByStatus(userId, JobStatusFilter.LAUNCHED, skip, limit);
      expect(jobRepository.find).toHaveBeenCalledWith(
        {
          status: In([JobStatus.LAUNCHED]),
          userId: userId,
        },
        {
          skip: skip,
          take: limit,
        },
      );
    });
    it('should call the database with COMPLETED status', async () => {
      jobService.getJobsByStatus(
        userId,
        JobStatusFilter.COMPLETED,
        skip,
        limit,
      );
      expect(jobRepository.find).toHaveBeenCalledWith(
        {
          status: In([JobStatus.COMPLETED]),
          userId: userId,
        },
        {
          skip: skip,
          take: limit,
        },
      );
    });
    it('should call the database with FAILED status', async () => {
      jobService.getJobsByStatus(userId, JobStatusFilter.FAILED, skip, limit);
      expect(jobRepository.find).toHaveBeenCalledWith(
        {
          status: In([JobStatus.FAILED]),
          userId: userId,
        },
        {
          skip: skip,
          take: limit,
        },
      );
    });
    it('should call the database with no status', async () => {
      jobService.getJobsByStatus(userId, undefined, skip, limit);
      expect(jobRepository.find).toHaveBeenCalledWith(
        {
          userId: userId,
        },
        {
          skip: skip,
          take: limit,
        },
      );
    });
  });
});
