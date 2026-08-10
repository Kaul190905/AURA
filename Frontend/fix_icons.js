const fs = require('fs');
const path = require('path');
const replacements = {
  'Home': 'House',
  'Users2': 'Users',
  'CheckCircle': 'CircleCheck',
  'Waves': 'AudioWaveform',
  'MoreVertical': 'EllipsisVertical',
  'Filter': 'ListFilter',
  'Edit2': 'Pen',
};
function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [oldName, newName] of Object.entries(replacements)) {
        const importRegex = new RegExp('\\b' + oldName + '\\b', 'g');
        if (importRegex.test(content)) {
          content = content.replace(importRegex, newName);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Updated: ' + fullPath);
      }
    }
  }
}
processDir('src');
let appContent = fs.readFileSync('App.tsx', 'utf8');
let appChanged = false;
for (const [oldName, newName] of Object.entries(replacements)) {
  const importRegex = new RegExp('\\b' + oldName + '\\b', 'g');
  if (importRegex.test(appContent)) {
    appContent = appContent.replace(importRegex, newName);
    appChanged = true;
  }
}
if (appChanged) {
  fs.writeFileSync('App.tsx', appContent);
  console.log('Updated: App.tsx');
}
