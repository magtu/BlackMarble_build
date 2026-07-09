const width = 1100;
const height = 120;
const margin = {
    top: 20,
    right: 30,
    bottom: 35,
    left: 40
};

const svg = d3
    .select("#chart")
    .attr("width", width)
    .attr("height", height)
    .attr("style", "background: transparent;");

const events = [

    {
        month: 12,
        title: "Seasonal cycle",
        text: "Winter nights are consistently brighter than summer because nights are longer."
    },

    {
        month: 72,
        title: "LED transition",
        text: "Berlin gradually replaced sodium streetlights with LEDs."
    },

    {
        month: 74,
        title: "COVID-19",
        text: "Explore whether the pandemic changed Berlin's nighttime radiance."
    }

];

d3.csv("data/Berlin_Radiance_2014_2025.csv").then(data => {

    data.forEach(d => {
        d.radiance = +d.radiance;
    });

    const x = d3.scaleLinear()
        .domain([0, data.length - 1])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.radiance))
        .nice()
        .range([height - margin.bottom, margin.top]);

    // ---------- Glow ----------
    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d.radiance))
        .curve(d3.curveCatmullRom);

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4d8fff")
        .attr("stroke-width", 8)
        .attr("opacity", 0.08)
        .attr("d", line);

    // ---------- Main line ----------
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#d9e8ff")
        .attr("stroke-width", 2)
        .attr("d", line);

    // ---------- Event markers ----------
    events.forEach(event => {

        svg.append("circle")
            .attr("cx", x(event.month))
            .attr("cy", y(data[event.month].radiance))
            .attr("r", 4)
            .attr("fill", "#ffcc66");

    });

    // ---------- Current month ----------
    const indicator = svg.append("circle")
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "#6da8ff")
        .attr("stroke-width", 2)
        .attr("cx", x(0))
        .attr("cy", y(data[0].radiance));

    // ---------- Mouse interaction ----------
    svg.on("mousemove", function(event){

        const [mouseX] = d3.pointer(event);

        let month = Math.round(x.invert(mouseX));

        month = Math.max(0, Math.min(data.length - 1, month));

        indicator
            .attr("cx", x(month))
            .attr("cy", y(data[month].radiance));

        updateMonth(month);

    });

    // ---------- Year axis ----------
    const yearTicks = [];

    for(let year = 2014; year <= 2025; year++){

        yearTicks.push({
            value: (year - 2014) * 12,
            label: String(year)
        });

    }

    const axis = d3.axisBottom(x)
        .tickValues(yearTicks.map(d => d.value))
        .tickFormat((d, i) => yearTicks[i].label);

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(axis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line")
            .attr("stroke", "#333"))
        .call(g => g.selectAll("text")
            .attr("fill", "#8a8a8a")
            .attr("font-size", 12)
            .attr("font-family", "Arial"));

});

const kyivSvg = d3
    .select("#chartKyiv")
    .attr("width", width)
    .attr("height", height)
    .attr("style", "background: transparent;");

const kyivEvents = [

    {
        month: 0,
        title: "Beginning of the record",
        text: "This is the beginning of the Black Marble record. Kyiv appears as a brightly illuminated European capital before years of political upheaval and war."
    },

    {
        month: 1,
        title: "Euromaidan",
        text: "The Euromaidan protests culminated in February 2014, marking a turning point in Ukraine's modern history. Explore whether Kyiv's nighttime radiance shows noticeable changes during this period."
    },

    {
        month: 97,
        title: "Full-scale invasion",
        text: "On 24 February 2022, Russia launched its full-scale invasion of Ukraine. Nighttime satellite imagery provides a unique perspective on how conflict can affect urban lighting and everyday life."
    },

    {
        month: 105,
        title: "Energy infrastructure attacks",
        text: "Beginning in October 2022, repeated attacks on Ukraine's energy infrastructure caused widespread power outages and planned blackouts. Compare Kyiv's nighttime brightness with previous years."
    },

    {
        month: 110,
        title: "Recovery",
        text: "Electricity supply gradually stabilized during 2023. Explore how Kyiv's nighttime illumination changed as the power grid recovered."
    }

];

