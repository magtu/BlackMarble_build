// ======================================================
// MAP.JS
// ======================================================

// ---------- Leaflet ----------

const map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false
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

function addCityBoundary(mapInstance, geojsonPath, imageOverlayInstance, fallbackBounds, drawBoundary = true, keepLargestOnly = false, boundaryStyle = null){

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

                mapInstance.fitBounds(boundaryBounds);

            }else if(fallbackBounds){

                if(imageOverlayInstance){
                    imageOverlayInstance.setBounds(fallbackBounds);
                }

                mapInstance.fitBounds(fallbackBounds);

            }

        });

}

const bounds = L.latLngBounds([

    [52.33,13.05],
    [52.67,13.77]

]);

let berlinGlowWideOverlay = L.imageOverlay(
    "images/Berlin/Berlin_2014_01.png",
    bounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(map);

let berlinGlowOverlay = L.imageOverlay(
    "images/Berlin/Berlin_2014_01.png",
    bounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(map);

let overlay = L.imageOverlay(
    "images/Berlin/Berlin_2014_01.png",
    bounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp berlin-warm"
    }
).addTo(map);

overlay.once("load", function () {

    overlay.getElement().style.mixBlendMode = "normal";

});

map.fitBounds(bounds);

addCityBoundary(map, "data/Berlin_boundaries.geojson", overlay, bounds).then(() => {

    berlinGlowOverlay.setBounds(overlay.getBounds());
    berlinGlowWideOverlay.setBounds(overlay.getBounds());

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

// ---------- Month Names ----------

const monthNames = [

    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"

];

// ---------- Stories ----------

const stories = {

    "2014-01":
        "NASA's Black Marble is a monthly satellite product that measures artificial light emitted from Earth's surface. Explore twelve years of observations over Berlin.",

    "2020-03":
        "COVID-19 restrictions affected activity across many cities. Explore whether Berlin's nighttime radiance shows a noticeable change.",

    "2020-01":
        "Berlin gradually replaced sodium streetlights with LEDs. Because the VIIRS sensor is less sensitive to blue-rich LED light, changes are not always reflected directly in the satellite measurements."

};

// ---------- Radiance ----------

let radianceData=[];

d3.csv("data/Berlin_Radiance_2014_2025.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    radianceData=data;

    updateMonth(0);

});

// ======================================================
// UPDATE
// ======================================================

function updateMonth(index){

    const year=2014+Math.floor(index/12);

    const month=(index%12)+1;

    const monthString=String(month).padStart(2,"0");

    // ---------- Image ----------

    setOverlayImage(

        overlay,
        `images/Berlin/Berlin_${year}_${monthString}.png`,
        berlinGlowOverlay,
        berlinGlowWideOverlay

    );

    // ---------- Date ----------

    if(mapDate){

        setTextContent(

            mapDate,
            `${monthNames[month-1]} ${year}`

        );

    }

    // ---------- Radiance ----------

    if(radianceData.length){

        setTextContent(

            radiance,
            radianceData[index].radiance.toFixed(2) + " nW/cm²/sr"

        );

    }

    // ---------- Story ----------

    const key=`${year}-${monthString}`;

    if(stories[key]){

        setTextContent(storyText, stories[key]);

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

    [50.05,30.20],
    [50.70,31.00]

]);

let kyivGlowWideOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2014_01.png",
    kyivBounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(kyivMap);

let kyivGlowOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2014_01.png",
    kyivBounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(kyivMap);

let kyivOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2014_01.png",
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

addCityBoundary(kyivMap, "data/Kyiv_boundaries.geojson", kyivOverlay, kyivBounds).then(() => {

    kyivGlowOverlay.setBounds(kyivOverlay.getBounds());
    kyivGlowWideOverlay.setBounds(kyivOverlay.getBounds());

});

const kyivMapDate = document.getElementById("mapDateKyiv");
const kyivStoryText = document.getElementById("storyTextKyiv");
const kyivRadiance = document.getElementById("radianceKyiv");

const kyivStories = {

    "2014-01":
        "This is the beginning of the Black Marble record. Kyiv appears as a brightly illuminated European capital before years of political upheaval and war.",

    "2014-02":
        "The Euromaidan protests culminated in February 2014, marking a turning point in Ukraine's modern history. Explore whether Kyiv's nighttime radiance shows noticeable changes during this period.",

    "2022-02":
        "On 24 February 2022, Russia launched its full-scale invasion of Ukraine. Nighttime satellite imagery provides a unique perspective on how conflict can affect urban lighting and everyday life.",

    "2022-10":
        "Beginning in October 2022, repeated attacks on Ukraine's energy infrastructure caused widespread power outages and planned blackouts. Compare Kyiv's nighttime brightness with previous years.",

    "2023-03":
        "Electricity supply gradually stabilized during 2023. Explore how Kyiv's nighttime illumination changed as the power grid recovered."

};

let kyivRadianceData=[];

d3.csv("data/Kyiv_Radiance_2014_2025.csv").then(data=>{

    data.forEach(d=>{

        d.radiance=+d.radiance;

    });

    kyivRadianceData=data;

    updateKyivMonth(0);

});

function updateKyivMonth(index){

    const year=2014+Math.floor(index/12);

    const month=(index%12)+1;

    const monthString=String(month).padStart(2,"0");

    setOverlayImage(

        kyivOverlay,
        `images/Kyiv/Kyiv_${year}_${monthString}.png`,
        kyivGlowOverlay,
        kyivGlowWideOverlay

    );

    if(kyivMapDate){

        setTextContent(

            kyivMapDate,
            `${monthNames[month-1]} ${year}`

        );

    }

    if(kyivRadianceData.length){

        setTextContent(

            kyivRadiance,
            kyivRadianceData[index].radiance.toFixed(2) + " nW/cm²/sr"

        );

    }

    const key=`${year}-${monthString}`;

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
    scrollWheelZoom: false
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

const detroitBounds = L.latLngBounds([

    [42.255,-83.288],
    [42.450,-82.910]

]);

let detroitGlowWideOverlay = L.imageOverlay(
    "images/Detroit/Detroit_2014.png",
    detroitBounds,
    {
        opacity:0.5,
        className:"glow-overlay-wide"
    }
).addTo(detroitMap);

let detroitGlowOverlay = L.imageOverlay(
    "images/Detroit/Detroit_2014.png",
    detroitBounds,
    {
        opacity:0.7,
        className:"glow-overlay"
    }
).addTo(detroitMap);

let detroitOverlay = L.imageOverlay(
    "images/Detroit/Detroit_2014.png",
    detroitBounds,
    {
        opacity:0.9,
        className:"city-overlay-sharp"
    }
).addTo(detroitMap);

detroitOverlay.once("load", function () {

    detroitOverlay.getElement().style.mixBlendMode = "normal";

});

detroitMap.fitBounds(detroitBounds);

addCityBoundary(detroitMap, "data/Detroit_boundaries.geojson", detroitOverlay, detroitBounds, true, true, {
    color: "#cfe4ff",
    weight: 2,
    opacity: 0.3,
    fillOpacity: 0
}).then(() => {

    detroitGlowOverlay.setBounds(detroitOverlay.getBounds());
    detroitGlowWideOverlay.setBounds(detroitOverlay.getBounds());

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
        detroitGlowOverlay,
        detroitGlowWideOverlay

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
        opacity:1
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

// ---------- India compare divider ----------

const indiaCompare = document.getElementById("indiaCompare");
const indiaDivider = document.getElementById("indiaDivider");
const indiaMapEl = document.getElementById("mapIndia");

// The divider is pinned to a real longitude (not a fixed container %), so it
// stays aligned with the image's clip boundary when the map is panned/zoomed.
let indiaDividerLng = indiaBounds.getCenter().lng;

function updateIndiaDividerDisplay(){

    const mapRect = indiaMapEl.getBoundingClientRect();
    const point = indiaMap.latLngToContainerPoint([indiaBounds.getCenter().lat, indiaDividerLng]);
    const percent = (point.x / mapRect.width) * 100;

    if(indiaDivider){

        indiaDivider.style.left = `${percent}%`;

    }

    const imgEl = indiaOverlay2025.getElement();

    if(imgEl){

        const imgRect = imgEl.getBoundingClientRect();
        const imgOffsetX = imgRect.left - mapRect.left;
        const imgPercent = ((point.x - imgOffsetX) / imgRect.width) * 100;
        const clipLeft = Math.max(0, Math.min(100, imgPercent));

        // Clip the LEFT side of the 2025 (top) layer so it only shows to the
        // right of the divider, letting 2016 (bottom layer) show through on
        // the left - matching the "2016" / "2025" label positions.
        imgEl.style.clipPath = `inset(0 0 0 ${clipLeft}%)`;

    }

}

function updateIndiaDividerFromEvent(event){

    const mapRect = indiaMapEl.getBoundingClientRect();
    const x = event.clientX - mapRect.left;
    const latlng = indiaMap.containerPointToLatLng([x, mapRect.height / 2]);

    indiaDividerLng = latlng.lng;

    updateIndiaDividerDisplay();

}

if(indiaDivider && indiaCompare){

    indiaDivider.addEventListener("pointerdown", event => {

        event.preventDefault();
        indiaDivider.setPointerCapture(event.pointerId);
        updateIndiaDividerFromEvent(event);

    });

    indiaDivider.addEventListener("pointermove", event => {

        if(event.buttons !== 1){
            return;
        }

        updateIndiaDividerFromEvent(event);

    });

    indiaMap.on("move zoom", updateIndiaDividerDisplay);

    updateIndiaDividerDisplay();

}