// =====================================================
//  AURA BAND  --  nRF52840 wearable firmware
// =====================================================
//
//  Sensors : MAX30102 (PPG / heart rate)
//            TMP117   (skin temperature)
//            PDM mic  (ambient noise, relative dB)
//
//  Link    : BLE Nordic UART Service ("AURA band")
//
//  SOS     : hardware button  -> alert phone
//            phone command    -> vibrate + red LED
//
//  Target  : Seeed XIAO nRF52840 (Sense) / Adafruit nRF52
//            Arduino core: Adafruit nRF52 or Seeed nRF52
//
// =====================================================

#include <Wire.h>
#include <MAX30105.h>
#include <heartRate.h>

#include <bluefruit.h>
#include <PDM.h>

#include <Adafruit_TMP117.h>
#include <Adafruit_Sensor.h>

#include <math.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>


#define FW_VERSION      "2.0.0"
#define DEVICE_NAME     "AURA band"
#define SERIAL_BAUD     115200


// =====================================================
// PIN MAP  --  adjust to your wiring
// =====================================================

// D0 / D1 are XIAO names. On boards that do not define them,
// fall back to plain pin numbers -- change to suit your wiring.
#ifndef D0
  #define D0 2
#endif
#ifndef D1
  #define D1 3
#endif

// SOS push button: wire between this pin and GND.
// The internal pull-up is used, so the pin reads LOW when pressed.
#define PIN_SOS_BUTTON      D0

// Vibration motor: drive through an NPN / logic-level MOSFET,
// never straight from the GPIO. HIGH = motor on.
#define PIN_VIBRATION       D1
#define VIBRATION_ON        HIGH
#define VIBRATION_OFF       LOW


// On-board RGB LED. The XIAO nRF52840 and most Adafruit nRF52
// boards define these; the fallbacks keep the sketch compiling
// on boards that only have a single LED.
#ifndef LED_RED
  #define LED_RED    LED_BUILTIN
#endif
#ifndef LED_GREEN
  #define LED_GREEN  LED_BUILTIN
#endif
#ifndef LED_BLUE
  #define LED_BLUE   LED_BUILTIN
#endif

// LED_STATE_ON is 0 on active-low boards (XIAO nRF52840).
#ifndef LED_STATE_ON
  #define LED_STATE_ON  0
#endif
#define LED_ACTIVE_LOW  (LED_STATE_ON == 0)


// =====================================================
// SENSOR OBJECTS
// =====================================================

MAX30105        particleSensor;
Adafruit_TMP117 tmp117;
BLEUart         bleuart;


// Sensors are probed, not assumed. A missing TMP117 must never
// stop the band from reporting heart rate or raising an SOS.
bool ppgOk  = false;
bool tempOk = false;
bool micOk  = false;


// =====================================================
// PPG  /  SIGNAL CONDITIONING
// =====================================================

const long  MIN_IR_VALUE   = 50000;   // finger-present threshold

const float BASELINE_ALPHA = 0.01f;   // DC tracker
const float LOWPASS_ALPHA  = 0.15f;   // output smoothing
const float MAX_JUMP       = 1200.0f; // spike gate
const float SPIKE_RECOVERY = 0.08f;

#define FILTER_SIZE 5

long  irBuffer[FILTER_SIZE];
int   irBufferIndex   = 0;
long  irSum           = 0;
int   irSamplesFilled = 0;          // < FILTER_SIZE => buffer still priming

float baseline        = 0.0f;
bool  baselinePrimed  = false;

float lastCleanSignal = 0.0f;
float filteredPPG     = 0.0f;
float ppgValue        = 0.0f;

bool  fingerDetected  = false;


// =====================================================
// HEART RATE
// =====================================================

const byte  RATE_SIZE = 8;
const float MIN_BPM   = 40.0f;
const float MAX_BPM   = 200.0f;

byte  rates[RATE_SIZE];
byte  rateSpot   = 0;
byte  rateCount  = 0;               // valid entries in rates[]

float instantBPM = 0.0f;
float displayBPM = 0.0f;
int   beatAverage = 0;

unsigned long lastBeatTime = 0;
unsigned long beatCount    = 0;

// checkForBeat() keeps internal state we cannot reset from here,
// so beats are discarded for a moment after the finger returns.
const unsigned long BEAT_SETTLE_MS = 1500;
unsigned long fingerSince = 0;

int           beatSignal      = 0;
unsigned long beatSignalStart = 0;
const unsigned long BEAT_PULSE_DURATION = 100;


// =====================================================
// TEMPERATURE
// =====================================================

float temperatureC = 0.0f;
float temperatureF = 0.0f;
bool  temperatureValid = false;

unsigned long lastTemperatureRead   = 0;
unsigned long lastTemperatureOk     = 0;
bool          temperatureEverRead   = false;

const unsigned long TEMPERATURE_INTERVAL = 500;
const unsigned long TEMPERATURE_STALE_MS = 3000;   // no fresh sample => invalid