d3.csv("data/Kyiv_Radiance_2014_2025.csv").then(data => {

    data.forEach(d => {
        d.radiance = +d.radiance;
    });

    const x = d3.scaleLinear()
        .domain([0, data.length - 1])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.radiance))
        .nice()
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d.radiance))
        .curve(d3.curveCatmullRom);

    kyivSvg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4d8fff")
        .attr("stroke-width", 8)
        .attr("opacity", 0.08)
        .attr("d", line);

    kyivSvg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#d9e8ff")
        .attr("stroke-width", 2)
        .attr("d", line);

    kyivEvents.forEach(event => {

        kyivSvg.append("circle")
            .attr("cx", x(event.month))
            .attr("cy", y(data[event.month].radiance))
            .attr("r", 4)
            .attr("fill", "#ffcc66");

    });

    const indicator = kyivSvg.append("circle")
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "#6da8ff")
        .attr("stroke-width", 2)
        .attr("cx", x(0))
        .attr("cy", y(data[0].radiance));

    kyivSvg.on("mousemove", function(event){

        const [mouseX] = d3.pointer(event);

        let month = Math.round(x.invert(mouseX));

        month = Math.max(0, Math.min(data.length - 1, month));

        indicator
            .transition()
            .duration(260)
            .ease(d3.easeCubicOut)
            .attr("cx", x(month))
            .attr("cy", y(data[month].radiance));

        updateKyivMonth(month);

    });

    const yearTicks = [];

    for(let year = 2014; year <= 2025; year++){

        yearTicks.push({
            value: (year - 2014) * 12,
            label: String(year)
        });

    }

    const axis = d3.axisBottom(x)
        .tickValues(yearTicks.map(d => d.value))
        .tickFormat((d, i) => yearTicks[i].label);

    kyivSvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(axis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line")
            .attr("stroke", "#333"))
        .call(g => g.selectAll("text")
            .attr("fill", "#8a8a8a")
            .attr("font-size", 12)
            .attr("font-family", "Arial"));

});

const detroitSvg = d3
    .select("#chartDetroit")
    .attr("width", width)
    .attr("height", height)
    .attr("style", "background: transparent;");

const detroitEvents = [

    {
        index: 1,
        title: "LED conversion begins",
        text: "Residential streets converted to LED"
    },

    {
        index: 2,
        title: "Conversion complete",
        text: "All 65,000 streetlights converted — satellite records sharp drop"
    },

    {
        index: 4,
        title: "New baseline",
        text: "Post-conversion baseline established"
    }

];

d3.csv("data/Detroit_Radiance_2014_2024.csv").then(data => {

    data.forEach(d => {
        d.radiance = +d.radiance;
    });

    const x = d3.scaleLinear()
        .domain([0, data.length - 1])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.radiance))
        .nice()
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d.radiance))
        .curve(d3.curveCatmullRom);

    detroitSvg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#4d8fff")
        .attr("stroke-width", 8)
        .attr("opacity", 0.08)
        .attr("d", line);

    detroitSvg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#d9e8ff")
        .attr("stroke-width", 2)
        .attr("d", line);

    detroitEvents.forEach(event => {

        detroitSvg.append("circle")
            .attr("cx", x(event.index))
            .attr("cy", y(data[event.index].radiance))
            .attr("r", 4)
            .attr("fill", "#ffcc66");

    });

    const indicator = detroitSvg.append("circle")
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "#6da8ff")
        .attr("stroke-width", 2)
        .attr("cx", x(0))
        .attr("cy", y(data[0].radiance));

    detroitSvg.on("mousemove", function(event){

        const [mouseX] = d3.pointer(event);

        let index = Math.round(x.invert(mouseX));

        index = Math.max(0, Math.min(data.length - 1, index));

        indicator
            .attr("cx", x(index))
            .attr("cy", y(data[index].radiance));

        updateDetroitYear(index);

    });

    const yearTicks = [];

    for(let i = 0; i <= data.length - 1; i++){

        yearTicks.push({
            value: i,
            label: String(2014 + i)
        });

    }

    const axis = d3.axisBottom(x)
        .tickValues(yearTicks.map(d => d.value))
        .tickFormat((d, i) => yearTicks[i].label);

    detroitSvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(axis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line")
            .attr("stroke", "#333"))
        .call(g => g.selectAll("text")
            .attr("fill", "#8a8a8a")
            .attr("font-size", 12)
            .attr("font-family", "Arial"));

});