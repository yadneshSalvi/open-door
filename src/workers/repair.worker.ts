import { createRepairSearch } from "../engine/repair";
import type { EvaluationInput } from "../engine/types";

// The worker has no network or model dependency. Terminating it cancels all work.
const channel = self as unknown as {
  onmessage: ((event: MessageEvent<{ input: EvaluationInput }>) => void) | null;
  postMessage: (value: unknown) => void;
};

channel.onmessage = ({ data }) => {
  const job = createRepairSearch(data.input);
  let sentAt = 0;
  function advance() {
    try {
      const progress = job.step(12);
      if (Date.now() - sentAt > 90 || progress.status !== "searching") {
        channel.postMessage({ progress });
        sentAt = Date.now();
      }
      if (progress.status === "searching") setTimeout(advance, 0);
    } catch {
      job.cancel();
      channel.postMessage({ error: "The layout search could not finish. Your room is unchanged." });
    }
  }
  advance();
};
