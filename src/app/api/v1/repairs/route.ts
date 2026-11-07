import { createRepairSearch } from "@/engine/repair";
import { evaluationRequestSchema } from "@/engine/schema";
import { apiError, ApiError, json, readJSON } from "@/lib/api";
export { OPTIONS } from "@/lib/api";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { requestId, generation, preferredMotions: _preferred, ...input } = evaluationRequestSchema.parse(await readJSON(request));
    const job = createRepairSearch(input);
    while (job.progress.status === "searching") {
      if (request.signal.aborted) {
        job.cancel();
        throw new ApiError("The layout search was cancelled.", 499);
      }
      job.step(12);
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    if (request.signal.aborted) { job.cancel(); throw new ApiError("The layout search was cancelled.", 499); }
    return json({ requestId, generation, ...job.progress });
  } catch (error) {
    return apiError(error);
  }
}
