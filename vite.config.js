import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 3000,
        open: false,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
                configure: function (proxy) {
                    proxy.on('error', function (err, req) {
                        console.warn("[vite proxy error] ".concat(req === null || req === void 0 ? void 0 : req.method, " ").concat(req === null || req === void 0 ? void 0 : req.url, ":"), err === null || err === void 0 ? void 0 : err.message);
                    });
                },
            },
        },
    },
});
