const fs = require('fs');
const file = 'src/components/DetailedInsightsModal.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const styles\s*=\s*StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create');
const funcRegex = /((?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*|[a-z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{)/g;
content = content.replace(funcRegex, (match, p1, name) => p1 + '\n  const styles = getStyles();');
fs.writeFileSync(file, content, 'utf8');
