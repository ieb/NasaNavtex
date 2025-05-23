


import {OpenSeaMap} from "./map.js";
import {navtexStations, NasaNavtex} from "./navtex.js";

class UIControl {
    constructor(opts) {


        this.openMap = opts.openMap;
        this.messages = {};
        this.updateMessage = this.updateMessage.bind(this);

        // eslint-disable-next-line no-undef
        this.markerStyle = new ol.style.Style({
          // eslint-disable-next-line no-undef
          image: new ol.style.Icon({
            src: "./map.openseamap.org/resources/icons/Needle_Red_32.png",
            size: [32, 32],
            anchor: [0.5, 1],
          }),
        });


        const navareaSelect = document.getElementById('navarea');
        const messageTypeSelect = document.getElementById('messageTypes');
        const stationsSelect = document.getElementById('stations');
        const frequency_a = document.getElementById('frequency_a');
        const frequency_b = document.getElementById('frequency_b');

        Object.keys(navtexStations.navareas).forEach((na) => {
            const opt = document.createElement('option');
            opt.setAttribute('id', na);
            opt.innerHTML = `${na} ${navtexStations.navareas[na].title}`;
            navareaSelect.append(opt);
        });

        Object.keys(navtexStations.messageTypes).forEach((mt) => {
            const opt = document.createElement('option');
            opt.setAttribute('id', mt);
            opt.innerHTML = `${mt} ${navtexStations.messageTypes[mt]}`;
            messageTypeSelect.append(opt);
        });


        const renderStations = () =>  {
            const area = navareaSelect.options[navareaSelect.selectedIndex].id;
            stationsSelect.innerHTML = '';
            const frequencies = [];
            if (frequency_a.checked) {
                frequencies.push({ id:'a', value:'512KHz'});
            }
            if (frequency_b.checked) {
                frequencies.push({ id:'b', value:'490KHz'});
            }
            frequencies.forEach((frequency) => {
                const stations = navtexStations.navareas[area][frequency.id];
                const f = frequency.value;
                if ( stations ) {
                    Object.keys(stations).forEach((station) => {
                        const opt = document.createElement('option');
                        opt.setAttribute('id', `${frequency.id}${station}`);
                        opt.innerHTML = `${f} ${station} ${stations[station]}`;
                        stationsSelect.append(opt);
                    });            
                }

            })
        }

        const filterStations = () => {
            const filters = [];
            Object.values(stationsSelect.selectedOptions).forEach((station) => {
                Object.values(messageTypeSelect.selectedOptions).forEach((mt) => {
                    filters.push(`${station.id}${mt.id}`);

                });
            });

            this.selectMessages(filters);
        };


        navareaSelect.addEventListener('change', () => {
            renderStations();
        });
        frequency_a.addEventListener('change', () => {
            renderStations();
        });
        frequency_b.addEventListener('change', () => {
            renderStations();
        });
        stationsSelect.addEventListener('change', () => {
            filterStations();
        });
        messageTypeSelect.addEventListener('change', () => {
            filterStations();
        });

        document.getElementById("search").addEventListener('change', (e) => {  
            const search = e.target.value.toUpperCase();
            Object.keys(this.messages).forEach((k) => {
                if ( this.messages[k].text && this.messages[k].text.includes(search)) {
                    document.getElementById(`key_${k}`).setAttribute('selected', 'selected');
                    document.getElementById(`msg_${k}`).setAttribute('selected', 'selected');
                } else {
                    document.getElementById(`key_${k}`).removeAttribute('selected');
                    document.getElementById(`msg_${k}`).removeAttribute('selected');
                }
            });
        });
        document.body.addEventListener("keydown", (event) => { 
            if (event.key === 'Meta') {
                this.cmdPressed =true;
            }
        });
        document.body.addEventListener("keyup", (event) => { 
            if (event.key === 'Meta') {
                this.cmdPressed = false;
            }
            if (event.key === 'd') {
                console.log("Display ",this.highlightText);
            }
        });


        document.addEventListener("selectionchange", (e) => {
          const selecton = document.getSelection();
          if ( selecton.extentNode.data ) {
            this.highlightText = selecton.extentNode.data.substring(selecton.baseOffset, selecton.focusOffset);
          } else {
            this.highlightText = '';
          }
        });

        renderStations();
        this.loadMessages().then(() => {
            this.cancelMessages();
            filterStations();
        });


    }