// =====================================================
// MICROPHONE
// =====================================================
//
// The PDM callback runs in interrupt context. It owns pdmBuffer;
// the main loop copies out of it with the PDM interrupt masked,
// then works on its own copy. Without that copy the RMS maths
// can read a buffer that is being rewritten underneath it.

#define PDM_BUFFER_SAMPLES 256

static int16_t         pdmBuffer[PDM_BUFFER_SAMPLES];   // ISR owned
static volatile int    pdmSampleCount = 0;              // ISR -> loop
static volatile uint32_t pdmDropped   = 0;   // blocks the loop was too slow to take
static uint32_t          bleTxCount   = 0;   // telemetry frames written to BLE
static uint32_t          bleTxFail    = 0;   // writes refused by the BLE stack

static int16_t         micWork[PDM_BUFFER_SAMPLES];     // loop owned

float micRMS = 0.0f;
float micDB  = 0.0f;   // relative dBFS-style level, NOT calibrated dB SPL


// =====================================================
// SOS  /  ALERT STATE
// =====================================================

enum AlertSource
{
    ALERT_NONE  = 0,
    ALERT_BAND  = 1,   // user pressed the button on the band
    ALERT_PHONE = 2    // mobile app asked the band to alert
};

AlertSource   alertSource     = ALERT_NONE;
bool          alertAcked      = false;      // phone acknowledged a band SOS
unsigned long alertStarted    = 0;

const unsigned long ALERT_MAX_MS = 120000;  // auto-stop after 2 min


// Button
const unsigned long BUTTON_DEBOUNCE_MS   = 30;
const unsigned long BUTTON_LONGPRESS_MS  = 2000;   // hold to cancel

bool          buttonStable       = false;   // true = pressed
bool          buttonLastRaw      = false;
unsigned long buttonLastChange   = 0;
unsigned long buttonPressedAt    = 0;
bool          longPressHandled   = false;


// Vibration (non-blocking pattern player)
bool          vibrating        = false;
unsigned long vibrationPhaseAt = 0;
unsigned long vibrationUntil   = 0;         // one-shot buzz deadline, 0 = pattern mode

const unsigned long VIB_ON_MS  = 400;
const unsigned long VIB_OFF_MS = 350;


// =====================================================
// BLE
// =====================================================

bool          bleWasConnected = false;
unsigned long lastBLESend     = 0;
uint32_t      frameSeq        = 0;

const unsigned long BLE_SEND_INTERVAL = 500;

#define RX_LINE_MAX 96
char   rxLine[RX_LINE_MAX];
size_t rxLineLen = 0;


// =====================================================
// SAMPLING
// =====================================================

unsigned long lastSample = 0;
const unsigned long SAMPLE_INTERVAL = 10;   // 100 Hz


// =====================================================
// FORWARD DECLARATIONS
// =====================================================

void setupBLE();
void printBanner();
void processPPG();
void resetPPGChain();
void resetBPM();

void readTemperature(unsigned long now);
void serviceMicrophone();
void processMicrophone(const int16_t *samples, int count);
void onPDMdata();

void serviceButton();
void serviceAlert();
void startAlert(AlertSource source);
void stopAlert();
void buzz(unsigned long ms);

void setLed(uint8_t r, uint8_t g, uint8_t b);
void serviceStatusLed();

void serviceBLEReceive();
void handleCommand(char *line);
void sendTelemetry();
void sendEvent(const char *body);
void sendFrame(const char *body);

void printData();


// =====================================================
// SETUP
// =====================================================

void setup()
{
    Serial.begin(SERIAL_BAUD);
    delay(1500);

    Serial.println();
    Serial.println("======================================");
    Serial.println("          AURA BAND STARTING");
    Serial.println("          firmware " FW_VERSION);
    Serial.println("======================================");


    // -------------------------------------------------
    // GPIO
    // -------------------------------------------------

    pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);

    pinMode(PIN_VIBRATION, OUTPUT);
    digitalWrite(PIN_VIBRATION, VIBRATION_OFF);

    pinMode(LED_RED,   OUTPUT);
    pinMode(LED_GREEN, OUTPUT);
    pinMode(LED_BLUE,  OUTPUT);
    analogWriteResolution(8);
    setLed(0, 0, 0);


    // -------------------------------------------------
    // I2C
    // -------------------------------------------------

    Wire.begin();
    Wire.setClock(400000);
    delay(100);


    // -------------------------------------------------
    // MAX30102
    // -------------------------------------------------

    Serial.print("MAX30102 ... ");

    if (particleSensor.begin(Wire, I2C_SPEED_FAST))
    {
        particleSensor.setup(
            60,     // LED brightness
            4,      // sample average
            2,      // Red + IR
            100,    // sample rate
            411,    // pulse width
            4096    // ADC range
        );

        particleSensor.setPulseAmplitudeRed(60);
        particleSensor.setPulseAmplitudeIR(60);
        particleSensor.setPulseAmplitudeGreen(0);

        ppgOk = true;
        Serial.println("OK");
    }
    else
    {
        Serial.println("NOT FOUND (heart rate disabled)");
    }


    // -------------------------------------------------
    // TMP117
    // -------------------------------------------------

    Serial.print("TMP117   ... ");

    if (tmp117.begin())
    {
        tempOk = true;
        Serial.println("OK");
    }
    else
    {
        Serial.println("NOT FOUND (temperature disabled)");
    }


    // -------------------------------------------------
    // MICROPHONE
    // -------------------------------------------------

    Serial.print("PDM mic  ... ");

    PDM.onReceive(onPDMdata);
    PDM.setGain(30);

    if (PDM.begin(1, 16000))
    {
        micOk = true;
        Serial.println("OK");
    }
    else
    {
        Serial.println("FAILED (noise level disabled)");
    }


    // -------------------------------------------------
    // FILTER / BPM STATE
    // -------------------------------------------------

    resetPPGChain();
    resetBPM();


    // -------------------------------------------------
    // BLE
    // -------------------------------------------------

    setupBLE();


    unsigned long now = millis();
    lastSample          = now;
    lastTemperatureRead = now;
    lastBLESend         = now;


    printBanner();
}


