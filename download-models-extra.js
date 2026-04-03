/**
 * Download additional wibu/anime Live2D models
 * These are Cubism 2 format (.model.json) and one Cubism 3 (Senko)
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'public', 'models');

const MODELS = [
  // Cubism 3 (moc3)
  {
    name: 'Senko',
    baseUrl: 'https://raw.githubusercontent.com/oh-my-live2d/live2d-models/main/models/Senko_Normals/',
    modelFile: 'senko.model3.json',
  },
  // Cubism 2 models from xiazeyu
  {
    name: 'Miku',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-miku/assets/',
    modelFile: 'miku.model.json',
  },
  {
    name: 'Koharu',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-koharu/assets/',
    modelFile: 'koharu.model.json',
  },
  {
    name: 'Hijiki',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-hijiki/assets/',
    modelFile: 'hijiki.model.json',
  },
  {
    name: 'Tororo',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-tororo/assets/',
    modelFile: 'tororo.model.json',
  },
  {
    name: 'Chitose',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-chitose/assets/',
    modelFile: 'chitose.model.json',
  },
  {
    name: 'Unitychan',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-unitychan/assets/',
    modelFile: 'unitychan.model.json',
  },
  {
    name: 'Hibiki',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-hibiki/assets/',
    modelFile: 'hibiki.model.json',
  },
  {
    name: 'Izumi',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-izumi/assets/',
    modelFile: 'izumi.model.json',
  },
  {
    name: 'Z16',
    baseUrl: 'https://cdn.jsdelivr.net/gh/xiazeyu/live2d-widget-models@latest/packages/live2d-widget-model-z16/assets/',
    modelFile: 'z16.model.json',
  },
  // oh-my-live2d anime models
  {
    name: 'Rem',
    baseUrl: 'https://raw.githubusercontent.com/oh-my-live2d/live2d-models/main/models/rem/',
    modelFile: 'model.json',
  },
  {
    name: 'HK416',
    baseUrl: 'https://raw.githubusercontent.com/oh-my-live2d/live2d-models/main/models/HK416-1-normal/',
    modelFile: 'model.json',
  },
  {
    name: 'Umaru',
    baseUrl: 'https://raw.githubusercontent.com/oh-my-live2d/live2d-models/main/models/umaru/',
    modelFile: 'model.json',
  },
  {
    name: 'Platelet',
    baseUrl: 'https://raw.githubusercontent.com/oh-my-live2d/live2d-models/main/models/platelet/',
    modelFile: 'model.json',
  },
  {
    name: 'Kar98k',
    baseUrl: 'https://raw.githubusercontent.com/oh-my-live2d/live2d-models/main/models/Kar98k-normal/',
    modelFile: 'model.json',
  },
  // fghrsh Neptunia models
  {
    name: 'Neptune',
    baseUrl: 'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api@latest/model/HyperdimensionNeptunia/neptune_classic/',
    modelFile: 'index.json',
  },
  {
    name: 'Noire',
    baseUrl: 'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api@latest/model/HyperdimensionNeptunia/noir/',
    modelFile: 'index.json',
  },
  {
    name: 'Pio',
    baseUrl: 'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api@latest/model/Potion-Maker/Pio/',
    modelFile: 'index.json',
  },
  {
    name: 'Tia',
    baseUrl: 'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api@latest/model/Potion-Maker/Tia/',
    modelFile: 'index.json',
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

function collectFilesCubism2(modelJson) {
  const files = new Set();
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
  return files;
}

function collectFilesCubism3(modelJson) {
  const files = new Set();
  const fg = modelJson.FileReferences;
  if (!fg) return files;
  if (fg.Moc) files.add(fg.Moc);
  if (fg.Physics) files.add(fg.Physics);
  if (fg.Pose) files.add(fg.Pose);
  if (fg.DisplayInfo) files.add(fg.DisplayInfo);
  if (fg.UserData) files.add(fg.UserData);
  if (Array.isArray(fg.Textures)) fg.Textures.forEach(t => files.add(t));
  if (fg.Expressions) fg.Expressions.forEach(e => { if (e.File) files.add(e.File); });
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
  return files;
}

async function downloadModel(model) {
  console.log(`\n📦 Downloading: ${model.name}`);
  const modelDir = path.join(MODELS_DIR, model.name);
  const modelUrl = model.baseUrl + model.modelFile;

  try {
    const data = await downloadFile(modelUrl, path.join(modelDir, model.modelFile));
    const modelJson = JSON.parse(data.toString('utf8'));

    const isCubism2 = model.modelFile.endsWith('.model.json') || model.modelFile === 'index.json';
    const files = isCubism2 ? collectFilesCubism2(modelJson) : collectFilesCubism3(modelJson);

    console.log(`  Found ${files.size} referenced files`);

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
  console.log('=== Additional Wibu Models Downloader ===\n');
  fs.mkdirSync(MODELS_DIR, { recursive: true });

  const results = [];
  for (const model of MODELS) {
    const ok = await downloadModel(model);
    results.push({ name: model.name, ok });
  }

  console.log('\n=== Summary ===');
  results.forEach(r => console.log(`${r.ok ? '✅' : '❌'} ${r.name}`));
  console.log(`\nTotal: ${results.filter(r => r.ok).length}/${results.length}`);
}

main().catch(console.error);
