/**
 * Theme comes from tailwind.theme.json, which is generated from
 * openspec/design/system.json by tools/generate-theme.mjs. Do not add values
 * here — add them to the design system and re-run the generator, or the two
 * become separate sources of truth and the design system stops being one.
 */
import { readFileSync } from 'node:fs';

const theme = JSON.parse(readFileSync(new URL('./tailwind.theme.json', import.meta.url), 'utf8'));

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme,
};
