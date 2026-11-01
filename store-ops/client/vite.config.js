import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Mac 上 "::" 默认不接收 IPv4。页面固定开在 127.0.0.1，避免 localhost 只走到 IPv6。
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      clientPort: 5173,
    },
    proxy: {
      "/api": "http://127.0.0.1:3780",
    },
  },
});
