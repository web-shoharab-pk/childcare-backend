import axios, { AxiosError } from "axios";
import { envConfig } from "../config/envConfig";
import logger from "../utils/logger";

export class LoadBalancer {
  private services: Record<string, string[]>;
  private currentIndex: Record<string, number>;
  private healthStatus: Record<string, Record<string, boolean>>;
  private readonly MAX_RETRIES = 3;

  constructor() {
    const mainServiceUrl =
      envConfig.SERVER_URL || `http://localhost:${envConfig.PORT || 5000}`;

    // For now, all services point to the same instance
    this.services = {
      activity: [mainServiceUrl],
      booking: [mainServiceUrl],
      auth: [mainServiceUrl],
    };

    this.currentIndex = {
      activity: 0,
      booking: 0,
      auth: 0,
    };

    this.healthStatus = {};
    this.initializeHealthStatus();
    this.startHealthCheck();
  }

  private initializeHealthStatus() {
    Object.keys(this.services).forEach((service) => {
      this.healthStatus[service] = {};
      this.services[service].forEach((instance) => {
        this.healthStatus[service][instance] = true;
      });
    });
  }

  private startHealthCheck() {
    setInterval(async () => {
      for (const [service, instances] of Object.entries(this.services)) {
        for (const instance of instances) {
          try {
            this.healthStatus[service][instance] = await this.checkHealth(
              instance
            );
          } catch (error) {
            logger.warn(`Health check failed for ${service} at ${instance}`, {
              error: error instanceof Error ? error.message : "Unknown error",
            });
            this.healthStatus[service][instance] = false;
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async getNextHealthyService(serviceName: string): Promise<string> {
    const instances = this.services[serviceName];
    if (!instances || instances.length === 0) {
      throw new Error(`No instances configured for service: ${serviceName}`);
    }

    // For now, just return the first (and only) instance
    return instances[0];
  }

  async checkHealth(serviceUrl: string): Promise<boolean> {
    try {
      const response = await axios.get(`${serviceUrl}/health`, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });
      return true;
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.debug(`Health check failed for ${serviceUrl}:`, {
          error: error.message,
          code: error.code,
        });
      }
      return false;
    }
  }

  getServiceStatus(): Record<string, any> {
    return Object.entries(this.services).reduce((acc, [service, instances]) => {
      acc[service] = {
        instances,
        currentIndex: this.currentIndex[service],
        totalInstances: instances.length,
        healthStatus: this.healthStatus[service],
      };
      return acc;
    }, {} as Record<string, any>);
  }
}
