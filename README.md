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

# install and local devlopment.

run 

    node server.js
    open http://localhost:8080/navtex

An installable PWA will be avaiable. The server will cache any tiles requested into ./cache/** which will allow offline operation. The PWA does not cache content as it was found to be too slow when all the tiles where added for a navarea. Before going offline, select the area of interest and click the loadmap button, which will load all the map tiles down to 2NM per tile, ie about 10NM map width.

# webworkers

To make this app work offline it must be able to fetch resources, cache them and go offline. However webworkers do not work cross origin and so can only cache resources (eg map tiles). Tried all sorts of ways and in the end created a localhost proxy server that caches to disk, so that the webworker can load and cache from localhost. All the tile urls are now relative to the webworker location and stored in an on disk cache. 

While the service worker can cache files, that cache does not perform well with 100MB of cached content (10K items), probably due to the lookup mechanism being used. Better to keep the local server running to serve tiles.

# Todo  - Web version

* [x] Implement Sync over BLE
* [x] Add Navarea, Stations and Message filtering with human readable terms.
* [ ] Clean up styling
* [x] Convert to a webapp
* [x] Set time on the device and other parameters.
* [ ] Make available and test as an installable webapp for Chromium or any browser with BLE Web APIs.
* [ ] Adjust UI for phones.
* [x] Add Open sea map
* [x] Detect and process lat lon embedded in messages
* [x] Detect and process WZ cancel 
* [x] Detect and process lower FEC reports for messages
* [x] Plot WZ on map
* [x] Detect time of Day of message reciept
* [x] Skip re-download of messages with 0 FEC errors.
* [ ] Add age of message download.
* [x] Add support for search
* [ ] Detect lat lon of form 50 10N 000 20E, 53-45.1N 003-54E RACON ON PLATFORM ROLF 55-36.4N
004-29.5E INOPERATIVE.
* [ ] Add Show on Map function
* [x] Add scan functon to pre-load navarea by moving the map over a bounding box

