// Lists every API route handler (METHOD /api/path) into scripts/.routes.txt
import fs from 'node:fs';
import path from 'node:path';

const root = path.join('src', 'app', 'api');
const out = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'route.js') {
      const route = '/api/' + path.relative(root, path.dirname(p)).split(path.sep).join('/');
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)/g)) out.push(`${m[1]} ${route.replace(/\/$/, '')}`);
    }
  }
})(root);
fs.writeFileSync(path.join('scripts', '.routes.txt'), out.sort().join('\n') + '\n');
console.log(out.length, 'handlers');
