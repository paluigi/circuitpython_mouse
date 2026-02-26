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

The board advertises a Nordic UART BLE service. Connect using any BLE UART app (e.g. [Adafruit Bluefruit Connect](https://learn.adafruit.com/bluefruit-le-connect)) and send the following text commands (terminated with a newline):

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

## Project Structure

```
device/
├── code.py          # Main CircuitPython script
├── firmware/        # CircuitPython 10.1.3 firmware (.uf2)
└── lib/
    ├── adafruit_ble/          # BLE + Nordic UART service
    ├── adafruit_hid/          # USB HID (mouse)
    ├── adafruit_debouncer.mpy # Button debouncing
    └── adafruit_ticks.mpy     # Timing utility
```

---

Enjoy!
