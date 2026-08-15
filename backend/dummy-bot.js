// A fake "bot" process just to test start/stop/restart from the dashboard.
console.log("Dummy bot starting up...");

let tick = 0;
setInterval(() => {
  tick++;
  console.log(`[dummy-bot] heartbeat #${tick} — alive at ${new Date().toISOString()}`);
}, 3000);

process.on("SIGTERM", () => {
  console.log("Dummy bot received SIGTERM, shutting down gracefully...");
  process.exit(0);
});