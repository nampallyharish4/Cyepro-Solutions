const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('git log -p -5 src/app/layout.tsx');
  fs.writeFileSync('layout_history.txt', out);
} catch (e) {
  fs.writeFileSync('layout_history.txt', String(e) + '\n' + e.stdout?.toString() + '\n' + e.stderr?.toString());
}
