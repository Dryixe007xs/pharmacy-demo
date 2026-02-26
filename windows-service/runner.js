const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const appRoot = path.resolve(__dirname, "..");
const nodeExe = "node";
const nextBin = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");

const port = process.env.PORT || "3000";
const host = process.env.HOSTNAME || "0.0.0.0";

const logPath = path.join(appRoot, "next-service.log");
const log = fs.createWriteStream(logPath, { flags: "a" });

log.write(`\n[${new Date().toISOString()}] Starting Next.js service...\n`);
log.write(`appRoot=${appRoot}\nnodeExe=${nodeExe}\nnextBin=${nextBin}\nPORT=${port}\nHOSTNAME=${host}\n`);

// รอให้ไฟล์ open ก่อนค่อย spawn
log.on("open", () => {
  const child = spawn(nodeExe, [nextBin, "start", "-p", port, "-H", host], {
    cwd: appRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: port,
      HOSTNAME: host,
    },
    windowsHide: true,
    stdio: ["ignore", log, log],
  });

  child.on("close", (code) => {
    log.write(`[${new Date().toISOString()}] Next.js exited with code=${code}\n`);
    process.exit(code ?? 0);
  });

  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
});

log.on("error", (err) => {
  console.error("Log file error:", err);
  process.exit(1);
});