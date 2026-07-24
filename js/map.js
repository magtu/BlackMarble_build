// ======================================================
// MAP.JS
// ======================================================

// ---------- Leaflet ----------

const map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 0.1
});

L.control.zoom({ position: "topright" }).addTo(map);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
        maxZoom:18,
        pane: "tilePane"
    }
).addTo(map);

const boundaryPane = map.createPane("boundaryPane");
boundaryPane.style.zIndex = 450;
boundaryPane.style.pointerEvents = "none";

function stripPointGeometries(feature){

    if(feature.geometry && feature.geometry.type === "GeometryCollection"){

        feature.geometry.geometries = feature.geometry.geometries.filter(
            geometry => geometry.type !== "Point" && geometry.type !== "MultiPoint"
        );

    }

    return feature;

}

function keepLargestPolygon(data){

    let largestFeature = null;
    let largestArea = -Infinity;

    data.features.forEach(feature => {

        const geometry = feature.geometry;

        if(!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")){
            return;
        }

        const bounds = L.geoJSON(feature).getBounds();

        if(!bounds.isValid()){
            return;
        }

        const area = (bounds.getNorth() - bounds.getSouth()) * (bounds.getEast() - bounds.getWest());

        if(area > largestArea){
            largestArea = area;
            largestFeature = feature;
        }

    });

    data.features = largestFeature ? [largestFeature] : data.features;

    return data;

}

function addCityBoundary(mapInstance, geojsonPath, imageOverlayInstance, fallbackBounds, drawBoundary = true, keepLargestOnly = false, boundaryStyle = null, fitView = true){

    return fetch(geojsonPath)
        .then(response => response.json())
        .then(data => {

            data.features = data.features.map(stripPointGeometries);

            if(keepLargestOnly){
                data = keepLargestPolygon(data);
            }

            const boundaryLayer = L.geoJSON(data, {
                pane: "boundaryPane",
                filter: feature => feature.geometry && feature.geometry.type !== "Point" && feature.geometry.type !== "MultiPoint",
                style: boundaryStyle || {
                    color: "#cfe4ff",
                    weight: 1,
                    opacity: 0.25,
                    fillOpacity: 0
                }
            });

            if(drawBoundary){
                boundaryLayer.addTo(mapInstance);
            }

            const boundaryBounds = boundaryLayer.getBounds();

            if(boundaryBounds && boundaryBounds.isValid()){

                if(imageOverlayInstance){
                    imageOverlayInstance.setBounds(boundaryBounds);
                }

                if(fitView){
                    mapInstance.fitBounds(boundaryBounds);
                }

                return boundaryBounds;

            }else if(fallbackBounds){

                if(imageOverlayInstance){
                    imageOverlayInstance.setBounds(fallbackBounds);
                }

                if(fitView){
                    mapInstance.fitBounds(fallbackBounds);
                }

                return fallbackBounds;

            }

        });

}

// Anchors a .boundary-label to the real east edge of a boundary layer so the
// connector line touches the boundary and tracks it as the map pans/zooms.
// clampToContainer keeps the label from being clipped when the anchor point
// falls outside the visible map (e.g. Paris, whose boundary extends past the container edge).
function attachBoundaryLabel(mapInstance, mapElementId, labelElementId, boundaryBounds, clampToContainer = false){

    const mapEl = document.getElementById(mapElementId);
    const labelEl = document.getElementById(labelElementId);

    if(!mapEl || !labelEl || !boundaryBounds || !boundaryBounds.isValid()){
        return;
    }

    const anchorLatLng = [boundaryBounds.getCenter().lat, boundaryBounds.getEast()];

    function updateBoundaryLabelPosition(){

        const point = mapInstance.latLngToContainerPoint(anchorLatLng);

        let x = point.x;
        let y = point.y;

        if(clampToContainer){

            const margin = 16;
            const maxX = Math.max(mapEl.clientWidth - labelEl.offsetWidth - margin, margin);
            const maxY = Math.max(mapEl.clientHeight - margin, margin);

            x = Math.min(Math.max(x, margin), maxX);
            y = Math.min(Math.max(y, margin), maxY);

        }

        labelEl.style.left = `${x}px`;
        labelEl.style.top = `${y}px`;

    }

    mapInstance.on("move zoom", updateBoundaryLabelPosition);

    updateBoundaryLabelPosition();

}

