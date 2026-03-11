const fs = require('fs');
const path = require('path');
const marked = require('marked');
const htmlMinifier = require('html-minifier-terser');

// -------------------- 配置项 --------------------
const SOURCE_DIR = __dirname;
const TARGET_DIR = path.join(SOURCE_DIR, '../');
const TEMPLATE_FILE = path.join(SOURCE_DIR, 'template.html');

const MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
  removeEmptyAttributes: true,
  keepClosingSlash: true
};

// -------------------- 工具函数 --------------------
function mkdirp(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function extractTitle(mdContent) {
  const firstLine = mdContent.split('\n')[0] || '';
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

async function minifyHtml(filePath) {
  try {
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    const minifiedHtml = await htmlMinifier.minify(originalHtml, MINIFY_OPTIONS);
    fs.writeFileSync(filePath, minifiedHtml);
    console.log(`压缩成功: ${path.relative(SOURCE_DIR, filePath)}`);
  } catch (err) {
    console.error(`压缩失败: ${filePath}`, err);
  }
}

function processMarkdownFile(mdPath) {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const title = extractTitle(mdContent);
  
  const lines = mdContent.split('\n');
  const contentWithoutFirstLine = lines.slice(1).join('\n');
  const htmlBody = marked.parse(contentWithoutFirstLine);

  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const finalHtml = template
    .replace(/<!--\s*TITLE\s*-->/g, title)
    .replace(/<!--\s*CONTENT\s*-->/g, htmlBody);

  const fileName = path.basename(mdPath, '.md');
  const targetFolder = path.join(TARGET_DIR, fileName);
  const targetHtml = path.join(targetFolder, 'index.html');

  mkdirp(targetFolder);
  fs.writeFileSync(targetHtml, finalHtml);
  console.log(`生成: ${path.relative(SOURCE_DIR, targetHtml)}`);
  return targetHtml;
}

// -------------------- 主流程 --------------------
async function main() {
  if (!fs.existsSync(TEMPLATE_FILE)) {
    throw new Error(`模板文件不存在: ${TEMPLATE_FILE}`);
  }

  mkdirp(TARGET_DIR);

  const mdFiles = fs.readdirSync(SOURCE_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(SOURCE_DIR, file));

  const htmlFiles = mdFiles.map(processMarkdownFile);
  await Promise.all(htmlFiles.map(minifyHtml));

  console.log(`
    处理完成：
    - 共生成 ${mdFiles.length} 篇文章
    - 压缩 ${htmlFiles.length} 个 HTML 文件
  `);
}

main().catch(err => console.error('运行出错:', err));