import { HttpService } from "@nestjs/axios";
import { BadRequestException, ConflictException, Inject, Injectable, Logger } from "@nestjs/common";
import { EscrowClient, EscrowStatus, StorageClient } from "@human-protocol/sdk";
import { ethers } from "ethers";

import { serverConfigKey, ServerConfigType, storageConfigKey, StorageConfigType } from "@/common/config";
import { JobRequestType, JobSolutionRequestDto } from "./job.dto";
import { Web3Service } from "../web3/web3.service";
import { ErrorJob } from "../../common/constants/errors";

@Injectable()
export class JobService {
  public readonly logger = new Logger(JobService.name);

  constructor(
    @Inject(storageConfigKey)
    private storageConfig: StorageConfigType,
    @Inject(serverConfigKey)
    private serverConfig: ServerConfigType,
    @Inject(Web3Service)
    private readonly web3Service: Web3Service,
    private readonly httpService: HttpService,
  ) {}

  async processJobSolution(jobSolution: JobSolutionRequestDto): Promise<string> {
    const signer = this.web3Service.getSigner(jobSolution.chainId);
    const escrowClient = await EscrowClient.build(signer);

    // Validate if recording oracle address is valid
    const recordingOracleAddress = await escrowClient.getRecordingOracleAddress(jobSolution.escrowAddress);

    if (ethers.utils.getAddress(recordingOracleAddress) !== (await signer.getAddress())) {
      this.logger.log(ErrorJob.AddressMismatches, JobService.name);
      throw new BadRequestException(ErrorJob.AddressMismatches);
    }

    // Validate if the escrow is in the correct state
    const escrowStatus = await escrowClient.getStatus(jobSolution.escrowAddress);
    if (escrowStatus !== EscrowStatus.Pending) {
      this.logger.log(ErrorJob.InvalidStatus, JobService.name);
      throw new BadRequestException(ErrorJob.InvalidStatus);
    }

    // Validate if the escrow has the correct manifest
    const manifestUrl = await escrowClient.getManifestUrl(jobSolution.escrowAddress);
    const { submissionsRequired, requestType } = (await StorageClient.downloadFileFromUrl(manifestUrl)) as Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >;

    if (!submissionsRequired && !requestType) {
      this.logger.log(ErrorJob.InvalidManifest, JobService.name);
      throw new BadRequestException(ErrorJob.InvalidManifest);
    }

    if (requestType !== JobRequestType.FORTUNE) {
      this.logger.log(ErrorJob.InvalidJobType, JobService.name);
      throw new BadRequestException(ErrorJob.InvalidJobType);
    }

    // Initialize Storage Client
    const storageClient = new StorageClient(
      {
        accessKey: this.storageConfig.accessKey,
        secretKey: this.storageConfig.secretKey,
      },
      {
        endPoint: this.storageConfig.endPoint,
        port: this.storageConfig.port,
        useSSL: this.storageConfig.useSSL,
      },
    );
    const bucket = this.storageConfig.bucket;

    let existingJobSolutionsURL;
    try {
      existingJobSolutionsURL = await escrowClient.getIntermediateResultsUrl(jobSolution.escrowAddress);
    } catch (e) {
      console.log(e);
      this.logger.log(ErrorJob.NotFoundIntermediateResultsUrl, JobService.name);
      throw new BadRequestException(ErrorJob.NotFoundIntermediateResultsUrl);
    }

    const existingJobSolutions = await StorageClient.downloadFileFromUrl(existingJobSolutionsURL).catch(() => []);
    if (existingJobSolutions.find(({ solution }: { solution: string }) => solution === jobSolution.solution)) {
      this.logger.log(ErrorJob.SolutionAlreadyExists, JobService.name);
      throw new BadRequestException(ErrorJob.SolutionAlreadyExists);
    }

    // Save new solution to S3
    const newJobSolutions = [
      ...existingJobSolutions,
      {
        exchangeAddress: jobSolution.exchangeAddress,
        workerAddress: jobSolution.workerAddress,
        solution: jobSolution.solution,
      },
    ];

    const [jobSolutionUploaded] = await storageClient.uploadFiles([newJobSolutions], bucket);

    // Save solution URL/HASH on-chain
    await escrowClient.storeResults(jobSolution.escrowAddress, jobSolutionUploaded.url, jobSolutionUploaded.hash);

    // TODO: Uncomment this to read reputation oracle URL from KVStore
    // const reputationOracleAddress = await escrowClient.getReputationOracleAddress(jobSolution.escrowAddress);
    // const reputationOracleURL = (await kvstoreClient.get(reputationOracleAddress, "url")) as string;

    // TODO: Remove this when KVStore is used
    const reputationOracleURL = this.serverConfig.reputationOracleURL;

    // If number of solutions is equeal to the number required, call Reputation Oracle webhook.
    if (newJobSolutions.length === submissionsRequired) {
      await this.httpService.post(`${reputationOracleURL}/webhook`, {
        chainId: jobSolution.chainId,
        escrowAddress: jobSolution.escrowAddress,
      });

      return "The requested job is completed.";
    } else if (newJobSolutions.length > submissionsRequired) {
      this.logger.log(ErrorJob.AllSolutionsHaveAlreadyBeenSent, JobService.name);
      throw new ConflictException(ErrorJob.AllSolutionsHaveAlreadyBeenSent);
    }

    return "Solution is recorded.";
  }
}