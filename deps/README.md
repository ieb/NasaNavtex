# Dependencies

Packaged this way so that the UI is available direct from github pages and offline using a localhost server


* ol.* (OpenLayers) is https://github.com/openlayers/openlayers/releases/tag/v10.5.0 from the dist folder
* harbours.js from https://map.openseamap.org/javascript/harbours.js
* map_utils.js https://map.openseamap.org/javascript/map_utils.js
* utilities.js https://map.openseamap.org/javascript/utilities.js


All of the above do not see to work well loaded as modules, hence the script tags need to reference this location.