import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config.js';
import { logger } from './logger.js';

export class S3Service {
  private static client: S3Client | null = null;

  /**
   * Initialize S3 client
   */
  private static getClient(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: config.S3_REGION,
        endpoint: config.S3_ENDPOINT,
        forcePathStyle: config.S3_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: config.S3_ACCESS_KEY,
          secretAccessKey: config.S3_SECRET_KEY,
        },
      });
    }
    return this.client;
  }

  /**
   * Upload file to S3
   */
  static async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const client = this.getClient();
      const command = new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await client.send(command);
      logger.info(`File uploaded to S3: ${key}`);
      return key;
    } catch (error) {
      logger.error({ error }, 'Failed to upload file to S3');
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download file from S3
   */
  static async downloadFile(key: string): Promise<Buffer> {
    try {
      const client = this.getClient();
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      const response = await client.send(command);
      const chunks: Uint8Array[] = [];
      
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      const buffer = Buffer.concat(chunks);
      logger.info(`File downloaded from S3: ${key}`);
      return buffer;
    } catch (error) {
      logger.error({ error }, 'Failed to download file from S3');
      throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(key: string): Promise<void> {
    try {
      const client = this.getClient();
      const command = new DeleteObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      await client.send(command);
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error({ error }, 'Failed to delete file from S3');
      throw new Error(`S3 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate presigned URL for file access
   */
  static async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const client = this.getClient();
      const command = new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      });

      const url = await getSignedUrl(client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error({ error }, 'Failed to generate presigned URL');
      throw new Error(`Presigned URL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
