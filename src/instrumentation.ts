/**
 * Next.js instrumentation — runs once on server startup.
 * Starts the automation worker on the Node.js server runtime when enabled.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_AUTOMATION_WORKER !== "true") return;
  const { startAutomationWorker } = await import(
    "@/lib/services/automation-worker"
  );
  startAutomationWorker();
}
