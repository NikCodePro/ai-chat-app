import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';

LogBox.ignoreLogs([
  '`new NativeEventEmitter()`',
  'Expo AV has been deprecated',
]);

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
