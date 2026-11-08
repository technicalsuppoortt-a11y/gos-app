export type GenerationEstimate = { typicalMs: number; upperMs: number; samples: number };
export type GenerationTimingJob = {
  kind?: string;
  status?: string;
  startedAt?: number;
  completedAt?: number;
  result?: { element?: string };
};

// Use completed operations, including validation and persistence, rather than a
// guessed countdown or provider latency alone. Keep unlike operations separate.
export function estimateGenerationTime(
  jobs: GenerationTimingJob[],
  operation: string,
  element?: string,
): GenerationEstimate | null {
  const durations = jobs
    .filter(
      (job) =>
        job.kind === operation &&
        job.status === "complete" &&
        (!element || job.result?.element === element) &&
        Number.isFinite(job.startedAt) &&
        Number.isFinite(job.completedAt) &&
        job.completedAt! - job.startedAt! >= 1000 &&
        job.completedAt! - job.startedAt! <= 600000,
    )
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
    .slice(0, 20)
    .map((job) => (job.completedAt ?? NaN) - (job.startedAt ?? NaN))
    .filter((duration) => Number.isFinite(duration) && duration >= 1000 && duration <= 600000)
    .sort((a, b) => a - b);
  if (durations.length < 3) return null;
  const percentile = (p: number) => durations[Math.max(0, Math.ceil(durations.length * p) - 1)]!;
  return { typicalMs: percentile(0.5), upperMs: percentile(0.9), samples: durations.length };
}
