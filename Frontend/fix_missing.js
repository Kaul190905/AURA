const fs = require('fs');

const files = [
  'src/screens/CaretakerProfileScreen.tsx',
  'src/screens/PlansScreen.tsx',
  'src/screens/SpeechDiaryScreen.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/const styles\s*=\s*StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create');
  
  if (file.includes('CaretakerProfileScreen')) {
    content = content.replace('export default function CaretakerProfileScreen() {', 'export default function CaretakerProfileScreen() {\n  const styles = getStyles();');
    content = content.replace('function ToggleRow({', 'function ToggleRow({\n  icon, label, value, onChange, highContrast, darkMode\n}: any) {\n  const styles = getStyles();\n  const {');
    // We must remove the duplicate arguments:
    content = content.replace(/icon, label, value, onChange, highContrast, darkMode\n}: \{ icon: React\.ReactNode; label: string; value: boolean; onChange: \(v: boolean\) => void; highContrast\?: boolean, darkMode\?: boolean \}\) \{/, '');
  }

  if (file.includes('PlansScreen')) {
    content = content.replace('export default function PlansScreen() {', 'export default function PlansScreen() {\n  const styles = getStyles();');
    content = content.replace('function PlanCard({', 'function PlanCard({ p }: { p: any }) {\n  const styles = getStyles();\n  const {');
    content = content.replace(/p\n}: \{ p: Plan \} \) \{/, '');
  }

  if (file.includes('SpeechDiaryScreen')) {
    content = content.replace('export default function SpeechDiaryScreen() {', 'export default function SpeechDiaryScreen() {\n  const styles = getStyles();');
    content = content.replace('function DiaryEntry({', 'function DiaryEntry({ entry }: { entry: any }) {\n  const styles = getStyles();\n  const {');
    content = content.replace(/entry\n}: \{ entry: any \} \) \{/, '');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed ' + file);
});
