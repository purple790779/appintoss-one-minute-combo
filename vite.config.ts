import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/appintoss-one-minute-combo/',
  plugins: [react()],
});
