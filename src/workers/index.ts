import { Worker, Queue } from 'bullmq';
import { getRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { processDocumentIngestion } from './processors.js';

// Queue names
export const QUEUE_NAMES = {
  DOCUMENT_INGESTION: 'document-ingestion',
} as const;

// Queue instance (initialized later)
export let documentIngestionQueue: Queue;

// Create workers
let documentIngestionWorker: Worker | null = null;

export async function initializeWorkers(): Promise<void> {
  try {
    // Create the queue (now that Redis is initialized)
    documentIngestionQueue = new Queue(QUEUE_NAMES.DOCUMENT_INGESTION, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Document ingestion worker
    documentIngestionWorker = new Worker(
      QUEUE_NAMES.DOCUMENT_INGESTION,
      processDocumentIngestion,
      {
        connection: getRedis(),
        concurrency: 2, // Process 2 documents concurrently
      }
    );

    documentIngestionWorker.on('completed', (job) => {
      logger.info(`Document ingestion completed: ${job.id}`);
    });

    documentIngestionWorker.on('failed', (job, err) => {
      logger.error({ job: job?.id, error: err }, 'Document ingestion failed');
    });

    documentIngestionWorker.on('error', (err) => {
      logger.error({ error: err }, 'Document ingestion worker error');
    });

    logger.info('✅ Workers initialized successfully');
  } catch (error) {
    logger.error({ error }, '❌ Failed to initialize workers');
    throw error;
  }
}

export async function closeWorkers(): Promise<void> {
  if (documentIngestionWorker) {
    await documentIngestionWorker.close();
    documentIngestionWorker = null;
  }
  
  await documentIngestionQueue.close();
  logger.info('Workers closed');
}

// Helper function to add document ingestion job
export async function addDocumentIngestionJob(documentId: string, priority: number = 0) {
  try {
    const job = await documentIngestionQueue.add(
      'ingest-document',
      { documentId },
      {
        priority,
        jobId: `ingest-${documentId}`, // Prevent duplicate jobs
      }
    );
    
    logger.info(`Document ingestion job queued: ${documentId} (job: ${job.id})`);
    return job;
  } catch (error) {
    logger.error({ error }, 'Failed to queue document ingestion');
    throw error;
  }
}
