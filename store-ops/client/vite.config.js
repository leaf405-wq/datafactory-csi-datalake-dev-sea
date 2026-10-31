import net from "node:net";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function canBind(host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(0, host, () => {
      server.close(() => resolve(true));
    });
  });
}

export default defineConfig(async () => {
  // "::" accepts localhost and 127.0.0.1 on a dual-stack machine.
  // Machines with IPv6 turned off fall back to every IPv4 address.
  const host = (await canBind("::")) ? "::" : "0.0.0.0";
  return {
    plugins: [react()],
    server: {
      host,
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": "http://127.0.0.1:3780",
      },
    },
  };
});
