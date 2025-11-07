import { DatabaseError } from "pg"; // drizzle uses pg driver underneath
import { Job } from "bullmq";


/**
 *
 *
 * @export
 * @param {unknown} error
 * @return {*}  {boolean}
 */
export function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof DatabaseError) {
    // 23505 = unique_violation
    return error.code === "23505";
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("duplicate key") ||
      msg.includes("unique constraint") ||
      msg.includes("already exists") ||
      msg.includes("violates unique constraint")
    );
  }

  return false;
}


/**
 *
 *
 * @export
 * @param {Job} job
 * @param {unknown} error
 * @return {*} 
 */
export async function handleDuplicateJob(job: Job, error: unknown) {
  if (isUniqueConstraintError(error)) {
    console.warn(`[SAFE CONSUME] Duplicated: ${job.id}`);
    await job.remove();
    return true;
  }
  return false;
}
