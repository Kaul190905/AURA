import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';

// Nordic UART Service (NUS) UUIDs
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // nRF TX (Notify)
export const NUS_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // nRF RX (Write)

/**
 * AURA band wire format (firmware >= 2.0.0)
 *
 *   $<body>*<XX>\n      XX = XOR of every char of <body>, two hex digits
 *
 * Telemetry body:
 *   A,seq,bpm,ppg,tempC,tempF,mic,beat,beatCount,finger,tempValid,sos
 *
 * Event body:
 *   E,<what>[,...]      e.g. E,SOS,1,BAND
 *
 * A BLE notification is capped at the negotiated MTU, so one frame can
 * arrive split across several callbacks and two frames can arrive in one.
 * Everything below is driven off the newline, never off the callback
 * boundary, and a frame whose checksum does not match is dropped.
 */

export type SosSource = 'BAND' | 'PHONE' | 'TIMEOUT' | 'UNKNOWN';

export interface BandTelemetry {
  seq: number;
  bpm: number;
  tempC: number;
  /** Relative loudness level, not calibrated dB SPL. */
  micDb: number;
  /** 0 = none, 1 = raised on the band, 2 = raised from the phone. */
  sos: number;
}

export interface BandEvent {
  what: string;
  args: string[];
}

export interface BandListeners {
  onTelemetry?: (t: BandTelemetry) => void;
  onEvent?: (e: BandEvent) => void;
  /** Fires when the band reports an SOS that the phone did not raise. */
  onSosFromBand?: (source: SosSource) => void;
  /** Fires when an active SOS is cleared or times out. */
  onSosCleared?: (source: SosSource) => void;
  /** Raw line, for logging/debug. */
  onRawLine?: (line: string) => void;
}

function xorChecksum(body: string): number {
  let c = 0;
  for (let i = 0; i < body.length; i++) {
    /* eslint-disable-next-line no-bitwise */
    c ^= body.charCodeAt(i) & 0xff;
  }
  return c;
}

/** Wraps a command body in the same framing the firmware expects. */
export function frame(body: string): string {
  const cs = xorChecksum(body).toString(16).toUpperCase().padStart(2, '0');
  return `$${body}*${cs}\n`;
}

const MAX_BUFFER = 512;

