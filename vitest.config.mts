import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" é um marcador do Next que impede o uso no navegador; nos testes vira um módulo vazio.
      "server-only": fileURLToPath(new URL("./src/lib/servidor/vazio.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
