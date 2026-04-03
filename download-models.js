/**
 * Script to download Live2D models locally for offline use.
 * Downloads model JSON, moc3, textures, expressions, motions, physics, pose files.
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'public', 'models');

const MODELS = [
  {
    name: 'Haru_Greeter',
    baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/',
    modelFile: 'haru_greeter_t03.model3.json',
  },
  {
    name: 'Shizuku',
    baseUrl: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/',
    modelFile: 'shizuku.model.json',
  },
  {
    name: 'Haru',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Haru/',
    modelFile: 'Haru.model3.json',
  },
  {
    name: 'Hiyori',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Hiyori/',
    modelFile: 'Hiyori.model3.json',
  },
  {
    name: 'Mao',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Mao/',
    modelFile: 'Mao.model3.json',
  },
  {
    name: 'Mark',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Mark/',
    modelFile: 'Mark.model3.json',
  },
  {
    name: 'Natori',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Natori/',
    modelFile: 'Natori.model3.json',
  },
  {
    name: 'Ren',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Ren/',
    modelFile: 'Ren.model3.json',
  },
  {
    name: 'Rice',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Rice/',
    modelFile: 'Rice.model3.json',
  },
  {
    name: 'Wanko',
    baseUrl: 'https://cdn.jsdelivr.net/gh/Live2D/CubismWebSamples@develop/Samples/Resources/Wanko/',
    modelFile: 'Wanko.model3.json',
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadFile(url, destPath) {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  const data = await download(url);
  fs.writeFileSync(destPath, data);
  console.log(`  ✓ ${path.relative(MODELS_DIR, destPath)} (${(data.length / 1024).toFixed(1)}KB)`);
  return data;
}

function collectFiles(modelJson, format) {
  const files = new Set();

  if (format === 'cubism2') {
    // Cubism 2 format (.model.json)
    if (modelJson.model) files.add(modelJson.model);
    if (modelJson.pose) files.add(modelJson.pose);
    if (modelJson.physics) files.add(modelJson.physics);
    if (Array.isArray(modelJson.textures)) {
      modelJson.textures.forEach(t => files.add(t));
    }
    if (modelJson.expressions) {
      modelJson.expressions.forEach(e => { if (e.file) files.add(e.file); });
    }
    if (modelJson.motions) {
      Object.values(modelJson.motions).forEach(group => {
        if (Array.isArray(group)) {
          group.forEach(m => {
            if (m.file) files.add(m.file);
            if (m.sound) files.add(m.sound);
          });
        }
      });
    }
  } else {
    // Cubism 3/4 format (.model3.json)
    const fg = modelJson.FileReferences;
    if (!fg) return files;
    if (fg.Moc) files.add(fg.Moc);
    if (fg.Physics) files.add(fg.Physics);
    if (fg.Pose) files.add(fg.Pose);
    if (fg.DisplayInfo) files.add(fg.DisplayInfo);
    if (fg.UserData) files.add(fg.UserData);
    if (Array.isArray(fg.Textures)) {
      fg.Textures.forEach(t => files.add(t));
    }
    if (fg.Expressions) {
      fg.Expressions.forEach(e => { if (e.File) files.add(e.File); });
    }
    if (fg.Motions) {
      Object.values(fg.Motions).forEach(group => {
        if (Array.isArray(group)) {
          group.forEach(m => {
            if (m.File) files.add(m.File);
            if (m.Sound) files.add(m.Sound);
          });
        }
      });
    }
  }

  return files;
}

async function downloadModel(model) {
  console.log(`\n📦 Downloading: ${model.name}`);
  const modelDir = path.join(MODELS_DIR, model.name);
  const modelUrl = model.baseUrl + model.modelFile;

  try {
    // Download model JSON
    const data = await downloadFile(modelUrl, path.join(modelDir, model.modelFile));
    const modelJson = JSON.parse(data.toString('utf8'));

    const isCubism2 = model.modelFile.endsWith('.model.json');
    const files = collectFiles(modelJson, isCubism2 ? 'cubism2' : 'cubism3');

    console.log(`  Found ${files.size} referenced files`);

    // Download each referenced file
    let success = 0, failed = 0;
    for (const file of files) {
      const fileUrl = model.baseUrl + file;
      const fileDest = path.join(modelDir, file);
      try {
        await downloadFile(fileUrl, fileDest);
        success++;
      } catch (err) {
        console.log(`  ✗ FAILED: ${file} - ${err.message}`);
        failed++;
      }
    }

    console.log(`  Done: ${success} ok, ${failed} failed`);
    return true;
  } catch (err) {
    console.log(`  ✗ FAILED to download model: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Live2D Model Downloader ===\n');
  console.log(`Target: ${MODELS_DIR}`);
  fs.mkdirSync(MODELS_DIR, { recursive: true });

  const results = [];
  for (const model of MODELS) {
    const ok = await downloadModel(model);
    results.push({ name: model.name, ok });
  }

  console.log('\n=== Summary ===');
  results.forEach(r => {
    console.log(`${r.ok ? '✅' : '❌'} ${r.name}`);
  });
  console.log(`\nTotal: ${results.filter(r => r.ok).length}/${results.length} models downloaded`);
}

main().catch(console.error);
