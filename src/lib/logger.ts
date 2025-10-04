import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const loggerConfig: any = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => {
      return { level: label };
    }
  }
};

if (isDevelopment) {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  };
}

export const logger = pino(loggerConfig);