// The boot banner is written before any serial monitor has attached,
// so USB CDC throws it away. Reprinting it on every host attach means
// the sensor roll-call is always one connect away, without the sketch
// having to block on `while (!Serial)` -- which would stall the band
// whenever it runs on a battery instead of a PC.
void printBanner()
{
    Serial.println();
    Serial.println("======================================");
    Serial.println("             AURA BAND " FW_VERSION);
    Serial.println("======================================");

    Serial.print("MAX30102 : ");
    Serial.println(ppgOk  ? "OK" : "MISSING (heart rate disabled)");

    Serial.print("TMP117   : ");
    Serial.println(tempOk ? "OK" : "MISSING (temperature disabled)");

    Serial.print("PDM mic  : ");
    Serial.println(micOk  ? "OK" : "MISSING (noise level disabled)");

    Serial.print("BLE name : ");
    Serial.println(DEVICE_NAME);

    Serial.println("SOS      : short press = alert, hold 2s = cancel");
    Serial.println();
}


// =====================================================
// LOOP
// =====================================================

void loop()
{
    unsigned long now = millis();


    // -------------------------------------------------
    // Serial monitor attach detection
    // -------------------------------------------------

    static bool serialWasOpen = false;
    bool serialOpen = (bool)Serial;

    if (serialOpen && !serialWasOpen)
    {
        printBanner();
    }

    serialWasOpen = serialOpen;


    // -------------------------------------------------
    // BLE connection edge detection
    // -------------------------------------------------

    bool connected = Bluefruit.connected();

    if (connected && !bleWasConnected)
    {
        Serial.println(">>> BLE CONNECTED <<<");
        bleWasConnected = true;
        rxLineLen = 0;
    }

    if (!connected && bleWasConnected)
    {
        Serial.println(">>> BLE DISCONNECTED <<<");
        bleWasConnected = false;
    }


    // -------------------------------------------------
    // Inbound commands from the phone
    // -------------------------------------------------

    serviceBLEReceive();


    // -------------------------------------------------
    // SOS button + alert output
    // -------------------------------------------------

    serviceButton();
    serviceAlert();
    serviceStatusLed();


    // -------------------------------------------------
    // PPG
    // -------------------------------------------------

    if (ppgOk && (now - lastSample >= SAMPLE_INTERVAL))
    {
        lastSample = now;
        processPPG();
    }


    // -------------------------------------------------
    // Temperature
    // -------------------------------------------------

    if (now - lastTemperatureRead >= TEMPERATURE_INTERVAL)
    {
        lastTemperatureRead = now;
        readTemperature(now);
    }

    // A single good read is not a licence to report that value
    // forever. If the sensor stops answering, the field goes invalid.
    // The subtraction is compared as signed so a millis() rollover
    // cannot make a fresh reading look 49 days old.
    temperatureValid =
        tempOk &&
        temperatureEverRead &&
        ((long)(now - lastTemperatureOk) < (long)TEMPERATURE_STALE_MS);


    // -------------------------------------------------
    // Microphone
    // -------------------------------------------------

    serviceMicrophone();


    // -------------------------------------------------
    // Beat pulse flag
    // -------------------------------------------------

    if (beatSignal == 1 && (now - beatSignalStart >= BEAT_PULSE_DURATION))
    {
        beatSignal = 0;
    }


    // -------------------------------------------------
    // Telemetry
    // -------------------------------------------------

    if (connected && (now - lastBLESend >= BLE_SEND_INTERVAL))
    {
        lastBLESend = now;
        sendTelemetry();
    }


    // -------------------------------------------------
    // Serial console
    // -------------------------------------------------

    static unsigned long lastSerialPrint = 0;

    if (now - lastSerialPrint >= 500)
    {
        lastSerialPrint = now;
        printData();
    }
}