const bounds = L.latLngBounds([

    [52.338,13.088],
    [52.677,13.761]

]);

// View bounds — slightly zoomed in from previous
const berlinViewBounds = L.latLngBounds([
    [52.25, 12.99],
    [52.75, 13.87]
]);

let berlinGlowWideOverlay = L.imageOverlay(
    "images/Berlin/Berlin_2013.png",
    bounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(map);

let berlinGlowOverlay = L.imageOverlay(
    "images/Berlin/Berlin_2013.png",
    bounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(map);

let overlay = L.imageOverlay(
    "images/Berlin/Berlin_2013.png",
    bounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp berlin-warm"
    }
).addTo(map);

overlay.once("load", function () {

    overlay.getElement().style.mixBlendMode = "normal";
    overlay.getElement().style.maskImage = "none";
    overlay.getElement().style.webkitMaskImage = "none";

});

map.setView([52.507, 13.425], 9.5);

map.panBy([-60, 0], { animate: false });

addCityBoundary(map, "data/Berlin_boundaries.geojson", null, bounds, true, false, {
    color: "#cfe4ff",
    weight: 1,
    opacity: 0.2,
    fillOpacity: 0
}, false).then(boundaryBounds => {
    attachBoundaryLabel(map, "map", "boundaryLabelBerlin", boundaryBounds);
});

// ---------- HTML ----------

const mapDate = document.getElementById("mapDate");
const storyText = document.getElementById("storyText");
const radiance = document.getElementById("radiance");

function setTextContent(element, value){

    if(!element){
        return;
    }

    element.textContent = value;

}

function setOverlayImage(overlayInstance, imageUrl, ...glowInstances){

    overlayInstance.setUrl(imageUrl);

    glowInstances.forEach(glowInstance => {

        if(glowInstance){

            glowInstance.setUrl(imageUrl);

        }

    });

}

// ---------- Radiance ----------

let radianceData=[];

d3.csv("data/Berlin_Radiance_2013_2025.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    radianceData=data;

    updateBerlinYear(0);

});

// ======================================================
// UPDATE
// ======================================================

function updateBerlinYear(index){

    const year=2013+index;

    setOverlayImage(

        overlay,
        `images/Berlin/Berlin_${year}.png`,
        berlinGlowOverlay,
        berlinGlowWideOverlay

    );

    if(mapDate){

        setTextContent(mapDate, String(year));

    }

    if(radianceData.length){

        setTextContent(

            radiance,
            radianceData[index].radiance.toFixed(2) + " nW/cm²/sr"

        );

    }

    const key=String(year);

    if(berlinStories[key]){

        setTextContent(storyText, berlinStories[key]);

    }else{

        setTextContent(

            storyText,
            "Move through the timeline to explore Berlin's changing nighttime landscape."

        );

    }

}

// ---------- Kyiv map ----------

const kyivMap = L.map("mapKyiv", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false
});

L.control.zoom({ position: "topright" }).addTo(kyivMap);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
        maxZoom:18,
        pane: "tilePane"
    }
).addTo(kyivMap);

const kyivBoundaryPane = kyivMap.createPane("boundaryPane");
kyivBoundaryPane.style.zIndex = 450;
kyivBoundaryPane.style.pointerEvents = "none";

const kyivBounds = L.latLngBounds([

    [50.213, 30.239],
    [50.590, 30.826]

]);

let kyivGlowWideOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2013.png",
    kyivBounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(kyivMap);

let kyivGlowOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2013.png",
    kyivBounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(kyivMap);

let kyivOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2013.png",
    kyivBounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp"
    }
).addTo(kyivMap);

kyivOverlay.once("load", function () {

    kyivOverlay.getElement().style.mixBlendMode = "normal";

});

kyivMap.fitBounds(kyivBounds);

