const fs = require('fs');
const path = require('path');

try {
  const devDir = path.join(__dirname, '..', '.next', 'dev');
  if (fs.existsSync(devDir)) {
    fs.rmSync(devDir, { recursive: true, force: true });
  }

  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    if (Array.isArray(tsconfig.include)) {
      const filtered = tsconfig.include.filter(i => !i.includes('.next/dev/types'));
      if (filtered.length !== tsconfig.include.length) {
        tsconfig.include = filtered;
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
      }
    }
  }
} catch (e) {
  // Silent ignore
}
