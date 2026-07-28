const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Check if file uses StyleSheet.create
  if (!content.includes('StyleSheet.create')) return;
  // Skip AppContext and theme
  if (file.includes('AppContext.ts') || file.includes('theme.ts') || file.includes('data.ts') || file.includes('utils.ts')) return;

  // We only care if they import colors
  if (!content.includes('colors')) return;

  // Replace const styles = StyleSheet.create with const useStyles = () => StyleSheet.create
  if (content.includes('const styles = StyleSheet.create')) {
    content = content.replace(/const styles = StyleSheet\.create/g, 'const useStyles = () => StyleSheet.create');
    
    // Find the main component function (e.g. export default function Name() { or export function Name() { )
    // We will inject const styles = useStyles(); at the top.
    
    // Simple regex for function declarations that are exported
    const funcRegex = /(export (?:default )?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/g;
    
    content = content.replace(funcRegex, (match) => {
      return match + '\n  const styles = useStyles();';
    });

    // Also handle const Component = ({...}) => {
    const arrowRegex = /(export (?:default )?(?:const|let|var)\s+[A-Za-z0-9_]+\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>\s*\{)/g;
    content = content.replace(arrowRegex, (match) => {
      return match + '\n  const styles = useStyles();';
    });
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Refactored ' + file);
  }
});
