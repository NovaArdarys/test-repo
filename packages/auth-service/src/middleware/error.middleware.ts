import { isAxiosError } from "axios";
import { HTTPException } from "hono/http-exception";
import { DatabaseError } from "pg";
import ApiError from "@/utils/ApiError";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ErrorHandler } from "hono";

const handleDatabaseError = (error: DatabaseError) => {
  switch (error.code) {
    case "23505":
      return new ApiError(400, {
        message: `Duplicate value: ${error.detail ?? error.constraint}`,
        isOperational: true,
      });
    case "23503":
      return new ApiError(400, {
        message: `Invalid reference: ${error.detail ?? "foreign key error"}`,
        isOperational: true,
      });
    case "23502":
      return new ApiError(400, {
        message: `Missing required field: ${error.column}`,
        isOperational: true,
      });
    default:
      return new ApiError(500, {
        message: `Database error: ${error.message}`,
        isOperational: false,
      });
  }
};

export const errorConverter = (
  error: any
): ApiError => {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    const status = error.response?.status || 500;
    const apiError = error.response?.data || {
      error: "Upstream Service Error",
      message: error.message,
    };

    return new ApiError(status as ContentfulStatusCode, {
      message: apiError.error || apiError.message || "Upstream Service Error",
      details: apiError.details || [
        { message: apiError.message || "Unknown upstream error" },
      ],
      isOperational: true,
    });
  }

  const drizzleWrappedError = error as any;

  const originalPgError = drizzleWrappedError.error || drizzleWrappedError.originalError || drizzleWrappedError.cause;

  if (originalPgError instanceof DatabaseError) {
    return handleDatabaseError(originalPgError);
  } else if (originalPgError && typeof originalPgError === 'object' && 'code' in originalPgError) {
    return handleDatabaseError(originalPgError as DatabaseError);
  }

  if (error instanceof HTTPException) {
    return new ApiError(error.status, {
      message: error.message,
      isOperational: true,
    });
  }

  console.log(error, "====== 🌋 error =====");

  const statusCode = (error as any)?.statusCode || 500;
  const message = (error as any)?.message || "Internal Server Error";

  return new ApiError(statusCode, {
    message,
    isOperational: false,
  });
};

export const errorHandler: ErrorHandler = (err, c) => {
  const convertedError = errorConverter(err);

  console.error({
    name: err instanceof Error ? err.name : "UnknownError",
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  }, convertedError.statusCode, "====== err ======");

  return c.json(
    {
      error: convertedError.message,
      details: convertedError.details || [],
    },
    convertedError.statusCode
  );
};