    selectMessages(filters) {
        document.querySelectorAll('.messageId').forEach((e) => {
            const id = e.id.substring(4);
            const key = id.substring(0,3);
            if ( filters.includes(key)) {
                e.setAttribute('selected', 'selected');
                document.getElementById(`msg_${id}`).setAttribute('selected', 'selected');            
            } else {
                e.removeAttribute('selected');
                document.getElementById(`msg_${id}`).removeAttribute('selected');            
            }
        })
    }


    async loadMessages(dummy) {
        if ( dummy ) {
            const response = await fetch("./messageStore.json");
            const messages = await response.json();
            Object.keys(messages).forEach((k) => {
                this.updateMessage(k, messages[k]);
            });
            console.log(this.messages);            
        } else {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                this.updateMessage(k,localStorage.getItem(k));
            }
        }
    };
    saveMessages() {
        console.log(this.messages);
        Object.keys(this.messages).forEach((k) => {localStorage.setItem(k,this.messages[k].recievedText); });
    };


    processMessage(id, recievedText) {
        const textLines = this.makeSafe(recievedText).split('\n');
        for (var i = 0; i < textLines.length; i++) {
            const t = textLines[i].trim();
            if (t.length === 0) {
                textLines[i] = '<div>&nbsp;</div>';
            } else {
                textLines[i] = `<div>${t}</div>`;
            }
        }
        const text = textLines.join('');

        if (this.messages[id] === undefined) {
            this.messages[id] = {
                id: id,
                fecErrors: 1000000
            }
        }
        const fecErrorsSearch= /<div>([0-9:]{1,4})<<\/div>/gm;
        const fecErrorMatch = fecErrorsSearch.exec(text);
        let fecErrors = 99;
        if ( fecErrorMatch ) {
            fecErrors = fecErrorMatch[1];
            fecErrors = fecErrors.replace(':','999');
        } else {
            console.debug("no Fec error count ", text);
            this.messages[id] = text;
            return text;
        }
        if ( fecErrors < this.messages[id].fecErrors ) {
            // lower level of errors, save
            this.messages[id].text = text;
            this.messages[id].recievedText = recievedText;
            this.messages[id].fecErrors = fecErrors;
            const timeSearch = /^<div>.*?<\/div><div>([0-9]{2}):([0-9]{2})<\/div>/gm;
            const timeMatch = timeSearch.exec(text);
            if (timeMatch) {
                this.messages[id].timeOfDay = +(timeMatch[2])+(timeMatch[1])*60;       
            } else {
                this.messages[id].timeOfDay = -1;
            }

            delete this.messages[id].wz;
            delete this.messages[id].wzcancel;
            const wzSearch = /^<div>.*?<\/div><div>.*?<\/div><div>(WZ.*?)<\/div>/gm;
            const wzMatch = wzSearch.exec(text);
            if (wzMatch) {
                this.messages[id].wz = wzMatch[1];       
             }
            let m;
            const wzCancel = /CANCEL (WZ.*?) \(([A-Z]{2}[0-9]{0,4})\)/gm;
            while ((m = wzCancel.exec(text)) !== null) {
                if (m.index === wzCancel.lastIndex) {
                    wzCancel.lastIndex++;
                }
                this.messages[id].wzcancel = this.messages[id].wzcancel || [];
                this.messages[id].wzcancel.push({
                    wz: m[1],
                    id: m[2]
                });
            }


            const latLonExtract = /([0-9]{1,3})[-\s]{1,3}([0-9]{1,2}[.,]{0,1}[0-9]{0,4})([NS]{0,1})\s*?([0-9]{2,3})[-\s]{1,3}([0-9]{1,2}[.,]{0,1}[0-9]{0,4})([EW]{0,1})/gm;
            const coords = [];
            while ((m = latLonExtract.exec(recievedText)) !== null) {
                if (m.index === latLonExtract.lastIndex) {
                    latLonExtract.lastIndex++;
                }
                const lat = this.toLatLonFloat(m[1],m[2],m[3]);
                const lon = this.toLatLonFloat(m[4],m[5],m[6]);
                coords.push({ 
                    lat, 
                    lon,
                    latLon: m[0]
                    });
            }
            this.messages[id].coords = coords;
            this.messages[id].stats = coords.reduce((acc, v) => {
                acc.lat = acc.lat + (v.lat/coords.length);
                acc.lon = acc.lon + (v.lon/coords.length);
                acc.minlat = Math.min(acc.minlat, v.lat);
                acc.minlon = Math.min(acc.minlon, v.lon);
                return acc;
            }, { lat: 0, lon: 0, minlon: 360, minlat: 90});
        }
        return this.messages[id].text;
    }

    cancelMessages() {
        Object.keys(this.messages).forEach((k) => {
            if ( this.messages[k].wzcancel ) {
                this.messages[k].wzcancel.forEach((c) => {
                    [`a${c.id}`, `b${c.id}`].forEach((id) => {
                        if ( this.messages[id] ) {
                            const elId = document.getElementById(`key_${id}`);
                            if (elId) {
                                elId.setAttribute('wzcancel','true')
                            }
                            const msgId = document.getElementById(`msg_${id}`);
                            if (msgId) {
                                msgId.setAttribute('wzcancel','true')
                            }
                        }
                    });
                });
            }
        });
    }

    updateMessage(id, recievedText) {
        if ( id == 'status') {
            document.getElementById('status').innerHTML = recievedText;
            return;
        }
        id = this.makeSafe(id);
        let text = this.processMessage(id, recievedText);
        const latLonSearch = /([0-9]{1,3}[-\s]{1,3}[0-9]{1,2}[.,]{0,1}[0-9]{0,4}[NS]{0,1}\s*?[0-9]{2,3}[-\s]{1,3}[0-9]{1,2}[.,]{0,1}[0-9]{0,4}[EW]{0,1})/gm;
        const latLonSearch2 = /([0-9]{1,3}[-\s]{1,3}[0-9]{1,2}[.,]{0,1}[0-9]{0,4}[NS]{0,1})<\/div>/gm
        const latLonSearch3 = /<div>([0-9]{2,3}[-\s]{1,3}[0-9]{1,2}[.,]{0,1}[0-9]{0,4}[EW]{0,1})/gm;
        const latLonSub = '<span class="latlon">$1</span>';
        const latLonSub2 = '<span class="latlon2">$1</span></div>';
        const latLonSub3 = '<div><span class="latlon3">$1</span>';
        text = text.replace(latLonSearch, latLonSub);
        text = text.replace(latLonSearch2, latLonSub2);
        text = text.replace(latLonSearch3, latLonSub3);
        let elId = document.getElementById(`key_${id}`);
        if ( ! elId ) {
            const newEl = document.createElement('div');
            newEl.setAttribute('id',`key_${id}`);
            newEl.setAttribute('class','messageId');
            newEl.innerHTML = id;
            newEl.addEventListener('click', () => {
                if ( !this.cmdPressed ) {
                    document.querySelectorAll("div[selected='selected']").forEach((e) => {
                        e.removeAttribute('selected');
                    });                    
                } 
                const selected = newEl.getAttribute('selected');
                if ( selected === 'selected') {
                    newEl.removeAttribute('selected');
                    document.getElementById(`msg_${id}`).removeAttribute('selected');
                } else {
                    newEl.setAttribute('selected', 'selected');
                    document.getElementById(`msg_${id}`).setAttribute('selected', 'selected');
                }
            });
            let added = false;
            const messagesIds = document.getElementById('messageIds');
            messagesIds.querySelectorAll(".messageId").forEach((e) => {
                if ( (!added) && (e.id.localeCompare(newEl.id) === 1) ) {
                    added = true;
                    messagesIds.insertBefore(newEl, e);
                }
            });  
            if (!added) {
                messagesIds.append(newEl);
            }  
        } else {
            elId.innterHTML = id;
        }
        let elMsg = document.getElementById(`msg_${id}`);

        if ( elMsg ) {
            elMsg.innerHTML = text;
        } else {
            const newEl = document.createElement('div');
            newEl.setAttribute('id',`msg_${id}`);
            newEl.setAttribute('class','messageBody');
            newEl.innerHTML = text;
            newEl.addEventListener('click', () => {
                document.querySelectorAll(".messageBody[focused='focused'").forEach((e) => {
                    e.removeAttribute('focused');
                });
                newEl.setAttribute('focused','focused');
                if ( this.messages[id].coords.length > 0 ) {
                    this.openMap.addMarkerGroup(this.messages[id].coords, newEl.innerHTML, this.markerStyle);
                    this.openMap.jumpTo(this.messages[id].stats.minlat, this.messages[id].stats.minlon, 7);

                }
            });
            let added = false;
            const messagesBodies = document.getElementById('messageBodies');
            messagesBodies.append(newEl);
            messagesBodies.querySelectorAll(".messageBody").forEach((e) => {
                if ( (!added) && (e.id.localeCompare(newEl.id) === -1) ) {
                    added = true;
                    messagesBodies.insertBefore(newEl, e);
                }
            });  
            if (!added) {
                messagesBodies.append(newEl);
            }  
        }
    }

    makeSafe(text) {
        const safeEl = document.getElementById('safe') || (() => {
            const el = document.createElement('div');
            el.setAttribute('id','safe');
            document.body.append(el);
            return el;
        })();
        safeEl.textContent = text;
        return safeEl.textContent;
    }
    toLatLonFloat(d,m,sign) {
        m = m.replace(',','.')
        const pos = +(d) + (m)/60.0;
        if ( sign == 'S' || sign == 'W') {
            return -pos;
        }
        return pos;
    }
}





