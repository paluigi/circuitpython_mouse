import time
import board
import usb_hid
from adafruit_hid.mouse import Mouse

time.sleep(10)
m = Mouse(usb_hid.devices)


while True:
    m.move(20,0,0)
    time.sleep(2)
    m.move(0,20,0)
    time.sleep(2)
    m.move(-20,0,0)
    time.sleep(2)
    m.move(0,-20,0)
    time.sleep(5)
