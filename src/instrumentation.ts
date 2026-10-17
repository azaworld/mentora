/** Runs once when the server starts. A bad production configuration stops the process. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.SKIP_ENV_CHECK === "true") return;
  const { checkEnv } = await import("./lib/env");
  try {
    checkEnv();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
