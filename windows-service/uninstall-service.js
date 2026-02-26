const path = require("path");
const Service = require("node-windows").Service;

const runner = path.join(__dirname, "runner.js");

const svc = new Service({
  name: "Pharmacy Workload",
  script: runner,
});

svc.on("uninstall", () => console.log("🗑️ Service uninstalled"));
svc.on("error", (err) => console.error("❌ Error:", err));
svc.on("notinstalled", () => console.warn("⚠️  Service not installed"));

svc.uninstall();