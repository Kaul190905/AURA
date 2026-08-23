# AURA Band firmware

`AURA_Band/AURA_Band.ino` — nRF52840 wearable: PPG heart rate, skin temperature,
ambient noise, and two-way SOS over BLE.

Verified to compile against **Seeeduino:nrf52 1.1.13**, board
`Seeed XIAO nRF52840 Sense` (17% flash, 6% RAM).

## Libraries

| Library | Used for |
|---|---|
| SparkFun MAX3010x Pulse and Proximity Sensor Library | MAX30102 PPG |
| Adafruit TMP117 + Adafruit Unified Sensor + Adafruit BusIO | temperature |
| Bluefruit (bundled with the core) | BLE / Nordic UART |
| PDM (bundled with the core) | microphone |

## Wiring

| Signal | Pin | Notes |
|---|---|---|
| MAX30102 | SDA / SCL | I²C @ 400 kHz |
| TMP117 | SDA / SCL | I²C @ 400 kHz |
| SOS button | `D0` → GND | internal pull-up, active LOW |
| Vibration motor | `D1` | **through an NPN/MOSFET + flyback diode**, never straight off the GPIO |
| RGB LED | on-board | active low on XIAO |

Change `PIN_SOS_BUTTON` / `PIN_VIBRATION` at the top of the sketch to match your board.

## SOS behaviour

- **Short press** on the band → BLE alert to the phone; phone rings (repeating
  vibration + alert dialog) and auto-sends `ACK`, which relaxes the band's buzz pattern.
- **Hold 2 s** on the band → cancels an active alert.
- **Phone sends `SOS,1`** → band vibrates and breathes red until `SOS,0`.
- Any alert auto-stops after 2 minutes so a forgotten SOS cannot flatten the battery.

The status LED is otherwise a dim blue blip while advertising, dim green while connected.

## Wire protocol (Nordic UART, `6e400001-…`)

Every message is one line:

```
$<body>*<XX>\n        XX = XOR of every char of <body>, 2 hex digits
```

Frames are read newline-to-newline and dropped on checksum mismatch, so a
notification split across MTU boundaries or a lost packet cannot desync the parser.

**Band → phone, telemetry every 500 ms:**

```
A,seq,bpm,ppg,tempC,tempF,micDb,beat,beatCount,finger,tempValid,sos
```

`sos`: 0 none · 1 raised on band · 2 raised from phone.
`micDb` is a relative loudness level (20·log10 RMS), **not** calibrated dB SPL.

**Band → phone, events:** `E,SOS,1,BAND` · `E,SOS,0,PHONE` · `E,ACK,1` · `E,PONG` · `E,ID,…`

**Phone → band:** `SOS,1` · `SOS,0` · `ACK` · `BUZZ,<ms>` · `PING` · `ID`
(the `$…*XX` framing is optional on inbound commands; the verb is case-insensitive)

The phone side lives in [`frontend/src/services/bleManagerService.ts`](../frontend/src/services/bleManagerService.ts).

## Known limitation: `DROP` climbs

The serial status line ends with `DROP:<n>` — PDM microphone blocks the main loop
was too slow to collect. It climbs by roughly 20 every 500 ms, and that is expected.

`particleSensor.getIR()` calls the SparkFun library's `safeCheck()`, which spins on
`delay(1)` until the sensor FIFO produces a sample. At `sampleAverage=4` and 100 Hz
the FIFO emits at 25 Hz, so the call blocks the loop ~40 ms per pass while a 512-byte
mic block lands every 16 ms. Measured on hardware: ~65 blocks/sec arrive, ~26 are
collected.

Consequences: the noise level is computed from roughly 40% of the audio (fine for a
loudness average), and the SOS button is polled at ~25 Hz (still far inside its 30 ms
debounce). Heart rate is unaffected — the FIFO rate is the limit either way.

The obvious fix — `check()` plus a `getFIFOIR()`/`nextSample()` drain — was tried on
hardware and **hung `loop()`**; root cause not identified, so it was reverted. Do not
reapply it without testing on a real board.

## Flashing

`arduino-cli upload` does **not** recompile — it flashes the last cached build. Always
use `compile -u`:

```
arduino-cli compile -u -p COM13 --fqbn Seeeduino:nrf52:xiaonRF52840Sense firmware/AURA_Band
```

Close any serial monitor first, or the upload fails with `Access is denied` on the
bootloader's port.
