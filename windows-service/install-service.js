const path = require("path");
const Service = require("node-windows").Service;

const runner = path.join(__dirname, "runner.js");

const svc = new Service({
  name: "Pharmacy-workload",
  description: "Pharmacy Workload System (Next.js)",
  script: runner,
  nodeOptions: [],
  env: [
    { name: "NODE_ENV", value: "production" },
    { name: "PORT", value: "3000" },
    { name: "HOSTNAME", value: "0.0.0.0" },
  ],
});

svc.on("install", () => {
  console.log("✅ Service installed! Starting...");
  svc.start();
});

svc.on("start", () => {
  console.log("🚀 Service started! Running at http://localhost:3000");
});

svc.on("error", (err) => {
  console.error("❌ Error:", err);
});

svc.on("alreadyinstalled", () => {
  console.warn("⚠️  Service already installed. Run uninstall-service.js first.");
});

svc.install();