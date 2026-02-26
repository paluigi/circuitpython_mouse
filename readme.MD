# Circuitpython Mouse

Simple project for continuous mouse movement using CircuitPython, controllable via Bluetooth (BLE UART).
Configured for the [MDBT50Q-RX](https://circuitpython.org/board/raytac_mdbt50q-rx/) (nRF52840).

---

## Flashing the Firmware

> **Note:** CircuitPython 8.2+ requires bootloader **0.6.1 or later**. If your board has an older bootloader (check the boot info printed over USB serial), update it first.

### Step 1 — Update the Bootloader (if needed)

1. Hold the button and plug the board into USB — it appears as a `MDBT50QRX` USB drive
2. Drag `device/firmware/update-raytac_mdbt50q_rx_bootloader-0.10.0_nosd.uf2` onto the drive
3. The board will reboot back into bootloader mode with version 0.10.0

### Step 2 — Flash CircuitPython

1. Hold the button and plug in again to enter bootloader mode (`MDBT50QRX` drive)
2. Drag `device/firmware/adafruit-circuitpython-raytac_mdbt50q-rx-en_US-10.1.3.uf2` onto the drive
3. The board will reboot and appear as a `CIRCUITPY` USB drive

## Deploying the Code

Copy the following onto the `CIRCUITPY` drive:

- `device/code.py` → `CIRCUITPY/code.py`
- `device/lib/` → `CIRCUITPY/lib/`

The code runs automatically on boot.

---

## Usage

### Physical Button

Press the button on the board to toggle the auto-movement on/off. The LED indicates the current state (on = LED lit).

### Bluetooth (BLE UART)

The board advertises a Nordic UART BLE service. You can connect using:

- The **Progressive Web App** in `app/` (see [Web App](#web-app) section below)
- Any BLE UART app such as [Adafruit Bluefruit Connect](https://learn.adafruit.com/bluefruit-le-connect)

Send the following text commands (terminated with a newline):

| Command       | Action                                      |
|---------------|---------------------------------------------|
| `START`       | Enable auto-movement                        |
| `STOP`        | Disable auto-movement                       |
| `TOGGLE`      | Toggle auto-movement on/off                 |
| `MOVE x y`   | Move mouse by x,y pixels (e.g. `MOVE 50 -20`) |
| `CLICK`       | Left click                                  |
| `CLICK LEFT`  | Left click                                  |
| `CLICK RIGHT` | Right click                                 |
| `CLICK MIDDLE`| Middle click                                |
| `SCROLL n`    | Scroll by n steps (positive=up, negative=down) |

The board re-advertises automatically after a disconnect.

---

## Web App

A Progressive Web App (PWA) is included in `app/` to control the device from Android (or any browser with Web Bluetooth support, such as Chrome on Android or desktop Chrome/Edge).

### Features

- Connect / disconnect to the board via BLE
- Buttons for all commands: Start, Stop, Toggle, Click (L/M/R), Scroll
- Move controls: X/Y number inputs and an arrow pad
- Custom command text box — type any command and press Send or Enter
- Live log showing sent commands and replies from the device
- Installable on Android as a home screen app (PWA)

### Requirements

- Chrome on Android (or any Chromium-based browser with Web Bluetooth)
- The app **must be served over HTTPS** — Web Bluetooth does not work over plain HTTP

### Running Locally

```bash
npx serve app/
```

Then open the printed HTTPS URL on your phone. Alternatively, deploy the `app/` folder to any static HTTPS host (GitHub Pages, Netlify, etc.).

### Installing on Android

1. Open the app URL in Chrome
2. Tap the menu → **Add to Home Screen**
3. The app installs like a native app and works offline

---

## Project Structure

```
app/
├── index.html           # UI (buttons, inputs, log)
├── app.js               # Web Bluetooth + command logic
├── manifest.json        # PWA manifest
└── service-worker.js    # Offline caching

device/
├── code.py              # Main CircuitPython script
├── firmware/            # Bootloader updater + CircuitPython 10.1.3 (.uf2)
└── lib/
    ├── adafruit_ble/          # BLE + Nordic UART service
    ├── adafruit_hid/          # USB HID (mouse)
    ├── adafruit_debouncer.mpy # Button debouncing
    └── adafruit_ticks.mpy     # Timing utility
```

---

Enjoy!
