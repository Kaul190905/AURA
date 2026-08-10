const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`> ${command}`);
    // Inherit stdio to stream output directly to terminal
    execSync(command, { stdio: 'inherit', cwd });
    return true;
  } catch (error) {
    console.error(`\n[ERROR] Command failed: ${command}`);
    return false;
  }
}

function runCommandSilent(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('=== AURA Mobile USB Deployment ===\n');

  // 1. Check for ADB and connected devices
  console.log('Checking for connected USB devices...');
  const adbOutput = runCommandSilent('adb devices');

  if (!adbOutput) {
    console.error('\n[ERROR] ADB is not installed or not available in PATH.');
    console.error('Please ensure Android Platform Tools are installed and added to your system PATH.');
    process.exit(1);
  }

  const lines = adbOutput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // First line is "List of devices attached"
  const devices = lines.slice(1);

  if (devices.length === 0) {
    console.error('\n[ERROR] No Android devices connected.');
    console.error('Please plug in your device via USB and ensure "USB Debugging" is enabled in Developer Options.');
    process.exit(1);
  }

  const validDevices = devices.filter(d => d.endsWith('\tdevice'));
  const unauthorizedDevices = devices.filter(d => d.endsWith('\tunauthorized'));

  if (validDevices.length === 0) {
    if (unauthorizedDevices.length > 0) {
      console.error('\n[ERROR] Device found, but it is UNAUTHORIZED.');
      console.error('Please unlock your Android device and accept the "Allow USB debugging" RSA fingerprint prompt.');
    } else {
      console.error('\n[ERROR] Connected devices are not in a valid state for deployment.');
    }
    process.exit(1);
  }

  const targetDevice = validDevices[0].split('\t')[0];
  console.log(`Target device found: ${targetDevice}\n`);

  // 2. Build the app
  console.log('Building Android app (assembleDebug)...');
  const androidDir = path.join(__dirname, '..', 'android');

  const gradlewCmd = os.platform() === 'win32' ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';
  const buildSuccess = runCommand(gradlewCmd, androidDir);

  if (!buildSuccess) {
    console.error('\n[ERROR] Android build failed. See logs above.');
    process.exit(1);
  }

  // 3. Install the APK
  console.log('\nInstalling APK to device (reinstall enabled)...');
  const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

  if (!fs.existsSync(apkPath)) {
    console.error(`\n[ERROR] APK not found at expected path: ${apkPath}`);
    process.exit(1);
  }

  const installSuccess = runCommand(`adb -s ${targetDevice} install -r "${apkPath}"`);
  if (!installSuccess) {
    console.error('\n[ERROR] Failed to install APK via ADB.');
    process.exit(1);
  }

  // 4. Launch the App
  console.log('\nLaunching app on device...');
  // The app package and main activity name
  const packageName = 'com.aura.mobile';
  const activityName = '.MainActivity';

  const launchSuccess = runCommand(`adb -s ${targetDevice} shell am start -n ${packageName}/${activityName}`);

  if (!launchSuccess) {
    console.error('\n[ERROR] Failed to launch the app.');
    process.exit(1);
  }

  console.log('\n=== Deployment Successful! ===');
}

main();
