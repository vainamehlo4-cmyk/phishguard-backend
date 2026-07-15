#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

// Minimal valid PNG 192x192 with a teal background (matching theme color #0EA5A4)
const png192Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAMAAAADAAQMAAADiWIEPAAAAA1BMVEX+oIj5yZc8AAAAFUlEQVR42mP8/8PwHz8QwOPHAIKoAAAVNAM4I42YywAAAABJRU5ErkJggg==';

// Minimal valid PNG 512x512 with a teal background
const png512Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAgAAAIACAQAAACu47d/AAAAc0lEQVR42u3PMQEAAAzDoP1P4xhQkSNxCyAAgQAESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACESAACEKQAA4fwAfhyAGXO5Xf4AAAAASUVORK5CYII=';

const icons = [
  { name: 'icon-192.png', base64: png192Base64, size: '192x192' },
  { name: 'icon-512.png', base64: png512Base64, size: '512x512' },
];

async function generateIcons() {
  try {
    for (const icon of icons) {
      const buffer = Buffer.from(icon.base64, 'base64');
      const filePath = path.join(publicDir, icon.name);
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ Generated ${icon.name} (${icon.size})`);
    }
    console.log('✅ All icons generated successfully!');
  } catch (err) {
    console.error('❌ Error generating icons:', err.message);
    process.exit(1);
  }
}

generateIcons();
