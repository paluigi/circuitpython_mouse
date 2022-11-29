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

while True:
    switch.update()
    if switch.fell:
        status = not status
    if status == True:
        led.value = False
        m.move(80,0,0)
        time.sleep(0.1)
        m.move(0,80,0)
        time.sleep(0.1)
        m.move(-80,0,0)
        time.sleep(0.1)
        m.move(0,-80,0)
        time.sleep(0.1)
    else:
        led.value = True
