



/*
    <script src='http://www.openlayers.org/api/OpenLayers.js' ></script>
    <script src='http://www.openstreetmap.org/openlayers/OpenStreetMap.js'></script>
    <script src='https://map.openseamap.org/javascript/ol@v7.3.0/ol.js'></script>
    <script src='http://map.openseamap.org/javascript/harbours.js'></script>
    <script src='http://map.openseamap.org/javascript/map_utils.js'></script>
    <script src='http://map.openseamap.org/javascript/utilities.js'></script>

import 'https://openlayers.org/api/2.13.1/OpenLayers.js');
import 'https://map.openseamap.org/javascript/ol@v7.3.0/ol.js');
import 'https://www.openstreetmap.org/openlayers/OpenStreetMap.js');
import 'https://map.openseamap.org/javascript/harbours.js');
import 'https://map.openseamap.org/javascript/map_utils.js');
import 'https://map.openseamap.org/javascript/utilities.js');
*/


export class OpenSeaMap {
	



        
	constructor() {
		this.map;
	}

	drawmap() {

        const popup = document.getElementById('popup');
        const closer = document.getElementById('popup-closer');
        // eslint-disable-next-line no-undef
        this.overlay = new ol.Overlay({
            element: popup,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },  
        });
        // close the popup
        closer.onclick = function () {
            this.overlay.setPosition(undefined);
            closer.blur();
            return false;
        };

        // eslint-disable-next-line no-undef
        this.map = new ol.Map({
            target: 'map',
            overlays: [this.overlay],
        	// eslint-disable-next-line no-undef
            view: new ol.View({
                maxZoom     : 19,
                //displayProjection : proj4326,
                // eventListeners: {
                //     moveend     : mapEventMove,
                //     zoomend     : mapEventZoom,
                //     click       : mapEventClick,
                //     changelayer : mapChangeLayer
                // },
                // controls: [
                    // permalinkControl,
                    // new OpenLayers.Control.Navigation(),
                    // //new OpenLayers.Control.LayerSwitcher(), //only for debugging
                    // new OpenLayers.Control.ScaleLine({
                    //     topOutUnits : "nmi",
                    //     bottomOutUnits: "km",
                    //     topInUnits: 'nmi', 
                    //     bottomInUnits: 'km', 
                    //     maxWidth: Math.max(0.2*$(window).width(),0.2*$(window).height()).toFixed(0), 
                    //     geodesic: true
                    // }),
                    // new OpenLayers.Control.MousePositionDM(),
                    // new OpenLayers.Control.OverviewMap(),
                    // ZoomBar
                // ]
            }),
        });
        // eslint-disable-next-line no-undef
        this.map.addControl(new ol.control.ScaleLine({
            className: 'ol-scale-line-metric'
        }));
        // eslint-disable-next-line no-undef
        this.map.addControl(new ol.control.ScaleLine({
            className: 'ol-scale-line-nautical',
            units: "nautical",
        }));
        // eslint-disable-next-line no-undef
        this.map.addControl(new ol.control.ZoomSlider());
        // eslint-disable-next-line no-undef
        this.map.addControl(new ol.control.MousePosition({
            coordinateFormat: (coordinate) => {
		        // eslint-disable-next-line no-undef
                const [lon, lat] = ol.proj.toLonLat(coordinate);
                var ns = lat >= 0 ? 'N' : 'S';
                var we = lon >= 0 ? 'E' : 'W';
                var lon_m = Math.abs(lon*60).toFixed(3);
                var lat_m = Math.abs(lat*60).toFixed(3);
                var lon_d = Math.floor (lon_m/60);
                var lat_d = Math.floor (lat_m/60);
                lon_m -= lon_d*60;
                lat_m -= lat_d*60;
                // eslint-disable-next-line no-undef
                return "Zoom:" + this.map.getView().getZoom().toFixed(0) + " " + ns + lat_d + "&#176;" + format2FixedLenght(lat_m,6,3) + "'" + "&#160;" +
                    // eslint-disable-next-line no-undef
                    we + lon_d + "&#176;" + format2FixedLenght(lon_m,6,3) + "'" ;
            },
        }));

        const mapEventMove = () => {
            //ol.proj.toLonLat(this.map.getView().getCenter());
        }




        this.map.on('moveend', mapEventMove);


        // base map
        // eslint-disable-next-line no-undef
        const urls = [];

        // Need to use an ImageTileSource with a loader.
        const baseSource = new ol.source.OSM({
                url: './t2.openseamap.org/tile/{z}/{x}/{y}.png',
                crossOrigin: null,
            });
        const layer_mapnik = new ol.layer.Tile({
	        // eslint-disable-next-line no-undef
            source: baseSource,
            properties: {
                name: 'Mapnik',
                layerId: 1,
                wrapDateLine:true
            }
        });