addCityBoundary(kyivMap, "data/Kyiv_boundaries.geojson", kyivOverlay, kyivBounds).then(boundaryBounds => {

    kyivGlowOverlay.setBounds(kyivOverlay.getBounds());
    kyivGlowWideOverlay.setBounds(kyivOverlay.getBounds());

    attachBoundaryLabel(kyivMap, "mapKyiv", "boundaryLabelKyiv", boundaryBounds);

});

const kyivMapDate = document.getElementById("mapDateKyiv");
const kyivStoryText = document.getElementById("storyTextKyiv");
const kyivRadiance = document.getElementById("radianceKyiv");

let kyivRadianceData=[];

d3.csv("data/Kyiv_Radiance_2013_2025.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    kyivRadianceData=data;

    updateKyivYear(0);

});

function updateKyivYear(index){

    const year=2013+index;

    setOverlayImage(

        kyivOverlay,
        `images/Kyiv/Kyiv_${year}.png`,
        kyivGlowOverlay,
        kyivGlowWideOverlay

    );

    if(kyivMapDate){

        setTextContent(kyivMapDate, String(year));

    }

    if(kyivRadianceData.length){

        setTextContent(

            kyivRadiance,
            kyivRadianceData[index].radiance.toFixed(2) + " nW/cm²/sr"

        );

    }

    const key=String(year);

    if(kyivStories[key]){

        setTextContent(kyivStoryText, kyivStories[key]);

    }else{

        setTextContent(

            kyivStoryText,
            "Move through the timeline to explore Kyiv's changing nighttime landscape."

        );

    }

}

// ---------- Detroit map ----------

const detroitMap = L.map("mapDetroit", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 0.1
});

L.control.zoom({ position: "topright" }).addTo(detroitMap);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    {
        maxZoom:18,
        pane: "tilePane"
    }
).addTo(detroitMap);

const detroitBoundaryPane = detroitMap.createPane("boundaryPane");
detroitBoundaryPane.style.zIndex = 450;
detroitBoundaryPane.style.pointerEvents = "none";

// PNG bounds = Detroit city + 20km buffer (matches GEE export region)
const detroitBounds = L.latLngBounds([

    [42.075, -83.470],
    [42.630, -82.730]

]);

// View bounds - slightly wider than city to show surrounding highways
const detroitCityBounds = L.latLngBounds([

    [42.18,-83.38],
    [42.52,-82.82]

]);

let detroitGlowOverlay = L.imageOverlay(
    "images/Detroit/Detroit_2014.png",
    detroitBounds,
    {
        opacity:0.3,
        className:"glow-overlay detroit-glow"
    }
).addTo(detroitMap);

let detroitOverlay = L.imageOverlay(
    "images/Detroit/Detroit_2014.png",
    detroitBounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp detroit-crisp"
    }
).addTo(detroitMap);

detroitOverlay.once("load", function () {

    detroitOverlay.getElement().style.mixBlendMode = "screen";

});

detroitMap.setView([42.35, -83.15],  9.5);

// Pass null as imageOverlayInstance so boundary doesn't override PNG bounds.
// fitView = false so this doesn't clobber the manual setView() above once
// the geojson fetch resolves.
addCityBoundary(detroitMap, "data/Detroit_boundaries.geojson", null, detroitCityBounds, true, false, {
    color: "#cfe4ff",
    weight: 2,
    opacity: 0.5,
    fillOpacity: 0
}, false).then(boundaryBounds => {
    attachBoundaryLabel(detroitMap, "mapDetroit", "boundaryLabelDetroit", boundaryBounds);
});

const detroitMapDate = document.getElementById("mapDateDetroit");
const detroitStoryText = document.getElementById("storyTextDetroit");
const detroitRadiance = document.getElementById("radianceDetroit");

let detroitRadianceData=[];

d3.csv("data/Detroit_Radiance_2014_2024.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    detroitRadianceData=data;

    updateDetroitYear(0);

});