// =====================================================
// PPG  +  HEART RATE
// =====================================================

// KNOWN LIMITATION -- measured on hardware, not theoretical.
//
// getIR() calls the library's safeCheck(), which spins on delay(1)
// until the sensor FIFO produces a fresh sample. With sampleAverage=4
// at 100 Hz the FIFO emits at 25 Hz, so this call blocks the whole
// main loop for ~40 ms per pass. Measured effect: the PDM microphone
// handler loses roughly 60% of its 16 ms blocks (the DROP counter in
// the serial line), and the SOS button is polled at ~25 Hz instead of
// continuously. Harmless for a loudness average and still well inside
// the button debounce window, but it is the reason DROP climbs.
//
// The obvious fix -- check() plus a getFIFOIR()/nextSample() drain --
// was tried and hung loop() on this board, cause not yet identified.
// Reverted deliberately: a band that runs beats a band that wedges.
// Do not swap this back without testing on hardware.
void processPPG()
{
    long ir = particleSensor.getIR();


    // -------------------------------------------------
    // Finger removed
    // -------------------------------------------------
    //
    // Everything derived from the finger is cleared here:
    // the rate history, the moving-average window and the
    // baseline. Leaving any of it behind means the first
    // readings after the finger returns are a blend of two
    // different measurement sessions.

    if (ir < MIN_IR_VALUE)
    {
        if (fingerDetected)
        {
            Serial.println("-- finger removed, PPG state cleared --");
        }

        fingerDetected = false;
        fingerSince    = 0;

        resetPPGChain();
        resetBPM();
        return;
    }


    if (!fingerDetected)
    {
        fingerDetected = true;
        fingerSince    = millis();

        // Start from a clean slate rather than from whatever
        // the previous session left in the filters.
        resetPPGChain();
        resetBPM();
    }


    // -------------------------------------------------
    // Moving average
    // -------------------------------------------------

    irSum -= irBuffer[irBufferIndex];
    irBuffer[irBufferIndex] = ir;
    irSum += ir;

    irBufferIndex = (irBufferIndex + 1) % FILTER_SIZE;

    if (irSamplesFilled < FILTER_SIZE)
    {
        irSamplesFilled++;
    }

    // Divide by what is actually in the window while it fills,
    // otherwise the first samples are dragged toward zero.
    float averageIR = (float)irSum / (float)irSamplesFilled;


    // -------------------------------------------------
    // Baseline removal
    // -------------------------------------------------

    if (!baselinePrimed)
    {
        baseline        = averageIR;   // jump straight to DC level
        lastCleanSignal = 0.0f;
        filteredPPG     = 0.0f;
        baselinePrimed  = true;
    }
    else
    {
        baseline += BASELINE_ALPHA * (averageIR - baseline);
    }

    float signal = averageIR - baseline;


    // -------------------------------------------------
    // Spike gate
    // -------------------------------------------------

    float difference = signal - lastCleanSignal;
    float cleanSignal;

    if (fabsf(difference) > MAX_JUMP)
    {
        cleanSignal = lastCleanSignal + SPIKE_RECOVERY * difference;
    }
    else
    {
        cleanSignal = signal;
    }

    lastCleanSignal = cleanSignal;


    // -------------------------------------------------
    // Low pass  ->  the waveform sent to the phone
    // -------------------------------------------------

    filteredPPG += LOWPASS_ALPHA * (cleanSignal - filteredPPG);
    ppgValue = filteredPPG;


    // -------------------------------------------------
    // Beat detection (library expects the raw IR value)
    // -------------------------------------------------

    bool beat = checkForBeat(ir);

    // checkForBeat() carries its own filter state across the
    // finger-off gap, so ignore it until it has re-settled.
    if (millis() - fingerSince < BEAT_SETTLE_MS)
    {
        return;
    }

    if (!beat)
    {
        return;
    }

    unsigned long currentTime = millis();


    // First beat of a session: no interval to measure yet.
    if (lastBeatTime == 0)
    {
        lastBeatTime    = currentTime;
        beatSignal      = 1;
        beatSignalStart = currentTime;
        beatCount++;
        return;
    }


    unsigned long delta = currentTime - lastBeatTime;
    lastBeatTime = currentTime;

    // 300..1500 ms == 200..40 BPM, the same window as MIN/MAX_BPM.
    if (delta < 300 || delta > 1500)
    {
        return;
    }

    instantBPM = 60000.0f / (float)delta;

    if (instantBPM < MIN_BPM || instantBPM > MAX_BPM)
    {
        return;
    }


    rates[rateSpot] = (byte)instantBPM;
    rateSpot = (rateSpot + 1) % RATE_SIZE;

    if (rateCount < RATE_SIZE)
    {
        rateCount++;
    }

    int total = 0;
    for (byte i = 0; i < rateCount; i++)
    {
        total += rates[i];
    }

    beatAverage = total / rateCount;
    displayBPM  = (float)beatAverage;

    beatSignal      = 1;
    beatSignalStart = currentTime;
    beatCount++;
}


