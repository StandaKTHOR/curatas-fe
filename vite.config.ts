import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
    const apiBase = loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE
    if (!apiBase?.trim()) {
        throw new Error("VITE_API_BASE must be set to the backend URL before building the frontend")
    }

    return {
        plugins: [react()],
        base: "/",
        server: { port: 5173 },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    }
})
