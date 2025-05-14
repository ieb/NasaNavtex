# Navtex UI for Nasa Navtex Bt3 device

This device has a Microchip RN4020 BLE chip which supports Microchips MLDP protocol. This is essentially
a BLE Gatt service (00035b03-58e6-07dd-021a-08123a000300) with a Gatt characteristic (00035b03-58e6-07dd-021a-08123a000301) which if written to will send the data over UART to the MCU connected to it, and when the MCU responds the Gatt characteristic will send a notification containing the response. Setup is relatively simple using the Web BLE API. Only BLE communication is required.

Documentation on the serial protocol has kindly been shared by the team at NASA Marine instruments who actively support open source. See the PDF in this git repo.

This repo contains various applications that use interact with the device. On the device that tested with there are some differences from the documentation.

* Responses to the `$S,AB26~` commands are terminated with the char sequence `\r\nn\n`.
* Where the message ID is incorrect, the response is `Command not recognized.` not `Message ID NNNN not found.`
* Do not write to the Gatt characteristic while a response is still pending as this will get rejected.
* `$V~` get firmware version does not work, but `$#~` does, although message termination is unclear, 12 lines appears to work.

Caveat:  NAVTEX is an old protocol and may not be supported forever with most governments wanting to switch to Imarsat-C. That said, this using uses about 0.25W when its BT chip is not active. Also, Navtex data is widely available from websites, although some may not be uptodate.

# Todo  - Web version

* [x] Implement Sync over BLE
* [x] Add Navarea, Stations and Message filtering with human readable terms.
* [ ] Clean up styling
* [ ] Convert to a webapp
* [ ] Set time on the device and other parameters.
* [ ] Make available and test as an installable webapp for Chromium or any browser with BLE Web APIs.
* [ ] Adjust UI for phones.


