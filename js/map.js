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
function attachBoundaryLabel(mapInstance, mapElementId, labelElementId, boundaryBounds){

    const mapEl = document.getElementById(mapElementId);
    const labelEl = document.getElementById(labelElementId);

    if(!mapEl || !labelEl || !boundaryBounds || !boundaryBounds.isValid()){
        return;
    }

    const anchorLatLng = [boundaryBounds.getCenter().lat, boundaryBounds.getEast()];

    function updateBoundaryLabelPosition(){

        const point = mapInstance.latLngToContainerPoint(anchorLatLng);

        labelEl.style.left = `${point.x}px`;
        labelEl.style.top = `${point.y}px`;

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
    scrollWheelZoom: false
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
parisBoundaryPane.style.zIndex = 450;
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

parisMap.fitBounds(parisViewBounds);

addCityBoundary(parisMap, "data/Paris_boundary.geojson", null, parisBounds, true, false, {
    color: "#cfe4ff",
    weight: 2,
    opacity: 0.5,
    fillOpacity: 0
}, false).then(boundaryBounds => {
    attachBoundaryLabel(parisMap, "mapParis", "boundaryLabelParis", boundaryBounds);
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

// ---------- India map ----------

const indiaMap = L.map("mapIndia", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false
});

L.control.zoom({ position: "topright" }).addTo(indiaMap);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
        maxZoom:18,
        pane: "tilePane"
    }
).addTo(indiaMap);

const indiaBoundaryPane = indiaMap.createPane("boundaryPane");
indiaBoundaryPane.style.zIndex = 450;
indiaBoundaryPane.style.pointerEvents = "none";

const indiaBounds = L.latLngBounds([

    [6.756296109978467,68.1793251401011],
    [33.1708291236821,97.1670581391707]

]);

let indiaOverlay2016 = L.imageOverlay(
    "images/India/India_2016.png",
    indiaBounds,
    {
        opacity:1
    }
).addTo(indiaMap);

let indiaOverlay2025 = L.imageOverlay(
    "images/India/India_2025.png",
    indiaBounds,
    {
        opacity:0
    }
).addTo(indiaMap);

indiaOverlay2016.once("load", function () {

    indiaOverlay2016.getElement().style.mixBlendMode = "normal";
    indiaOverlay2016.getElement().style.maskImage = "none";
    indiaOverlay2016.getElement().style.webkitMaskImage = "none";

});

indiaOverlay2025.once("load", function () {

    indiaOverlay2025.getElement().style.mixBlendMode = "normal";
    indiaOverlay2025.getElement().style.maskImage = "none";
    indiaOverlay2025.getElement().style.webkitMaskImage = "none";

});

indiaMap.fitBounds(indiaBounds);

addCityBoundary(indiaMap, "data/India_boundary.geojson", null, indiaBounds, true).then(() => {

    indiaOverlay2016.setBounds(indiaBounds);
    indiaOverlay2025.setBounds(indiaBounds);

});

// ---------- India year toggle ----------

const indiaBtn2016 = document.getElementById("indiaBtn2016");
const indiaBtn2025 = document.getElementById("indiaBtn2025");

function setIndiaYear(year){

    const showLater = year === "2025";

    indiaOverlay2016.setOpacity(showLater ? 0 : 1);
    indiaOverlay2025.setOpacity(showLater ? 1 : 0);

    if(indiaBtn2016) indiaBtn2016.classList.toggle("active", !showLater);
    if(indiaBtn2025) indiaBtn2025.classList.toggle("active", showLater);

}

if(indiaBtn2016){
    indiaBtn2016.addEventListener("click", () => setIndiaYear("2016"));
}

if(indiaBtn2025){
    indiaBtn2025.addEventListener("click", () => setIndiaYear("2025"));
}

setIndiaYear("2016");

// ---------- Gujarat map ----------

// --- GUJARAT MAP ---
const gujaratMap = L.map("mapGujarat", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.1,
    zoomDelta: 0.1
});

L.control.zoom({ position: "topright" }).addTo(gujaratMap);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    { maxZoom: 18 }
).addTo(gujaratMap);

const gujaratBounds = L.latLngBounds([
    [21.00, 72.00],
    [22.50, 73.20]
]);

// 2016 layer — starts fully visible
let gujarat2016 = L.imageOverlay(
    "images/Gujarat/Gujarat_2016.png",
    gujaratBounds,
    { opacity: 0.85, className: "city-overlay-sharp" }
).addTo(gujaratMap);

// 2025 layer — starts invisible, fades in on scroll
let gujarat2025 = L.imageOverlay(
    "images/Gujarat/Gujarat_2025.png",
    gujaratBounds,
    { opacity: 0, className: "city-overlay-sharp" }
).addTo(gujaratMap);

gujarat2016.once("load", function() {
    gujarat2016.getElement().style.mixBlendMode = "screen";
});
gujarat2025.once("load", function() {
    gujarat2025.getElement().style.mixBlendMode = "screen";
});

gujaratMap.fitBounds(gujaratBounds);

// --- CLICK-DRIVEN CROSSFADE ---
// Clicking a year button crossfades to that year and highlights the active button
const gujaratBtn2016 = document.getElementById("gujaratBtn2016");
const gujaratBtn2025 = document.getElementById("gujaratBtn2025");

function setGujaratYear(year) {
    const showLater = year === "2025";

    gujarat2016.setOpacity(showLater ? 0 : 0.85);
    gujarat2025.setOpacity(showLater ? 0.85 : 0);

    if (gujaratBtn2016) gujaratBtn2016.classList.toggle("active", !showLater);
    if (gujaratBtn2025) gujaratBtn2025.classList.toggle("active", showLater);
}

if (gujaratBtn2016) {
    gujaratBtn2016.addEventListener("click", () => setGujaratYear("2016"));
}
if (gujaratBtn2025) {
    gujaratBtn2025.addEventListener("click", () => setGujaratYear("2025"));
}

setGujaratYear("2016");