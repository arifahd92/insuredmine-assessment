import { Worker } from "node:worker_threads";
import { watchCpu } from "./src/services/cpuMonitor.js";

watchCpu();

new Worker("while (true) {}", { eval: true });
