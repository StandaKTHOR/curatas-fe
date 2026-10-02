import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

import { normalizeAppBase } from "./src/lib/base"

export { normalizeAppBase }

export default defineConfig(({ mode }) => {
    const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env }
    const apiBase = env.VITE_API_BASE
    if (!apiBase?.trim()) {
        throw new Error("VITE_API_BASE must be set to the backend URL before building the frontend")
    }

    const appBase = normalizeAppBase(env.VITE_APP_BASE)

    return {
        plugins: [react()],
        base: appBase,
        server: { port: 5173 },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    }
})
