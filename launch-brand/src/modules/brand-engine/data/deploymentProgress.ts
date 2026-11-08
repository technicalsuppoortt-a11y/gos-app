/** The final checkpoint requires Phoenix's success response, even at 100%. */
export function confirmedDeploymentSteps(
  state: "idle" | "deploying" | "success" | "failed",
  progress: number,
  stepCount: number,
) {
  if (state === "success") return stepCount;
  if (state !== "deploying") return 0;
  const percent = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  return Math.min(stepCount - 1, Math.floor(percent / 100 * stepCount));
}
