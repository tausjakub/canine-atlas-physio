import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

const flag = (name: string) =>
  JSON.stringify(process.env[name] === '1' ? '1' : '0');

export default defineConfig({
  define: {
    'process.env.NEXT_PUBLIC_BASE_PATH': JSON.stringify(
      (process.env.PAGES_BASE_PATH || '').replace(/\/$/, ''),
    ),
    // Off unless a build script opts in; see app/edition.ts.
    'process.env.NEXT_PUBLIC_ATLAS_LIBRARY': flag('ATLAS_LIBRARY'),
    'process.env.NEXT_PUBLIC_ATLAS_PRIVATE': flag('ATLAS_PRIVATE'),
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext()],
});
