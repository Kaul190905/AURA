const fs = require('fs');
const path = require('path');

const files = [
  'src/components/Accordion.tsx',
  'src/components/AuraAIPanel.tsx',
  'src/components/DetailedInsightsModal.tsx',
  'src/screens/CaretakerAnalysisScreen.tsx',
  'src/components/Header.tsx',
  'src/components/LiveAlertModal.tsx',
  'src/screens/CaretakerDashboardScreen.tsx',
  'src/components/NotificationModal.tsx',
  'src/screens/CaretakerGateScreen.tsx',
  'src/screens/CaretakerProfileScreen.tsx',
  'src/screens/CrisisModeScreen.tsx',
  'src/screens/HistoryInsightsScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/screens/PlansScreen.tsx',
  'src/screens/ProfileSetupScreen.tsx',
  'src/screens/RecoverySummaryScreen.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/screens/SpeechDiaryScreen.tsx',
  'src/screens/StrategyLibraryScreen.tsx',
  'src/screens/WearableScreen.tsx',
  'src/screens/WelcomeScreen.tsx',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (file.includes('SettingsScreen.tsx')) {return;} // I already manually fixed this one!

  if (!content.includes('StyleSheet.create')) {return;}

  // 1. Replace const styles = StyleSheet.create
  content = content.replace(/const styles\s*=\s*StyleSheet\.create/g, 'const getStyles = () => StyleSheet.create');

  // 2. Inject const styles = getStyles(); into components
  // We match function components (export function, export default function, function)
  // that have uppercase names, or start with 'function '.

  // Function declaration:
  const funcRegex = /((?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*|[a-z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{)/g;
  content = content.replace(funcRegex, (match, p1, name) => {
    // Only inject if it's a component or something that likely uses styles
    // Exclude basic util functions that don't use styles
    return p1 + '\n  const styles = getStyles();';
  });

  // Arrow function components: const X = ({}) => {
  const arrowRegex = /((?:export\s+(?:default\s+)?)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>\s*\{)/g;
  content = content.replace(arrowRegex, (match, p1, name) => {
    return p1 + '\n  const styles = getStyles();';
  });

  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed ' + file);
});