// -----------------------------------------------------
// Clear the whole signal chain: window, baseline, filters
// -----------------------------------------------------

void resetPPGChain()
{
    for (int i = 0; i < FILTER_SIZE; i++)
    {
        irBuffer[i] = 0;
    }

    irSum           = 0;
    irBufferIndex   = 0;
    irSamplesFilled = 0;

    baseline        = 0.0f;
    baselinePrimed  = false;

    lastCleanSignal = 0.0f;
    filteredPPG     = 0.0f;
    ppgValue        = 0.0f;
}


// -----------------------------------------------------
// Clear every heart-rate derived value, history included
// -----------------------------------------------------

void resetBPM()
{
    lastBeatTime    = 0;
    instantBPM      = 0.0f;
    displayBPM      = 0.0f;
    beatAverage     = 0;
    rateSpot        = 0;
    rateCount       = 0;
    beatSignal      = 0;
    beatSignalStart = 0;

    for (byte i = 0; i < RATE_SIZE; i++)
    {
        rates[i] = 0;
    }
}


// =====================================================
// TEMPERATURE
// =====================================================

// `now` is the loop's timestamp, not a fresh millis(). Stamping this
// with millis() would put lastTemperatureOk a few ms *ahead* of the
// `now` used for the staleness check in the same iteration, and the
// unsigned subtraction there would wrap to ~4.29e9 -- marking the
// reading stale on the very iteration it arrived.
void readTemperature(unsigned long now)
{
    if (!tempOk)
    {
        return;
    }

    if (!tmp117.dataReady())
    {
        return;
    }

    sensors_event_t tempEvent;

    if (!tmp117.getEvent(&tempEvent))
    {
        return;
    }

    temperatureC      = tempEvent.temperature;
    temperatureF      = (temperatureC * 9.0f / 5.0f) + 32.0f;
    lastTemperatureOk = now;
    temperatureEverRead = true;
}


// =====================================================
// MICROPHONE
// =====================================================

void onPDMdata()
{
    int bytesAvailable = PDM.available();

    if (bytesAvailable > (int)sizeof(pdmBuffer))
    {
        bytesAvailable = sizeof(pdmBuffer);
    }

    PDM.read(pdmBuffer, bytesAvailable);

    // The previous block was never collected, so it is being overwritten.
    // Expected occasionally: a 512-byte block lands every 16 ms, and a
    // blocking USB serial write can outlast that. Harmless for a
    // loudness average, but counted rather than hidden.
    if (pdmSampleCount != 0)
    {
        pdmDropped++;
    }

    pdmSampleCount = bytesAvailable / 2;
}


void serviceMicrophone()
{
    if (!micOk)
    {
        return;
    }

    int count = 0;

    // Mask only the PDM interrupt while copying. The ISR cannot
    // touch pdmBuffer during the memcpy, and the SoftDevice keeps
    // running (unlike a global noInterrupts()).
    NVIC_DisableIRQ(PDM_IRQn);

    if (pdmSampleCount > 0)
    {
        count = pdmSampleCount;

        if (count > PDM_BUFFER_SAMPLES)
        {
            count = PDM_BUFFER_SAMPLES;
        }

        memcpy(micWork, (const void *)pdmBuffer, (size_t)count * sizeof(int16_t));
        pdmSampleCount = 0;
    }

    NVIC_EnableIRQ(PDM_IRQn);

    if (count > 0)
    {
        processMicrophone(micWork, count);
    }
}


void processMicrophone(const int16_t *samples, int count)
{
    if (count <= 0)
    {
        micRMS = 0.0f;
        micDB  = 0.0f;
        return;
    }

    // Mean (removes the DC offset the PDM decimator leaves behind)
    float mean = 0.0f;

    for (int i = 0; i < count; i++)
    {
        mean += (float)samples[i];
    }

    mean /= (float)count;


    // RMS about the mean
    float sumSquares = 0.0f;

    for (int i = 0; i < count; i++)
    {
        float value = (float)samples[i] - mean;
        sumSquares += value * value;
    }

    micRMS = sqrtf(sumSquares / (float)count);


    // Relative level. This is 20*log10(RMS) on a 16-bit scale,
    // not calibrated dB SPL -- treat it as a loudness indicator.
    micDB = (micRMS > 1.0f) ? (20.0f * log10f(micRMS)) : 0.0f;

    if (micDB < 0.0f)   { micDB = 0.0f; }
    if (micDB > 120.0f) { micDB = 120.0f; }
}


// =====================================================
// SOS BUTTON
// =====================================================

