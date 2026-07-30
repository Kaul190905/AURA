/**
 * @format
 */

<<<<<<< HEAD
=======
// ⚠️ MUST be imported first — fixes Supabase "Cannot assign to property 'protocol'" error in React Native
import 'react-native-url-polyfill/auto';

>>>>>>> origin/srinath-dev
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