function updateDetroitYear(index){

    const year=2014+index;

    setOverlayImage(

        detroitOverlay,
        `images/Detroit/Detroit_${year}.png`,
        detroitGlowOverlay

    );

    if(detroitMapDate){

        setTextContent(detroitMapDate, String(year));

    }

    if(detroitRadianceData.length){

        setTextContent(

            detroitRadiance,
            detroitRadianceData[index].radiance.toFixed(2) + " nW/cm²/sr"

        );

    }

    const key=String(year);

    if(detroitStories[key]){

        setTextContent(detroitStoryText, detroitStories[key]);

    }else{

        setTextContent(

            detroitStoryText,
            "Move through the timeline to explore Detroit's changing nighttime landscape."

        );

    }

}

// ---------- Paris map ----------

const parisMap = L.map("mapParis", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 0.1
});

L.control.zoom({ position: "topright" }).addTo(parisMap);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
        maxZoom:18,
        pane: "tilePane"
    }
).addTo(parisMap);

const parisBoundaryPane = parisMap.createPane("boundaryPane");
parisBoundaryPane.style.zIndex = 550;
parisBoundaryPane.style.pointerEvents = "none";

const parisBounds = L.latLngBounds([

    [48.12, 1.45],
    [49.24, 3.56]

]);

// View bounds — slightly zoomed in from full PNG extent
const parisViewBounds = L.latLngBounds([

    [48.22, 1.65],
    [49.10, 3.35]

]);

let parisGlowWideOverlay = L.imageOverlay(
    "images/Paris/Paris_2013.png",
    parisBounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(parisMap);

let parisGlowOverlay = L.imageOverlay(
    "images/Paris/Paris_2013.png",
    parisBounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(parisMap);

let parisOverlay = L.imageOverlay(
    "images/Paris/Paris_2013.png",
    parisBounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp"
    }
).addTo(parisMap);

parisOverlay.once("load", function () {

    parisOverlay.getElement().style.mixBlendMode = "screen";

});

addCityBoundary(parisMap, "data/Paris_boundary.geojson", null, parisBounds, true, false, {
    color: "#cfe4ff",
    weight: 1.5,
    opacity: 0.4,
    fillOpacity: 0
}, false).then(function(boundaryBounds) {

    // Final view set after all overlays and the boundary layer are in place,
    // and before any latLngToContainerPoint calls that need a valid view.
    parisMap.setView([48.60, 2.40], 8.5);

    if(boundaryBounds && boundaryBounds.isValid()) {

        // Custom anchor near the lower-right of the boundary (rather than
        // attachBoundaryLabel's default vertically-centered east edge) so the
        // label's connector line touches the boundary near its southeast curve.
        const parisLabelAnchor = [
            boundaryBounds.getSouth() + (boundaryBounds.getNorth() - boundaryBounds.getSouth()) * 0.15,
            boundaryBounds.getEast() - (boundaryBounds.getEast() - boundaryBounds.getWest()) * 0.08
        ];

        const parisLabelEl = document.getElementById("boundaryLabelParis");
        const parisMapEl = document.getElementById("mapParis");

        function updateParisLabelPosition(){

            if(!parisLabelEl || !parisMapEl){
                return;
            }

            const point = parisMap.latLngToContainerPoint(parisLabelAnchor);
            const margin = 16;
            const maxX = Math.max(parisMapEl.clientWidth - parisLabelEl.offsetWidth - margin, margin);
            const maxY = Math.max(parisMapEl.clientHeight - margin, margin);

            const x = Math.min(Math.max(point.x, margin), maxX);
            const y = Math.min(Math.max(point.y, margin), maxY);

            parisLabelEl.style.left = `${x}px`;
            parisLabelEl.style.top = `${y}px`;

        }

        parisMap.on("move zoom", updateParisLabelPosition);
        updateParisLabelPosition();

    }

});

const parisMapDate = document.getElementById("mapDateParis");
const parisStoryText = document.getElementById("storyTextParis");
const parisRadiance = document.getElementById("radianceParis");

let parisRadianceData=[];

d3.csv("data/Paris_Radiance_2013_2025.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    parisRadianceData=data;

    updateParisYear(0);

});

