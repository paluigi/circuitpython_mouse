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
status = True


ble = BLERadio()
uart = UARTService()
#uart.init(timeout=1000) # init with given parameters
advertisement = ProvideServicesAdvertisement(uart)

ble.start_advertising(advertisement)
print("Waiting to connect")
while not ble.connected:
    pass

speed = 0.1

while True:
    switch.update()
    if switch.fell:
        status = not status
    if status == True:
        led.value = False
        m.move(80,0,0)
        time.sleep(speed)
        m.move(0,80,0)
        time.sleep(speed)
        m.move(-80,0,0)
        time.sleep(speed)
        m.move(0,-80,0)
        time.sleep(speed)
    else:
        led.value = True
    if ble.connected:
        s = uart.readline()
        if s:
            try:
                keyboard_layout.write(str(s.decode()))
            except Exception as e:
                print(e)
                uart.write(f"{e} - ERROR\n".encode("utf-8"))
            uart.write(f"{str(s.decode())} - DONE\n".encode("utf-8"))