void serviceButton()
{
    unsigned long now = millis();

    // Active low: pressed pulls the pin to GND.
    bool raw = (digitalRead(PIN_SOS_BUTTON) == LOW);

    if (raw != buttonLastRaw)
    {
        buttonLastRaw    = raw;
        buttonLastChange = now;
        return;
    }

    if (now - buttonLastChange < BUTTON_DEBOUNCE_MS)
    {
        return;
    }

    if (raw == buttonStable)
    {
        // Steady state: check for a hold-to-cancel while still down.
        if (buttonStable && !longPressHandled &&
            (now - buttonPressedAt >= BUTTON_LONGPRESS_MS))
        {
            longPressHandled = true;

            if (alertSource != ALERT_NONE)
            {
                Serial.println("SOS: cancelled by long press");
                stopAlert();
                sendEvent("SOS,0,BAND");
            }
        }
        return;
    }


    buttonStable = raw;

    if (buttonStable)
    {
        buttonPressedAt  = now;
        longPressHandled = false;
    }
    else
    {
        // Released. A short press raises the alert; a long press
        // already did its job (cancel) on the way down.
        if (!longPressHandled && alertSource == ALERT_NONE)
        {
            Serial.println("SOS: raised from band button");
            startAlert(ALERT_BAND);

            // Tell the phone immediately, then keep repeating the
            // flag in every telemetry frame until it is cleared.
            sendEvent("SOS,1,BAND");
            sendTelemetry();
        }
    }
}


// =====================================================
// ALERT OUTPUT  (red LED + vibration)
// =====================================================

void startAlert(AlertSource source)
{
    alertSource  = source;
    alertAcked   = false;
    alertStarted = millis();

    vibrating        = false;
    vibrationUntil   = 0;
    vibrationPhaseAt = millis();
}


void stopAlert()
{
    alertSource = ALERT_NONE;
    alertAcked  = false;

    vibrating      = false;
    vibrationUntil = 0;

    digitalWrite(PIN_VIBRATION, VIBRATION_OFF);
    setLed(0, 0, 0);
}


void buzz(unsigned long ms)
{
    if (ms > 3000)
    {
        ms = 3000;      // protect the motor
    }

    vibrationUntil = millis() + ms;
    vibrating      = true;
    digitalWrite(PIN_VIBRATION, VIBRATION_ON);
}


void serviceAlert()
{
    unsigned long now = millis();


    // One-shot buzz (BUZZ command). While it runs it owns the motor;
    // the alert pattern picks up again once it expires.
    bool oneShotRunning = false;

    if (vibrationUntil != 0)
    {
        if ((long)(now - vibrationUntil) >= 0)
        {
            vibrationUntil   = 0;
            vibrating        = false;
            vibrationPhaseAt = now;
            digitalWrite(PIN_VIBRATION, VIBRATION_OFF);
        }
        else
        {
            oneShotRunning = true;
        }
    }


    if (alertSource == ALERT_NONE)
    {
        return;
    }


    // Safety stop so a forgotten alert cannot flatten the battery.
    if (now - alertStarted >= ALERT_MAX_MS)
    {
        Serial.println("SOS: alert timed out");
        stopAlert();
        sendEvent("SOS,0,TIMEOUT");
        return;
    }


    // ---- vibration pattern -------------------------------------
    // Once the phone acknowledges, back off to a gentler reminder.
    if (!oneShotRunning)
    {
        unsigned long onMs  = VIB_ON_MS;
        unsigned long offMs = alertAcked ? (VIB_OFF_MS * 6) : VIB_OFF_MS;

        unsigned long phase = now - vibrationPhaseAt;

        if (vibrating && phase >= onMs)
        {
            vibrating        = false;
            vibrationPhaseAt = now;
            digitalWrite(PIN_VIBRATION, VIBRATION_OFF);
        }
        else if (!vibrating && phase >= offMs)
        {
            vibrating        = true;
            vibrationPhaseAt = now;
            digitalWrite(PIN_VIBRATION, VIBRATION_ON);
        }
    }


    // ---- red LED ------------------------------------------------
    // Band-raised alert blinks hard; phone-raised alert breathes.
    if (alertSource == ALERT_BAND)
    {
        bool on = ((now / 250) % 2) == 0;
        setLed(on ? 255 : 0, 0, 0);
    }
    else
    {
        unsigned long t = now % 2000;
        uint8_t level = (t < 1000)
            ? (uint8_t)((t * 255) / 1000)
            : (uint8_t)(((2000 - t) * 255) / 1000);

        setLed(level, 0, 0);
    }
}


// =====================================================
// LED
// =====================================================

static void ledChannel(uint8_t pin, uint8_t level)
{
#if LED_ACTIVE_LOW
    analogWrite(pin, 255 - level);
#else
    analogWrite(pin, level);
#endif
}


// setLed() is called from the loop on every pass, but analogWrite() on
// this core reconfigures a hardware PWM channel and is far too costly to
// run at loop rate -- doing so starved the PDM handler. Only the pins
// that actually change are written.
static uint8_t ledLastR = 0xFF;
static uint8_t ledLastG = 0xFF;
static uint8_t ledLastB = 0xFF;

