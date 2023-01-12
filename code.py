import time
import board
import digitalio
import usb_hid
from adafruit_hid.mouse import Mouse
from adafruit_debouncer import Debouncer


# Wait at the beginning
time.sleep(10)
# Setup mouse
m = Mouse(usb_hid.devices)
# Setup LED
led = digitalio.DigitalInOut(board.INVERTED_LED)
led.direction = digitalio.Direction.OUTPUT
led.value = True # True == OFF
# Setup button
button = digitalio.DigitalInOut(board.BUTTON)
button.switch_to_input(pull=digitalio.Pull.UP)
switch = Debouncer(button)
# Setup Status
status = True
direction = 0
last_movement = time.monotonic()

while True:
    now = time.monotonic()
    switch.update()
    if switch.fell:
        status = not status
    if status == True:
        led.value = False
        if (now - last_movement > 2) and direction == 0:
            m.move(80,0,0)
            direction += 1
            last_movement = time.monotonic()
        if (now - last_movement > 4) and direction == 1:
            m.move(0,80,0)
            direction += 1
            last_movement = time.monotonic()
        if (now - last_movement > 6) and direction == 2:
            m.move(-80,0,0)
            direction += 1
            last_movement = time.monotonic()
        if (now - last_movement > 8) and direction == 3:
            m.move(0,-80,0)
            direction = 0
            last_movement = time.monotonic()
    else:
        led.value = True
        direction = 0
        last_movement = time.monotonic()
