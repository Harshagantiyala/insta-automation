const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(__dirname, function(filePath) {
  if (!filePath.endsWith('.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace text colors
  content = content.replace(/['"]#fff['"]/g, "'var(--text-primary)'");
  content = content.replace(/['"]#f8fafc['"]/g, "'var(--text-primary)'");
  content = content.replace(/['"]#e8eaf0['"]/g, "'var(--text-primary)'");
  content = content.replace(/['"]#e2e8f0['"]/g, "'var(--text-primary)'");
  content = content.replace(/['"]rgba\(232,\s*234,\s*240,\s*0\.\d+\)['"]/g, "'var(--text-secondary)'");
  
  // Replace glass overlays globally (whether in background, border, boxShadow, etc)
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.0[1234]\)/g, "var(--overlay-light)");
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.0[56]\)/g, "var(--overlay-medium)");
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.0[789]\)/g, "var(--overlay-strong)");
  content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1[0-9]?\)/g, "var(--overlay-strong)");
  
  // Replace dark backgrounds used for modals/cards
  content = content.replace(/rgba\(9,\s*9,\s*22,\s*0\.\d+\)/g, "var(--bg-modal)");
  content = content.replace(/rgba\(11,\s*11,\s*26,\s*0\.\d+\)/g, "var(--bg-modal)");
  content = content.replace(/rgba\(5,\s*5,\s*15,\s*0\.\d+\)/g, "var(--bg-modal)");
  content = content.replace(/rgba\(10,\s*10,\s*24,\s*0\.\d+\)/g, "var(--bg-modal)"); // used in sidebar
  content = content.replace(/rgba\(13,\s*13,\s*30,\s*0\.\d+\)/g, "var(--panel-glass)");
  content = content.replace(/rgba\(3,\s*3,\s*8,\s*0\.\d+\)/g, "var(--bg-space)");
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', path.basename(filePath));
  }
});
