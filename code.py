import time
import board
import digitalio
import usb_hid
from adafruit_hid.mouse import Mouse
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keyboard_layout_us import KeyboardLayoutUS
from adafruit_hid.keycode import Keycode
from adafruit_debouncer import Debouncer
from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

# Wait at the beginning
time.sleep(10)
# Setup mouse
m = Mouse(usb_hid.devices)
# Setup keyboard
keyboard = Keyboard(usb_hid.devices)
keyboard_layout = KeyboardLayoutUS(keyboard)
# Setup LED
led = digitalio.DigitalInOut(board.INVERTED_LED)
led.direction = digitalio.Direction.OUTPUT
led.value = True # True == OFF
# Setup button
button = digitalio.DigitalInOut(board.BUTTON)
button.switch_to_input(pull=digitalio.Pull.UP)
switch = Debouncer(button)
# Setup Status
status = False#start disabled
direction = 0
last_movement = time.monotonic()
delta = 10


ble = BLERadio()
uart = UARTService()
#uart.init(timeout=1000) # init with given parameters
advertisement = ProvideServicesAdvertisement(uart)

ble.start_advertising(advertisement)
print("Waiting to connect")
#while not ble.connected:
#    pass

while True:
    now = time.monotonic()
    switch.update()
    if switch.fell:
        status = not status
    if status == True:
        led.value = False
        if (now - last_movement > 2) and direction == 0:
            m.move(delta,0,0)
            direction += 1
            last_movement = time.monotonic()
        elif (now - last_movement > 2) and direction == 1:
            m.move(0,delta,0)
            direction += 1
            last_movement = time.monotonic()
        elif (now - last_movement > 2) and direction == 2:
            m.move(-delta,0,0)
            direction += 1
            last_movement = time.monotonic()
        elif (now - last_movement > 2) and direction == 3:
            m.move(0,-delta,0)
            direction = 0
            last_movement = time.monotonic()
    else:
        led.value = True
        direction = 0
        last_movement = time.monotonic()
    
    
    if ble.connected:
        s = uart.readline()
        if s:
            try:
                keyboard_layout.write(str(s.decode()))
            except Exception as e:
                print(e)
                uart.write(f"{e} - ERROR\n".encode("utf-8"))
            uart.write(f"{str(s.decode())} - DONE\n".encode("utf-8"))

