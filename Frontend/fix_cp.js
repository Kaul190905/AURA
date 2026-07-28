const fs = require('fs');

let content = fs.readFileSync('src/screens/CaretakerProfileScreen.tsx', 'utf8');
content = content.replace('export default function CaretakerProfileScreen() {', 'export default function CaretakerProfileScreen() {\n  const styles = getStyles();');
content = content.replace('function ToggleRow({', 'function ToggleRow({\n  icon, label, value, onChange, highContrast, darkMode\n}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; highContrast?: boolean, darkMode?: boolean }) {\n  const styles = getStyles();');
// Since I manually replaced the entire signature, I MUST delete the old signature which spans lines
const regexSig = /icon, label, value, onChange, highContrast, darkMode\n\}: \{ icon: React\.ReactNode; label: string; value: boolean; onChange: \(v: boolean\) => void; highContrast\?: boolean, darkMode\?: boolean \} \) \{/;
content = content.replace(/icon, label, value, onChange, highContrast, darkMode\r?\n\}:\s*\{\s*icon:\s*React\.ReactNode;\s*label:\s*string;\s*value:\s*boolean;\s*onChange:\s*\(v:\s*boolean\)\s*=>\s*void;\s*highContrast\?:\s*boolean,\s*darkMode\?:\s*boolean\s*\}\)\s*\{/g, '');
content = content.replace(/const styles = StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create');
fs.writeFileSync('src/screens/CaretakerProfileScreen.tsx', content, 'utf8');
