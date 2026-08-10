const fs = require('fs');

const settings = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');

const jsxStart = settings.indexOf('<View style={styles.divider} />');
const jsxEnd = settings.indexOf('</AccItem>', jsxStart) - 27;
const colorVisionJSX = settings.substring(jsxStart, jsxEnd);

const styleStart = settings.indexOf('colorVisionSection: {');
const styleEnd = settings.indexOf('  },', settings.indexOf('previewButtonText: {', styleStart)) + 4;
const colorVisionStyles = settings.substring(styleStart, styleEnd);

let caretaker = fs.readFileSync('src/screens/CaretakerProfileScreen.tsx', 'utf8');

caretaker = caretaker.replace(/Users, Shield, Trash2, ChevronRight, Bell, Moon, Wind, Phone, MessageCircle, QrCode, Watch, Battery, Smartphone, Zap, Globe, LogOut/, 'Users, Shield, Trash2, ChevronRight, Bell, Moon, Wind, Phone, MessageCircle, QrCode, Watch, Battery, Smartphone, Zap, Globe, LogOut, Palette, Check');

caretaker = caretaker.replace('reduceMotion, setReduceMotion, navigateTo, highContrast, setHighContrast,\n    darkMode, setDarkMode\n  } = useContext(AppContext);', 'reduceMotion, setReduceMotion, navigateTo, highContrast, setHighContrast,\n    darkMode, setDarkMode, colorVisionMode, setColorVisionMode\n  } = useContext(AppContext);');

const targetJSX = `<ToggleRow
                icon={<Wind size={16} color={colors.primary} />}
                label="Reduce motion"
                value={reduceMotion}
                onChange={setReduceMotion}
                highContrast={highContrast}
                darkMode={darkMode}
              />`;
caretaker = caretaker.replace(targetJSX, targetJSX + '\n              ' + colorVisionJSX);

const targetStyle = `toggleThumbOn: {
    transform: [{ translateX: 20 }],
  },`;
caretaker = caretaker.replace(targetStyle, targetStyle + '\n  ' + colorVisionStyles);

fs.writeFileSync('src/screens/CaretakerProfileScreen.tsx', caretaker, 'utf8');
console.log('Injected successfully');
