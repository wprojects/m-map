let map, hexLayer;

const GeoUtils = {
    EARTH_RADIUS_METERS: 6371000,

    radiansToDegrees: (r) => r * 180 / Math.PI,
    degreesToRadians: (d) => d * Math.PI / 180,

    getDistanceOnEarthInMeters: (lat1, lon1, lat2, lon2) => {
        const lat1Rad  = GeoUtils.degreesToRadians(lat1);
        const lat2Rad  = GeoUtils.degreesToRadians(lat2);
        const lonDelta = GeoUtils.degreesToRadians(lon2 - lon1);
        const x = Math.sin(lat1Rad) * Math.sin(lat2Rad) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lonDelta);
        return GeoUtils.EARTH_RADIUS_METERS * Math.acos(Math.max(Math.min(x, 1), -1));
    }
};

const ZOOM_TO_H3_RES_CORRESPONDENCE = {
    5: 1,
    6: 2,
    7: 3,
    8: 3,
    9: 4,
    10: 5,
    11: 6,
    12: 6,
    13: 7,
    14: 8,
    15: 9,
    16: 9,
    17: 10,
    18: 10,
    19: 11,
    20: 11,
    21: 12,
    22: 13,
    23: 14,
    24: 15,
};

const H3_RES_TO_ZOOM_CORRESPONDENCE = {};
for (const [zoom, res] of Object.entries(ZOOM_TO_H3_RES_CORRESPONDENCE)) {
    H3_RES_TO_ZOOM_CORRESPONDENCE[res] = zoom;
}

// //Add a marker 
// var marker = new khtml.maplib.overlay.Marker({
//         position: new khtml.maplib.LatLng(36.16912885013463, -94.0705505944486), 
//         map: map,
//         title:"static marker"
// });

 // const loc = (36.16912885013463. -94.0705505944486);
 const lat1 = 36.16912885013463;
 const lng1 = -94.0705505944486;
//  var markers = new OpenLayers.Layer.Markers( "Markers" );
//  map.addLayer(markers);

//  markers.addMarker(new OpenLayers.Marker(36.16912885013463. -94.0705505944486)));
//  function add_map_point(lat1, lng1) {
//       var vectorLayer = new ol.layer.Vector({
//         source:new ol.source.Vector({
//           features: [new ol.Feature({
//                 geometry: new ol.geom.Point(ol.proj.transform([parseFloat(lng1), parseFloat(lat1)], 'EPSG:4326', 'EPSG:3857')),
//             })]
//         }),
//         style: new ol.style.Style({
//           image: new ol.style.Icon({
//             anchor: [0.5, 0.5],
//             anchorXUnits: "fraction",
//             anchorYUnits: "fraction",
//             src: "https://upload.wikimedia.org/wikipedia/commons/e/ec/RedDot.svg"
//           })
//         })
//       });

//       map.addLayer(vectorLayer); 
//     }

// var map = L.map('map').setView([51.505, -0.09], 13);

// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);

// L.marker([51.5, -0.09]).addTo(map)
//     .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
//     .openPopup();



const getH3ResForMapZoom = (mapZoom) => {
    return ZOOM_TO_H3_RES_CORRESPONDENCE[mapZoom] ?? Math.floor((mapZoom - 1) * 0.7);
};

const h3BoundsToPolygon = (lngLatH3Bounds) => {
    lngLatH3Bounds.push(lngLatH3Bounds[0]); // "close" the polygon
    return lngLatH3Bounds;
};

/**
 * Parse the current Query String and return its components as an object.
 */
const parseQueryString = () => {
    const queryString = window.location.search;
    const query = {};
    const pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
};

const queryParams = parseQueryString();

const copyToClipboard = (text) => {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
};

