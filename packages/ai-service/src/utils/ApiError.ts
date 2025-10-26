import { type ContentfulStatusCode } from "hono/utils/http-status";

interface ErrorOptions {
  message: string;
  isOperational?: boolean;
  details?: any[];
  stack?: string;
}

class ApiError extends Error {
  statusCode: ContentfulStatusCode;
  isOperational: boolean;
  details: any[];

  constructor(statusCode: ContentfulStatusCode, options: ErrorOptions) {
    super(options.message);

    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? false;
    this.details = options.details ?? [];

    if (options.stack) {
      this.stack = options.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;

export class CustomError extends Error {
  statusCode: number;

  /**
   * @param message Pesan error yang dapat ditampilkan kepada pengguna.
   * @param statusCode Kode status HTTP (e.g., 404, 409).
   */
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}