function updateParisYear(index){

    const year=2013+index;

    setOverlayImage(

        parisOverlay,
        `images/Paris/Paris_${year}.png`,
        parisGlowOverlay,
        parisGlowWideOverlay

    );

    if(parisMapDate){

        setTextContent(parisMapDate, String(year));

    }

    if(parisRadianceData.length){

        setTextContent(

            parisRadiance,
            parisRadianceData[index].radiance.toFixed(2) + " nW/cm²/sr"

        );

    }

    const key=String(year);

    if(parisStories[key]){

        setTextContent(parisStoryText, parisStories[key]);

    }else{

        setTextContent(

            parisStoryText,
            "Move through the timeline to explore how legislation reshaped Paris at night."

        );

    }

}

// ---------- Permian Basin map ----------

const permianMap = L.map("mapPermian", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 1
});

L.control.zoom({ position: "topright" }).addTo(permianMap);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    {
        maxZoom:18,
        pane: "tilePane"
    }
).addTo(permianMap);

const permianBounds = L.latLngBounds([

    [30.50, -105.20],
    [33.80, -100.10]

]);

let permianGlowWideOverlay = L.imageOverlay(
    "images/Permian/Permian_2013.png",
    permianBounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(permianMap);

let permianGlowOverlay = L.imageOverlay(
    "images/Permian/Permian_2013.png",
    permianBounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(permianMap);

let permianOverlay = L.imageOverlay(
    "images/Permian/Permian_2013.png",
    permianBounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp"
    }
).addTo(permianMap);

permianOverlay.once("load", function () {

    permianOverlay.getElement().style.mixBlendMode = "screen";

});

permianMap.setView([32.15, -104.20], 7);

const permianCityLabels = [
    { name: "Midland", coords: [31.9874, -102.01] },
    { name: "Odessa", coords: [31.8157, -102.3676] },
    { name: "Lubbock", coords: [33.6779, -101.7552] },
    { name: "Carlsbad", coords: [32.6207, -104.6288] },
    { name: "Pecos", coords: [31.4229, -103.2932] }
];

permianCityLabels.forEach(city => {

    L.marker(city.coords, {
        icon: L.divIcon({
            className: "permian-city-label",
            html: city.name,
            iconSize: null
        }),
        interactive: false
    }).addTo(permianMap);

});

const permianMapDate = document.getElementById("mapDatePermian");
const permianRadiance = document.getElementById("radiancePermian");
const permianPlayPauseBtn = document.getElementById("permianPlayPause");

// Move the play/pause button inline next to the year label (top-left overlay)
const permianYearLabel = document.createElement("span");
permianYearLabel.textContent = permianMapDate.textContent.trim();
permianMapDate.textContent = "";
permianMapDate.appendChild(permianYearLabel);
permianMapDate.appendChild(permianPlayPauseBtn);

let permianRadianceData=[];

d3.csv("data/Permian_Radiance_2013_2025.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    permianRadianceData=data;

});

// ---------- Permian Basin auto-play animation ----------

const permianYears = [2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];
let permianIndex = 0;
let permianPlaying = true;
let permianInterval = null;

function updatePermianYear(index) {
  const year = permianYears[index];
  const url = `images/Permian/Permian_${year}.png`;
  permianOverlay.setUrl(url);
  permianGlowOverlay.setUrl(url);
  permianGlowWideOverlay.setUrl(url);
  setTextContent(permianYearLabel, String(year));
  if (permianRadianceData.length) {
    const val = permianRadianceData[index];
    setTextContent(
      permianRadiance,
      val ? val.radiance.toFixed(2) + " nW/cm²/sr" : "—"
    );
  }
  updatePermianChartIndicator(index);
}

function startPermianAnimation() {
  permianInterval = setInterval(function() {
    permianIndex = (permianIndex + 1) % permianYears.length;
    updatePermianYear(permianIndex);
  }, 500); // half a second per frame
}

function stopPermianAnimation() {
  clearInterval(permianInterval);
}

permianPlayPauseBtn.addEventListener('click', function() {
  permianPlaying = !permianPlaying;
  this.textContent = permianPlaying ? '⏸' : '▶';
  if (permianPlaying) {
    startPermianAnimation();
  } else {
    stopPermianAnimation();
  }
});

startPermianAnimation();

