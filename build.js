const fs = require('fs');
const path = require('path');

function buildAppBundle(appDir) {
  const jsDir = path.join(appDir, 'js');
  const dataDir = path.join(appDir, 'data');

  const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js') && f !== 'file-bundle.js');
  const modules = {};
  for (const f of files) {
    let code = fs.readFileSync(path.join(jsDir, f), 'utf8');
    code = code.replace(/(from\s+['"])\.\/([a-zA-Z0-9_-]+\.js)(['"])/g, '$1app/$2$3');
    code = code.replace(/(import\s*\(\s*['"])\.\/([a-zA-Z0-9_-]+\.js)(['"]\s*\))/g, '$1app/$2$3');
    modules['app/' + f] = Buffer.from(code, 'utf8').toString('base64');
  }

  const metaJson = fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf8');
  const contentJson = fs.readFileSync(path.join(dataDir, 'content.json'), 'utf8');

  const bundleJs = `// Universal Loader (chạy trực tiếp được cả trên file:///, GitHub Pages https:// và localhost)
window.__STATIC_META__ = ${metaJson.trim()};
window.__STATIC_CONTENT__ = ${contentJson.trim()};
(() => {
  const modules = ${JSON.stringify(modules)};
  const imports = {
    "three": "https://unpkg.com/three@0.164.1/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.164.1/examples/jsm/"
  };
  for (const [k, b64] of Object.entries(modules)) {
    imports[k] = "data:text/javascript;base64," + b64;
  }
  const im = document.createElement('script');
  im.type = 'importmap';
  im.textContent = JSON.stringify({ imports });
  document.currentScript.after(im);

  window.addEventListener('DOMContentLoaded', () => {
    const m = document.createElement('script');
    m.type = 'module';
    m.textContent = 'import "app/main.js";';
    document.body.appendChild(m);
  });
})();
`;
  fs.writeFileSync(path.join(jsDir, 'file-bundle.js'), bundleJs, 'utf8');
  console.log('Built js/file-bundle.js for Đi Chùa Xõa Stress 3D');
}

buildAppBundle(__dirname);