void setLed(uint8_t r, uint8_t g, uint8_t b)
{
    if (r != ledLastR)
    {
        ledChannel(LED_RED, r);
        ledLastR = r;
    }

    if (g != ledLastG)
    {
        ledChannel(LED_GREEN, g);
        ledLastG = g;
    }

    if (b != ledLastB)
    {
        ledChannel(LED_BLUE, b);
        ledLastB = b;
    }
}


// Idle status light. The alert owns the LED whenever one is active.
void serviceStatusLed()
{
    if (alertSource != ALERT_NONE)
    {
        return;
    }

    unsigned long now = millis();

    if (Bluefruit.connected())
    {
        // Connected: short green blip every 3 s, dim.
        bool on = (now % 3000) < 60;
        setLed(0, on ? 40 : 0, 0);
    }
    else
    {
        // Advertising: short blue blip every 2 s, dim.
        bool on = (now % 2000) < 60;
        setLed(0, 0, on ? 40 : 0);
    }
}


// =====================================================
// BLE SETUP
// =====================================================

void setupBLE()
{
    Serial.print("BLE      ... ");

    // We drive the RGB LED ourselves, so the stack must not.
    Bluefruit.autoConnLed(false);

    Bluefruit.configPrphBandwidth(BANDWIDTH_MAX);

    if (!Bluefruit.begin())
    {
        Serial.println("FAILED");
        return;
    }

    Bluefruit.setTxPower(4);
    Bluefruit.setName(DEVICE_NAME);

    bleuart.begin();

    Bluefruit.Advertising.clearData();
    Bluefruit.ScanResponse.clearData();

    Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
    Bluefruit.Advertising.addTxPower();
    Bluefruit.Advertising.addService(bleuart);
    Bluefruit.ScanResponse.addName();

    Bluefruit.Advertising.restartOnDisconnect(true);
    Bluefruit.Advertising.setInterval(32, 244);
    Bluefruit.Advertising.setFastTimeout(30);
    Bluefruit.Advertising.start(0);

    Serial.println("OK, advertising as \"" DEVICE_NAME "\"");
}


// =====================================================
// FRAMING
// =====================================================
//
//  Every message is a single line:
//
//      $<body>*<XX>\n
//
//  XX is the XOR of every character of <body>, two hex digits.
//  A reader syncs on '$', ends on '\n' and throws the line away
//  if the checksum does not match. Split notifications and
//  dropped bytes can no longer desync the parser.
//
//  Telemetry body:
//      A,seq,bpm,ppg,tempC,tempF,mic,beat,beatCount,finger,tempValid,sos
//
//  Event body:
//      E,<what>[,...]
//
// =====================================================

static uint8_t xorChecksum(const char *s)
{
    uint8_t c = 0;

    while (*s)
    {
        c ^= (uint8_t)(*s++);
    }

    return c;
}


void sendFrame(const char *body)
{
    if (!Bluefruit.connected())
    {
        return;
    }

    char frame[160];

    snprintf(frame, sizeof(frame), "$%s*%02X\n", body, xorChecksum(body));

    // The write is attempted whenever a central is connected, rather
    // than being gated on notifyEnabled(). Gating looks tidier but it
    // fails silently and indistinguishably from a dead link: if the
    // phone's CCCD write is not yet visible to this connection handle,
    // every frame is dropped with no trace. Attempting the write and
    // counting the result means the serial line can say which of the
    // two is happening -- TX climbing, or FAIL climbing.
    if (bleuart.write((const uint8_t *)frame, strlen(frame)) > 0)
    {
        bleTxCount++;
    }
    else
    {
        bleTxFail++;
    }
}


void sendEvent(const char *body)
{
    char full[96];
    snprintf(full, sizeof(full), "E,%s", body);

    Serial.print("BLE TX: ");
    Serial.println(full);

    sendFrame(full);
}


void sendTelemetry()
{
    char body[144];

    snprintf(
        body, sizeof(body),
        "A,%lu,%.1f,%.0f,%.2f,%.2f,%.1f,%d,%lu,%d,%d,%d",
        (unsigned long)(++frameSeq),
        displayBPM,
        ppgValue,
        temperatureValid ? temperatureC : 0.0f,
        temperatureValid ? temperatureF : 0.0f,
        micDB,
        beatSignal,
        (unsigned long)beatCount,
        fingerDetected ? 1 : 0,
        temperatureValid ? 1 : 0,
        (int)alertSource
    );

    sendFrame(body);
}


// =====================================================
// INBOUND COMMANDS
// =====================================================

void serviceBLEReceive()
{
    while (bleuart.available())
    {
        int ch = bleuart.read();

        if (ch < 0)
        {
            break;
        }

        if (ch == '\n' || ch == '\r')
        {
            if (rxLineLen > 0)
            {
                rxLine[rxLineLen] = '\0';
                handleCommand(rxLine);
                rxLineLen = 0;
            }
            continue;
        }

        if (rxLineLen < RX_LINE_MAX - 1)
        {
            rxLine[rxLineLen++] = (char)ch;
        }
        else
        {
            rxLineLen = 0;      // overlong garbage, resync
        }
    }
}


