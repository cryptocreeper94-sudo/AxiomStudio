#!/usr/bin/env node

/**
 * Axiom Studio — CLI Entry Point
 * Run: npx axiom-studio
 *
 * DarkWave Studios LLC — Copyright 2026
 */

import("../dist/server/local-index.js").catch((err) => {
  if (err.code === "ERR_MODULE_NOT_FOUND") {
    console.error("\n  ✗ Axiom Studio needs to be built first.");
    console.error("  Run: npm run build\n");
    process.exit(1);
  }
  console.error("  ✗ Failed to start Axiom Studio:", err.message);
  process.exit(1);
});
