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
# Define the button pin
button_pin = board.BUTTON
# Create a Button object
button = digitalio.DigitalInOut(board.BUTTON)
button.switch_to_input(pull=digitalio.Pull.UP)
# Set up variables to track button state and timing
button_pressed = False
last_press_time = 0
double_press_threshold = 0.5  # Adjust this value based on your needs (in seconds)
# Create a Keyboard object
keyboard = Keyboard(usb_hid.devices)
keyboard_layout = KeyboardLayoutUS(keyboard)


status = False#start mouse movements disabled
direction = 0
last_movement = time.monotonic()
delta = 10
ble = None

def start_bluetooth():
    ble = BLERadio()
    uart = UARTService()
    uart.init(timeout=1000) # init with given parameters
    advertisement = ProvideServicesAdvertisement(uart)
    ble.start_advertising(advertisement)
    print("Waiting to connect")
 

while True:
    # Check if the button is pressed
    if button.value:
        if not button_pressed:
            # Button has just been pressed
            button_pressed = True
            current_time = time.monotonic()
            time_since_last_press = current_time - last_press_time

            if time_since_last_press < double_press_threshold:
                # Double press detected, simulate key presses
                #keyboard.press(Keycode.D)  # Replace with the desired key or key combination
                #keyboard.release_all()
                start_bluetooth()
                status = False #stop jiggling
            else: #single digit
                status = not status

            last_press_time = current_time
    else:
        # Button is not pressed
        button_pressed = False

    now = time.monotonic()
    if status == True:
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
        direction = 0
        last_movement = time.monotonic()

    # Add a small delay to avoid excessive checking
    time.sleep(0.01)

# if ble and ble.connected:
#        s = uart.readline()
#        if s:
#            try:
#                keyboard_layout.write(str(s.decode()))
#            except Exception as e:
#                print(e)
#                uart.write(f"{e} - ERROR\n".encode("utf-8"))
#            uart.write(f"{str(s.decode())} - DONE\n".encode("utf-8"))