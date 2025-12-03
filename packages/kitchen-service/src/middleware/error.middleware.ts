import { isAxiosError } from "axios";
import { HTTPException } from "hono/http-exception";
import { DatabaseError } from "pg";
import ApiError from "@/utils/ApiError";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ErrorHandler } from "hono";

const formatColumnLabel = (column: string) => {
  switch (column) {
    case "email":
      return "Email";
    case "username":
      return "Username";
    case "phone":
    case "phone_number":
      return "Nomor telepon";
    default:
      // kapitalisasi otomatis "user_id" => "User Id"
      return column.replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const extractColumnFromDetail = (detail?: string) => {
  if (!detail) return null;
  const match = detail.match(/Key \((.+?)\)=/);
  return match?.[1] ?? null;
};

const handleDatabaseError = (error: DatabaseError) => {
  let column = extractColumnFromDetail(error.detail);
  const readableColumn = column ? formatColumnLabel(column) : null;

  switch (error.code) {

    case "23505": {
      const message = readableColumn
        ? `${readableColumn} sudah digunakan.`
        : `Data sudah terdaftar.`;

      return new ApiError(400, {
        message,
        isOperational: true,
      });
    }

    case "23503": {
      const match = error.detail?.match(/Key \((.+?)\)=/);
      const col = match ? formatColumnLabel(match[1]) : "Data referensi";

      return new ApiError(400, {
        message: `${col} tidak valid atau tidak ditemukan.`,
        isOperational: true,
      });
    }

    case "23502":
      return new ApiError(400, {
        message: `Kolom '${formatColumnLabel(error.column || "")}' wajib diisi.`,
        isOperational: true,
      });

    default:
      return new ApiError(500, {
        message: `Terjadi kesalahan pada database.`,
        isOperational: false,
      });
  }
};


export const errorConverter = (
  error: any
): ApiError => {
  if (error instanceof ApiError) return error;

  if (isAxiosError(error)) {
    console.log("===== axios =====");

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
    console.log("===== db =====");

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


  const statusCode = (error as any)?.statusCode || 500;
  const message = (error as any)?.message || "Internal Server Error";

  return new ApiError(statusCode, {
    message,
    isOperational: false,
  });
};

export const errorHandler: ErrorHandler = (err, c) => {
  const convertedError = errorConverter(err);

  return c.json(
    {
      error: convertedError.message,
      details: convertedError.details || [],
    },
    convertedError.statusCode
  );
};