class BleManagerService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private txSubscription: Subscription | null = null;
  private listeners: BandListeners = {};

  /** Carries the tail of a partially received frame between notifications. */
  private rxBuffer = '';

  /** Last SOS state seen from the band, so we only report transitions. */
  private lastSosState = 0;

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

  stopDeviceScan() {
    this.manager.stopDeviceScan();
  }

  async connectToDevice(
    device: Device,
    listeners: BandListeners,
    onDisconnect: () => void
  ): Promise<Device> {
    try {
      const connected = await device.connect();
      console.log('BLE connected');
      this.connectedDevice = connected;
      this.listeners = listeners;
      this.rxBuffer = '';
      this.lastSosState = 0;

      // A larger MTU keeps a whole telemetry frame in one notification.
      // Not fatal if the peer refuses — reassembly handles the split case.
      try {
        await connected.requestMTU(185);
      } catch (e) {
        console.warn('[BLE] MTU negotiation skipped:', e);
      }

      await connected.discoverAllServicesAndCharacteristics();
      console.log('NUS service discovered');
      console.log('TX characteristic discovered');

      this.manager.onDeviceDisconnected(device.id, () => {
        this.cleanup();
        onDisconnect();
      });

      this.txSubscription = connected.monitorCharacteristicForService(
        NUS_SERVICE_UUID,
        NUS_TX_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('[BLE] TX Monitor Error:', error);
            return;
          }
          if (characteristic?.value) {
            try {
              // @ts-ignore: atob is available globally in React Native JS engines
              const chunk = atob(characteristic.value);
              this.ingest(chunk);
            } catch (err) {
              console.error('[BLE] Base64 decode error:', err);
            }
          }
        }
      );
      console.log('TX notifications enabled');

      return connected;
    } catch (e) {
      this.cleanup();
      throw e;
    }
  }

  // ---------------------------------------------------------------
  // Receive path
  // ---------------------------------------------------------------

  /** Appends a notification chunk and drains every complete line in it. */
  private ingest(chunk: string) {
    console.log(`BLE RX: ${chunk}`);
    this.rxBuffer += chunk;

    // Guard against a peer that never sends a newline.
    if (this.rxBuffer.length > MAX_BUFFER) {
      this.rxBuffer = this.rxBuffer.slice(-MAX_BUFFER);
    }

    let nl = this.rxBuffer.indexOf('\n');
    while (nl !== -1) {
      const line = this.rxBuffer.slice(0, nl).trim();
      this.rxBuffer = this.rxBuffer.slice(nl + 1);
      if (line.length > 0) {
        this.handleLine(line);
      }
      nl = this.rxBuffer.indexOf('\n');
    }
  }

  private handleLine(line: string) {
    this.listeners.onRawLine?.(line);

    console.log(`FRAME: ${line}`);

    const start = line.indexOf('$');
    if (start === -1) {
      console.log('INVALID TELEMETRY FORMAT');
      return;
    }

    const star = line.lastIndexOf('*');
    if (star === -1 || star < start) {
      console.log('INVALID TELEMETRY FORMAT');
      return;
    }

    const body = line.slice(start + 1, star);
    const expected = parseInt(line.slice(star + 1, star + 3), 16);

    if (Number.isNaN(expected) || xorChecksum(body) !== expected) {
      console.log('CHECKSUM ERROR');
      return;
    }

    console.log('CHECKSUM: OK');

    const parts = body.split(',');

    if (parts[0] === 'A') {
      this.handleTelemetry(parts);
    } else if (parts[0] === 'E') {
      this.handleEvent(parts.slice(1));
    }
  }

  private handleTelemetry(p: string[]) {
    // A,seq,bpm,tempC,micDb,sos
    if (p.length < 6) {
      console.log('INVALID TELEMETRY FORMAT');
      return;
    }

    const num = (i: number) => {
      const v = parseFloat(p[i]);
      return Number.isFinite(v) ? v : 0;
    };

    const telemetry: BandTelemetry = {
      seq: num(1),
      bpm: num(2),
      tempC: num(3),
      micDb: num(4),
      sos: num(5),
    };

    console.log(`TELEMETRY:\nSEQ=${telemetry.seq}\nBPM=${telemetry.bpm}\nTEMP=${telemetry.tempC}\nMIC=${telemetry.micDb}\nSOS=${telemetry.sos}`);

    this.listeners.onTelemetry?.(telemetry);
    this.trackSos(telemetry.sos, telemetry.sos === 1 ? 'BAND' : 'PHONE');
  }

  private handleEvent(args: string[]) {
    const what = args[0] ?? '';
    this.listeners.onEvent?.({ what, args: args.slice(1) });

    if (what === 'SOS') {
      const active = args[1] === '1';
      const source = (args[2] as SosSource) ?? 'UNKNOWN';
      this.trackSos(active ? (source === 'PHONE' ? 2 : 1) : 0, source);
    }
  }

  /** Turns the repeated SOS flag into rising/falling edges. */
  private trackSos(state: number, source: SosSource) {
    if (state === this.lastSosState) {
      return;
    }

    const previous = this.lastSosState;
    this.lastSosState = state;

    if (state !== 0 && previous === 0) {
      this.listeners.onSosFromBand?.(source);
    } else if (state === 0 && previous !== 0) {
      this.listeners.onSosCleared?.(source);
    }
  }

  // ---------------------------------------------------------------
  // Transmit path
  // ---------------------------------------------------------------

  /** Sends an already-framed or raw string as-is. */
  async sendData(data: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }
    // @ts-ignore: btoa is available globally in React Native JS engines
    const base64Data = btoa(data);
    await this.connectedDevice.writeCharacteristicWithResponseForService(
      NUS_SERVICE_UUID,
      NUS_RX_UUID,
      base64Data
    );
  }

  /** Sends a command body, adding the `$...*XX\n` framing. */
  async sendCommand(body: string): Promise<void> {
    await this.sendData(frame(body));
  }

  /** Phone-raised SOS: the band vibrates and glows red until cleared. */
  async sendSOS(): Promise<void> {
    await this.sendCommand('SOS,1');
  }

  /** Clears an active SOS on the band, whoever raised it. */
  async clearSOS(): Promise<void> {
    await this.sendCommand('SOS,0');
  }

  /** Tells the band its SOS was seen, easing it to a gentler pattern. */
  async acknowledgeSOS(): Promise<void> {
    await this.sendCommand('ACK');
  }

  /** One-shot haptic nudge on the band. */
  async buzz(ms = 300): Promise<void> {
    await this.sendCommand(`BUZZ,${Math.max(1, Math.min(3000, Math.round(ms)))}`);
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
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
    if (this.txSubscription) {
      this.txSubscription.remove();
      this.txSubscription = null;
    }
    this.connectedDevice = null;
    this.listeners = {};
    this.rxBuffer = '';
    this.lastSosState = 0;
  }
}

export const bleManagerService = new BleManagerService();
