import winston, {Logger} from 'winston';

export const logger: Logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console({ format: winston.format.simple() })]
});
