const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const styles\s*=\s*StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create');
  
  // Custom injects for CaretakerProfileScreen
  if (file.includes('CaretakerProfileScreen')) {
    content = content.replace('export default function CaretakerProfileScreen() {', 'export default function CaretakerProfileScreen() {\n  const styles = getStyles();');
    content = content.replace('function ToggleRow({', 'function ToggleRow({\n  icon, label, value, onChange, highContrast, darkMode\n}: any) {\n  const styles = getStyles();\n  const {');
    // clean up the duplicate args from ToggleRow
    content = content.replace(/icon, label, value, onChange, highContrast, darkMode\n}: \{[^}]*\}\) \{\n  const styles = getStyles\(\);\n  const \{/, '');
    // Actually regex is hard, let's just do simple replacements.
  }

  // Actually, let's just use exact string replacement for the missing ones.
}
