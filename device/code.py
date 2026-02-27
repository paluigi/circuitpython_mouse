import time
import board
import digitalio
import usb_hid
from adafruit_hid.mouse import Mouse
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keyboard_layout_us import KeyboardLayoutUS
from adafruit_debouncer import Debouncer
import adafruit_ble
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

# Wait at the beginning
print("booting...")
time.sleep(10)

# Setup mouse
print("setting up mouse...")
m = Mouse(usb_hid.devices)
kbd = Keyboard(usb_hid.devices)
layout = KeyboardLayoutUS(kbd)

# Setup LED
led = digitalio.DigitalInOut(board.INVERTED_LED)
led.direction = digitalio.Direction.OUTPUT
led.value = True  # True == OFF

# Setup button
button = digitalio.DigitalInOut(board.BUTTON)
button.switch_to_input(pull=digitalio.Pull.UP)
switch = Debouncer(button)

# Setup BLE UART
print("setting up BLE...")
ble = adafruit_ble.BLERadio()
print("BLE name:", ble.name)
uart_service = UARTService()
advertisement = ProvideServicesAdvertisement(uart_service)
ble.start_advertising(advertisement)
print("advertising started")
ble_was_connected = False

# Setup Status
status = True
direction = 0
last_movement = time.monotonic()


def handle_command(cmd):
    global status, direction, last_movement
    cmd = cmd.strip()
    parts = cmd.split()
    verb = parts[0].upper() if parts else ""
    if not parts:
        return
    if verb == "TOGGLE":
        status = not status
        direction = 0
        last_movement = time.monotonic()
    elif verb == "START":
        status = True
    elif verb == "STOP":
        status = False
        direction = 0
        last_movement = time.monotonic()
    elif verb == "MOVE" and len(parts) >= 3:
        try:
            m.move(int(parts[1]), int(parts[2]), 0)
        except ValueError:
            pass
    elif verb == "CLICK":
        btn = parts[1].upper() if len(parts) > 1 else "LEFT"
        if btn == "RIGHT":
            m.click(Mouse.RIGHT_BUTTON)
        elif btn == "MIDDLE":
            m.click(Mouse.MIDDLE_BUTTON)
        else:
            m.click(Mouse.LEFT_BUTTON)
    elif verb == "SCROLL" and len(parts) >= 2:
        try:
            m.move(0, 0, int(parts[1]))
        except ValueError:
            pass
    elif verb == "TYPE" and len(cmd) > 5:
        try:
            layout.write(cmd[5:])
        except ValueError:
            pass


while True:
    now = time.monotonic()
    switch.update()
    if switch.fell:
        status = not status

    # BLE: handle reconnection and incoming commands
    if ble.connected:
        if not ble_was_connected:
            print("BLE connected")
        ble_was_connected = True
        if uart_service.in_waiting:
            raw = uart_service.readline()
            if raw:
                cmd = raw.decode("utf-8").strip()
                print("raw bytes:", raw)
                print("cmd:", repr(cmd))
                handle_command(cmd)
    elif ble_was_connected:
        print("BLE disconnected, re-advertising...")
        ble_was_connected = False
        ble.start_advertising(advertisement)

    if status:
        led.value = False
        if (now - last_movement > 2) and direction == 0:
            m.move(80, 0, 0)
            direction += 1
            last_movement = time.monotonic()
        if (now - last_movement > 4) and direction == 1:
            m.move(0, 80, 0)
            direction += 1
            last_movement = time.monotonic()
        if (now - last_movement > 6) and direction == 2:
            m.move(-80, 0, 0)
            direction += 1
            last_movement = time.monotonic()
        if (now - last_movement > 8) and direction == 3:
            m.move(0, -80, 0)
            direction = 0
            last_movement = time.monotonic()
    else:
        led.value = True
        direction = 0
        last_movement = time.monotonic()
