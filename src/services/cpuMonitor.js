const CHECK_EVERY_MS = 1000;
const RESTART_AT_PERCENT = 70;

export function watchCpu() {
  let lastTime = Date.now();
  let lastUsage = process.cpuUsage();

  const timer = setInterval(() => {
    const now = Date.now();
    const elapsedMs = now - lastTime;
    const usage = process.cpuUsage(lastUsage);

    lastTime = now;
    lastUsage = process.cpuUsage();

    const cpuMs = (usage.user + usage.system) / 1000;
    const percent = (cpuMs / elapsedMs) * 100;
    const rounded = Math.round(percent * 10) / 10;

    console.log(`CPU ${rounded}%`);

    if (rounded >= RESTART_AT_PERCENT) {
      clearInterval(timer);
      console.log(`CPU reached ${rounded}%. Exiting so the process can restart.`);
      process.exit(1);
    }
  }, CHECK_EVERY_MS);

  timer.unref();
}
