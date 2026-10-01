import pino from "pino";

const isCi = process.env.CI === "true";

const log = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(isCi
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            messageFormat: "{scope} {msg}",
            translateTime: "HH:MM:ss",
          },
        },
      }),
});

type LogData = Record<string, unknown>;

export const scriptLog = (scope: string) => {
  const logger = log.child({ scope });

  return {
    info: (message: string, data?: LogData) =>
      data ? logger.info(data, message) : logger.info(message),
    warn: (message: string, data?: LogData) =>
      data ? logger.warn(data, message) : logger.warn(message),
    error: (message: string, data?: LogData) =>
      data ? logger.error(data, message) : logger.error(message),
    step: (message: string, data?: LogData) => {
      const startedAt = performance.now();
      data ? logger.info(data, `start: ${message}`) : logger.info(`start: ${message}`);

      return {
        done: (doneMessage = message, doneData?: LogData) => {
          const durationMs = Math.round(performance.now() - startedAt);
          const payload = { durationMs, ...(doneData ?? {}) };
          logger.info(payload, `done: ${doneMessage}`);
        },
      };
    },
  };
};