const openMap = new OpenSeaMap();
openMap.drawmap();

const uiControl = new UIControl({openMap});


document.getElementById('loadmap').addEventListener('click', () => {
    const mapExtents = openMap.getMapExtents()
    console.log("Map Extents are ", mapExtents);
    let zoomLevel = 6;
    let lon = mapExtents[0];
    let lat = mapExtents[1]; 
    openMap.jumpToCoordinates([lon, lat], zoomLevel);
    let zoomedMapExtents = openMap.getMapExtents();
    const viewMap = () => {
        lon = zoomedMapExtents[2];
        if ( lon >= mapExtents[2]) {
            lon = mapExtents[0];
            lat = zoomedMapExtents[3];
            if ( lat >= mapExtents[3]) {
                lat = mapExtents[1];
                zoomLevel = zoomLevel + 1;
                if ( zoomLevel == 12) {
                    console.log("done");
                    return;
                }
            }
        }
        console.log(`viewing lat:${lat} lon:${lon} zoom:${zoomLevel}`);
        openMap.jumpToCoordinates([lon, lat], zoomLevel);
        zoomedMapExtents = openMap.getMapExtents();
        setTimeout(viewMap, 1000);
    };
    setTimeout(viewMap,1000);
})


document.getElementById('clear').addEventListener('click', () => {
    localStorage.clear();
    document.getElementById('messageIds').innerHTML = '';
    document.getElementById('messageBodies').innerHTML = '';
})


document.getElementById('connect').addEventListener('click', async () => {
    const navtex = new NasaNavtex();
    if ( await navtex.connect() ){
        await navtex.sync(uiControl.updateMessage, uiControl.messages);        
        await navtex.disconnect();
        uiControl.saveMessages();
        uiControl.cancelMessages();
    } else {
        console.log('Navtex reciever not found');
    }

});





