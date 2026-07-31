const fs = require('fs');

function fix(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (let r of replacements) {
    content = content.replace(r[0], r[1]);
  }
  fs.writeFileSync(file, content, 'utf8');
}

fix('src/screens/CaretakerProfileScreen.tsx', [
  [/const styles = StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create'],
  ['export default function CaretakerProfileScreen() {', 'export default function CaretakerProfileScreen() {\n  const styles = getStyles();'],
  ['function ToggleRow({\n  icon, label, value, onChange, highContrast, darkMode\n}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; highContrast?: boolean, darkMode?: boolean }) {', 'function ToggleRow({\n  icon, label, value, onChange, highContrast, darkMode\n}: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; highContrast?: boolean, darkMode?: boolean }) {\n  const styles = getStyles();']
]);

fix('src/screens/PlansScreen.tsx', [
  [/const styles = StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create'],
  ['export default function PlansScreen({ onBack }: { onBack: () => void }) {', 'export default function PlansScreen({ onBack }: { onBack: () => void }) {\n  const styles = getStyles();'],
  ['function PlanCard({ p }: { p: Plan }) {', 'function PlanCard({ p }: { p: Plan }) {\n  const styles = getStyles();']
]);

fix('src/screens/SpeechDiaryScreen.tsx', [
  [/const styles = StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create'],
  ['export default function SpeechDiaryScreen({ onBack }: { onBack: () => void }) {', 'export default function SpeechDiaryScreen({ onBack }: { onBack: () => void }) {\n  const styles = getStyles();'],
  ['function DiaryEntry({ entry }: { entry: any }) {', 'function DiaryEntry({ entry }: { entry: any }) {\n  const styles = getStyles();']
]);

console.log('Fixed exactly.');
