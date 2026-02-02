const fs = require('fs');
const path = require('path');

async function main() {
  const cwd = process.cwd();
  const publicDir = path.join(cwd, 'public');
  const target = path.join(publicDir, 'pdf.worker.min.js');

  const candidates = [
    'pdfjs-dist/build/pdf.worker.min.js',
    'pdfjs-dist/build/pdf.worker.js',
    'pdfjs-dist/build/pdf.worker.min.mjs',
    'pdfjs-dist/build/pdf.worker.mjs'
  ];

  for (const candidate of candidates) {
    try {
      const resolved = require.resolve(candidate, { paths: [cwd] });
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      fs.copyFileSync(resolved, target);
      console.log(`Copied ${candidate} -> public/pdf.worker.min.js`);
      process.exit(0);
    } catch (err) {
      // try next
    }
  }

  console.error(
    'Could not find pdf.worker in installed packages. Please install `pdfjs-dist` or copy the worker file manually to `public/pdf.worker.min.js`.'
  );
  process.exit(1);
}

main();
