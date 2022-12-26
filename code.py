import time
import board
import digitalio
import usb_hid
from adafruit_hid.mouse import Mouse
from adafruit_debouncer import Debouncer

from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

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


ble = BLERadio()
uart = UARTService()
#uart.init(timeout=1000) # init with given parameters
advertisement = ProvideServicesAdvertisement(uart)

ble.start_advertising(advertisement)
print("Waiting to connect")
while not ble.connected:
    pass
    

speed = 0.5

while True:

    while ble.connected:
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
            
        s = uart.readline()
        if s:
            try:
                result = str(eval(s))
            except Exception as e:
                result = repr(e)
            uart.write("HELLO!".encode("utf-8"))


    