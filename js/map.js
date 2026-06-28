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

function addCityBoundary(mapInstance, geojsonPath, imageOverlayInstance, fallbackBounds){

    return fetch(geojsonPath)
        .then(response => response.json())
        .then(data => {

            const boundaryLayer = L.geoJSON(data, {
                pane: "boundaryPane",
                filter: feature => feature.geometry && feature.geometry.type !== "Point",
                style: {
                    color: "#cfe4ff",
                    weight: 1,
                    opacity: 0.25,
                    fillOpacity: 0
                }
            });

            boundaryLayer.addTo(mapInstance);

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

let overlay = L.imageOverlay(
    "images/Berlin/Berlin_2014_01.png",
    bounds,
    {
        opacity:0.9
    }
).addTo(map);

overlay.once("load", function () {

    overlay.getElement().style.mixBlendMode = "normal";

});

map.fitBounds(bounds);

addCityBoundary(map, "data/Berlin_boundaries.geojson", overlay, bounds);

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

function setOverlayImage(overlayInstance, imageUrl){

    overlayInstance.setUrl(imageUrl);

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
        `images/Berlin/Berlin_${year}_${monthString}.png`

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

let kyivOverlay = L.imageOverlay(
    "images/Kyiv/Kyiv_2014_01.png",
    kyivBounds,
    {
        opacity:0.9
    }
).addTo(kyivMap);

kyivOverlay.once("load", function () {

    kyivOverlay.getElement().style.mixBlendMode = "normal";

});

kyivMap.fitBounds(kyivBounds);

addCityBoundary(kyivMap, "data/Kyiv_boundaries.geojson", kyivOverlay, kyivBounds);

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
        `images/Kyiv/Kyiv_${year}_${monthString}.png`

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