// Accepts "$SOS*1B", "SOS", "sos,1" -- framing and case optional.
void handleCommand(char *line)
{
    // Strip an optional "$" prefix and "*XX" suffix.
    char *body = line;

    if (*body == '$')
    {
        body++;
    }

    char *star = strchr(body, '*');

    if (star)
    {
        *star = '\0';

        uint8_t expected = (uint8_t)strtol(star + 1, NULL, 16);

        if (xorChecksum(body) != expected)
        {
            Serial.print("BLE RX: bad checksum, dropped: ");
            Serial.println(line);
            return;
        }
    }

    // Upper-case the verb (up to the first comma).
    for (char *p = body; *p && *p != ','; p++)
    {
        *p = (char)toupper((unsigned char)*p);
    }

    Serial.print("BLE RX: ");
    Serial.println(body);


    char *arg = strchr(body, ',');

    if (arg)
    {
        *arg = '\0';
        arg++;
    }


    // ---- SOS from the phone ---------------------------------
    if (strcmp(body, "SOS") == 0)
    {
        // "SOS" or "SOS,1" raises, "SOS,0" clears.
        bool raise = !(arg && arg[0] == '0');

        if (raise)
        {
            if (alertSource == ALERT_NONE)
            {
                Serial.println("SOS: raised by phone");
                startAlert(ALERT_PHONE);
            }
            sendEvent("SOS,1,PHONE");
        }
        else
        {
            Serial.println("SOS: cleared by phone");
            stopAlert();
            sendEvent("SOS,0,PHONE");
        }

        sendTelemetry();
        return;
    }


    // ---- explicit clear --------------------------------------
    if (strcmp(body, "CLEAR") == 0 || strcmp(body, "SOSCLR") == 0)
    {
        stopAlert();
        sendEvent("SOS,0,PHONE");
        sendTelemetry();
        return;
    }


    // ---- phone acknowledged a band-raised SOS ----------------
    if (strcmp(body, "ACK") == 0)
    {
        alertAcked = true;
        sendEvent("ACK,1");
        return;
    }


    // ---- one-shot buzz, e.g. "BUZZ,600" ----------------------
    if (strcmp(body, "BUZZ") == 0)
    {
        unsigned long ms = arg ? strtoul(arg, NULL, 10) : 300;

        if (ms == 0)
        {
            ms = 300;
        }

        buzz(ms);
        sendEvent("BUZZ,1");
        return;
    }


    // ---- link check ------------------------------------------
    if (strcmp(body, "PING") == 0)
    {
        sendEvent("PONG");
        return;
    }


    // ---- identity / sensor status ----------------------------
    if (strcmp(body, "ID") == 0 || strcmp(body, "STATUS") == 0)
    {
        char msg[80];

        snprintf(msg, sizeof(msg), "ID,%s,%s,PPG%d,TMP%d,MIC%d",
                 DEVICE_NAME, FW_VERSION,
                 ppgOk ? 1 : 0, tempOk ? 1 : 0, micOk ? 1 : 0);

        sendEvent(msg);
        return;
    }


    sendEvent("ERR,UNKNOWN");
}


// =====================================================
// SERIAL CONSOLE
// =====================================================

void printData()
{
    Serial.print("PPG:");
    Serial.print(ppgValue, 0);

    Serial.print("  BPM:");
    Serial.print(displayBPM, 1);

    Serial.print("  TEMP:");

    if (temperatureValid)
    {
        Serial.print(temperatureF, 2);
        Serial.print("F");
    }
    else
    {
        Serial.print("--");
    }

    Serial.print("  MIC:");
    Serial.print(micDB, 1);
    Serial.print("dB");

    Serial.print("  DROP:");
    Serial.print(pdmDropped);

    Serial.print("  BEAT:");
    Serial.print(beatSignal);

    Serial.print("  COUNT:");
    Serial.print(beatCount);

    Serial.print("  FINGER:");
    Serial.print(fingerDetected ? 1 : 0);

    Serial.print("  SOS:");
    Serial.print((int)alertSource);

    // TX counts frames actually written to the characteristic. If BLE
    // reads SUBSCRIBED but TX never climbs, the fault is in this
    // firmware. If it climbs and the app shows nothing, the fault is on
    // the phone side. NO-NOTIFY means the app connected but never wrote
    // the CCCD descriptor, so notifications were never turned on.
    Serial.print("  BLE:");

    if (!Bluefruit.connected())
    {
        Serial.print("ADVERTISING");
    }
    else if (!bleuart.notifyEnabled())
    {
        Serial.print("NO-NOTIFY");
    }
    else
    {
        Serial.print("SUBSCRIBED");
    }

    Serial.print("  TX:");
    Serial.print(bleTxCount);

    Serial.print("  FAIL:");
    Serial.println(bleTxFail);
}
