import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Register the Notifee foreground service task
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // This promise will stay unresolved to keep the service alive
    // until notifee.stopForegroundService() is called upon disconnect
  });
});

// Nordic UART Service (NUS) UUIDs
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // nRF TX (Notify)
export const NUS_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // nRF RX (Write)

class BleManagerService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private txSubscription: Subscription | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android') {
      const apiLevel = parseInt(Platform.Version.toString(), 10);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'AURA needs access to your location to scan for BLE devices.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }

    return false;
  }

  startDeviceScan(
    onDeviceFound: (device: Device) => void,
    onError: (error: any) => void
  ) {
    this.manager.startDeviceScan(
      null, // Scan for all devices, filter by name in callback
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          onError(error);
          return;
        }
        if (device) {
          onDeviceFound(device);
        }
      }
    );
  }

  private async startForegroundService() {
    if (Platform.OS !== 'android') return;
    try {
      const channelId = await notifee.createChannel({
        id: 'ble-background-service',
        name: 'Bluetooth Background Service',
        importance: AndroidImportance.LOW,
      });

      await notifee.displayNotification({
        id: 'aura-ble-service',
        title: 'AURA is connected',
        body: 'Monitoring your vitals via Bluetooth.',
        android: {
          channelId,
          asForegroundService: true,
          ongoing: true,
          color: '#FF4500',
        },
      });
    } catch (e) {
      console.warn('[BLE] Error starting foreground service:', e);
    }
  }

  private async stopForegroundService() {
    if (Platform.OS !== 'android') return;
    try {
      await notifee.stopForegroundService();
    } catch (e) {
      console.warn('[BLE] Error stopping foreground service:', e);
    }
  }

  stopDeviceScan() {
    this.manager.stopDeviceScan();
  }

  async connectToDevice(
    device: Device,
    onDataReceived: (data: string) => void,
    onDisconnect: () => void
  ): Promise<Device> {
    try {
      const connected = await device.connect();
      this.connectedDevice = connected;

      if (Platform.OS === 'android') {
        try {
          await connected.requestMTU(512);
        } catch (e) {
          console.warn('[BLE] MTU request failed:', e);
        }
      }

      // Start the Notifee foreground service to keep BLE alive in background
      await this.startForegroundService();

      // Discover services and characteristics
      await connected.discoverAllServicesAndCharacteristics();

      // Monitor disconnects
      this.manager.onDeviceDisconnected(device.id, () => {
        this.cleanup();
        onDisconnect();
      });

      // Subscribe to TX characteristic (notifications from nRF)
      this.txSubscription = connected.monitorCharacteristicForService(
        NUS_SERVICE_UUID,
        NUS_TX_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('[BLE] TX Monitor Error:', error);
            return;
          }
          if (characteristic?.value) {
            const rawData = Buffer.from(characteristic.value, 'base64').toString('ascii');
            onDataReceived(rawData);
          }
        }
      );

      return connected;
    } catch (e) {
      this.cleanup();
      throw e;
    }
  }

  async sendData(data: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }
    const base64Data = Buffer.from(data).toString('base64');
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      NUS_SERVICE_UUID,
      NUS_RX_UUID,
      base64Data
    );
  }

  async disconnect() {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (e) {
        console.warn('[BLE] Disconnect error:', e);
      }
    }
    this.cleanup();
  }

  private cleanup() {
    this.stopForegroundService();
    if (this.txSubscription) {
      this.txSubscription.remove();
      this.txSubscription = null;
    }
    this.connectedDevice = null;
  }
}

export const bleManagerService = new BleManagerService();