var app = new Vue({
    el: "#app",

    data: {
        searchH3Id: undefined,
        gotoLatLon: undefined,
        currentH3Res: undefined,

    },

    computed: {
    },

    methods: {

        computeAverageEdgeLengthInMeters: function(vertexLocations) {
            let totalLength = 0;
            let edgeCount = 0;
            for (let i = 1; i < vertexLocations.length; i++) {
                const [fromLat, fromLng] = vertexLocations[i - 1];
                const [toLat, toLng] = vertexLocations[i];
                const edgeDistance = GeoUtils.getDistanceOnEarthInMeters(fromLat, fromLng, toLat, toLng);
                totalLength += edgeDistance;
                edgeCount++;
            }
            return totalLength / edgeCount;
        },

        updateMapDisplay: function() {
            if (hexLayer) {
                hexLayer.remove();
            }

            hexLayer = L.layerGroup().addTo(map);

            const zoom = map.getZoom();
            this.currentH3Res = getH3ResForMapZoom(zoom);
            const { _southWest: sw, _northEast: ne} = map.getBounds();

            const boundsPolygon =[
                [ sw.lat, sw.lng ],
                [ ne.lat, sw.lng ],
                [ ne.lat, ne.lng ],
                [ sw.lat, ne.lng ],
                [ sw.lat, sw.lng ],
            ];

            const h3s = h3.polyfill(boundsPolygon, this.currentH3Res);
            const hexes = ["8626ed087ffffff", "8626ed09fffffff", "8626ed08fffffff"];

            for (const h3id of h3s) {

                const polygonLayer = L.layerGroup()
                    .addTo(hexLayer);

                const isSelected = h3id === this.searchH3Id;
                // const isSelected = h3id === "8826ed730dfffff";
                // const test = h3id === "8626ed08fffffff";
                // const test2 = ["8626ed0d7ffffff", "8626ed09fffffff"];
                // const test4 = h3id === "8626ed09fffffff";

                const style3 = hexes.includes(h3id) ? { fillColor: "purple" } : {};

              
//Colors the hex in 
                // const style = test ? { fillColor: "orange" } : {};
                // const style2 = test4 ? { fillColor: "orange" } : {};

                const h3Bounds = h3.h3ToGeoBoundary(h3id);
                const averageEdgeLength = this.computeAverageEdgeLengthInMeters(h3Bounds);
                const cellArea = h3.cellArea(h3id, "m2");

                const tooltipText = `
                Cell ID: <b>${ h3id }</b>
                <br />
                Average edge length (m): <b>${ averageEdgeLength.toLocaleString() }</b>
                <br />
                Cell area (m^2): <b>${ cellArea.toLocaleString() }</b>
                `;

                const h3Polygon = L.polygon(h3BoundsToPolygon(h3Bounds), style3)
                    .on('click', () => copyToClipboard(h3id))
                    .bindTooltip(tooltipText)
                    .addTo(polygonLayer);
                
              // const h3Polygon2 = L.polygon(h3BoundsToPolygon(h3Bounds), style3)
              //       .on('click', () => copyToClipboard(h3id))
              //       .bindTooltip(tooltipText)
              //       .addTo(polygonLayer);

                // less SVG, otherwise perf is bad
                if (Math.random() > 0.8 || isSelected) {
                    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
                    svgElement.setAttribute('viewBox', "0 0 200 200");
                    svgElement.innerHTML = `<text x="20" y="70" class="h3Text">${h3id}</text>`;
                    var svgElementBounds = h3Polygon.getBounds();
                    L.svgOverlay(svgElement, svgElementBounds).addTo(polygonLayer);
                }
            }
        },

        gotoLocation: function() {
            const [lat, lon] = (this.gotoLatLon || "").split(",").map(Number);
            if (Number.isFinite(lat) && Number.isFinite(lon)
                && lat <= 90 && lat >= -90 && lon <= 180 && lon >= -180) {
                map.setView([lat, lon], 16);
            }
        },

        findH3: function() {
            if (!h3.h3IsValid(this.searchH3Id)) {
                return;
            }
            const h3Boundary = h3.h3ToGeoBoundary(this.searchH3Id);

            let bounds = undefined;

            for ([lat, lng] of h3Boundary) {
                if (bounds === undefined) {
                    bounds = new L.LatLngBounds([lat, lng], [lat, lng]);
                } else {
                    bounds.extend([lat, lng]);
                }
            }

            map.fitBounds(bounds);

            const newZoom = H3_RES_TO_ZOOM_CORRESPONDENCE[h3.h3GetResolution(this.searchH3Id)];
            map.setZoom(newZoom);
        }
    },

    beforeMount() {
    },

    mounted() {
        document.addEventListener("DOMContentLoaded", () => {
            map = L.map('mapid');
          
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                minZoom: 5,
                maxNativeZoom: 19,
                maxZoom: 24,
                attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            }).addTo(map);
            pointsLayer = L.layerGroup([]).addTo(map);
          
          rcbLoc = [36.2, -94.0705505944486]
          testLoc = [36.16912885013463, -94.0705505944486]

//Marker example to add to map for street addresses
          L.marker(rcbLoc).addTo(map)
              .bindPopup('Steel Works Example Business 501-336-1610')
              .openPopup();
          L.marker(testLoc).addTo(map)
              .bindPopup('W Works Office 501-980-1450')
              .openPopup();

            // const initialLat = queryParams.lat ?? 0;
            // const initialLng = queryParams.lng ?? 0;
            const initialLat = 36.16912885013463;
            const initialLng = -94.0705505944486;
            const initialZoom = queryParams.zoom ?? 12;
            map.setView([initialLat, initialLng], initialZoom);
            map.on("zoomend", this.updateMapDisplay);
            map.on("moveend", this.updateMapDisplay);

            const { h3 } = queryParams;
            console.log(h3)
            if (h3) {
                this.searchH3Id = h3;
                window.setTimeout(() => this.findH3(), 50);
            }

            this.updateMapDisplay();
        });
    }
});