        // Seamark
        // eslint-disable-next-line no-undef
        const layer_seamark = new ol.layer.Tile({
            visible: true,
            maxZom: 19,
	        // eslint-disable-next-line no-undef
            source: new ol.source.XYZ({
                // url: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                tileUrlFunction: function(coordinate) {
                    // eslint-disable-next-line no-undef
                    return getTileUrlFunction("./tiles.openseamap.org/seamark/", 'png', coordinate);
                    // return "https://tiles.openseamap.org/seamark/" + coordinate[0] + '/' +
                    //     coordinate[1] + '/' + (-coordinate[2] - 1) + '.png';
                }
            }),
            properties: {
                name: "seamarks",
                layerId: 3,
                cookieKey: "SeamarkLayerVisible",
                checkboxId: "checkLayerSeamark",
            }
        });

        // Map download
        // eslint-disable-next-line no-undef
        const layer_download = new ol.layer.Vector({
            visible: false,
            properties: {
                name: 'Map Download',
                layerId: 8,
            },
	        // eslint-disable-next-line no-undef
            source: new ol.source.Vector({features:[]}),
        });


        // Grid WGS
        // eslint-disable-next-line no-undef
        const layer_grid = new ol.layer.Graticule({
            visible: true,
            properties: {
                name: "coordinateGrid",
                layerId: 10,
                checkboxId: "checkLayerGridWGS",
                cookieKey: "GridWGSLayerVisible",
            },
            // the style to use for the lines, optional.
            strokeStyle: new ol.style.Stroke({
                color: 'rgba(0,0,0,1)',
                width: 1,
                // lineDash: [0.5, 4],
            }),
            showLabels: true,
            wrapX: true,
        });



        // eslint-disable-next-line no-undef
        this.layer_marker = new ol.layer.Vector({
	        // eslint-disable-next-line no-undef
            source: new ol.source.Vector(),
            properties:{
                name: "Marker",
                layerId: -2 // invalid layerId -> will be ignored by layer visibility setup
            },
            visible: true,

        });

        [
            layer_mapnik,
            layer_seamark,
            layer_grid,
            layer_download,
            this.layer_marker,
        ].forEach((layer)=> {
            this.map.addLayer(layer);
        });

        console.log("Layer Mapnik", layer_mapnik);
       console.log("Layer Seamark", layer_seamark);
       console.log("Layers", this.map.getLayers());


        this.jumpTo(52.0, 2.0, 10);


	}



	/*
	 * returns extent in coordinate as an array
	 * [minLon, minLat, maxLon, maxLat]
	 */
	getMapExtents() {
		return this.map.getView().calculateExtent();
	}
	jumpToCoordinates(center, zoom) {
		this.map.getView().setCenter(center);
  		this.map.getView().setZoom(zoom);		
	}

	jumpTo(lat, lon, zoom) {
        // eslint-disable-next-line no-undef
  		this.map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
  		this.map.getView().setZoom(zoom);
	}

	addMarkerGroup(markers, html, style) {
		const source = 	  this.layer_marker.getSource();
		source.clear(true);
		let plat = 90;
		let plon = 360;
		markers.forEach((m) => {
	        // eslint-disable-next-line no-undef
		  const coord = ol.proj.fromLonLat([m.lon, m.lat]);
		  plat = Math.min(plat, m.lat);
		  plon = Math.min(plon, m.lon)
	        // eslint-disable-next-line no-undef
		  const feature = new ol.Feature(new ol.geom.Point(coord));
		  feature.setStyle(style);
		  source.addFeature(feature);
		});



        // eslint-disable-next-line no-undef
	  	const coordinate = ol.proj.fromLonLat([plon, plat]);
		const content = document.getElementById('popup-content');
        content.innerHTML = html;
        // The feature must have a point geometry
        this.overlay.setPosition(coordinate);

	}


	addMarker(lat, lon, text, style) {
        // eslint-disable-next-line no-undef
	  const coord = ol.proj.fromLonLat([lon, lat]);
        // eslint-disable-next-line no-undef
	  const feature = new ol.Feature(new ol.geom.Point(coord));
	  feature.set("popupContentHTML", text);
	  feature.setStyle(style);
      this.openPopup(feature);
	}

	openPopup(feature, coordinate) {
        let html = feature.get('popupContentHTML');

        if (!html && feature.get('name')) {
            html = '<b>'+feature.get('name') +'</b><br>'+ feature.get('description');
        }
        const content = document.getElementById('popup-content');

        content.innerHTML = html;
        // The feature must have a point geometry
        this.overlay.setPosition(coordinate || feature.getGeometry().getCoordinates());
    }




}