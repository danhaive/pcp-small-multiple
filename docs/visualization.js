const keyz = "w [t]";

const h = 10; // global bandwidth parameter
const densityMaxHeight = 0.5;
const margin = { top: 100, right: 50, bottom: 50, left: 150 },
    width = 1500 - margin.left - margin.right,
    cplot_width = 600,
    height = 700 - margin.top - margin.bottom,
    padding = 10,
    spacing = 70;
let size;

let x = {},
    y = {},
    z = {},
    dscale = {},
    dragging = {},
    extents = {},
    currentExtents = {};;

let xScatter,
    yScatter,
    xAxis,
    yAxis;

let allData;

let line = d3.line().curve(d3.curveMonotoneY),
    area = d3.area().curve(d3.curveMonotoneX),
    axis = d3.axisTop(),
    background,
    foreground,
    densityValues = [],
    density;

let svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const imgPartialURL = "https://github.mit.edu/6894-sp19/Design-space-exploration-with-small-multiples/blob/master/docs/images/";
const csvURL = "https://raw.githubusercontent.com/danhaive/pcp-small-multiple/master/docs/data.csv"
// Initialization of visualization of variables
const data = d3.csv(csvURL, d3.autoType).then(function (designs) {
    // Extract the list of dimensions and create a scale for each.
    keys = d3.keys(designs[0])
    x = d3.scalePoint(keys, [0, height])
    keys.map(function (d) {
        extents[d] = d3.extent(designs, function (p) { return +p[d]; })
        y[d] = d3.scaleLinear()
            .domain(extents[d])
            .range([0, cplot_width]);
    })
    x.domain(dimensions = keys);
    z = d3.scaleSequential(d3.extent(designs, function (p) { return +p[keyz]; }), d3.interpolatePlasma);

    const n = keys.length;
    size = x.step(); // size of scatter plots
    currentExtents = Object.assign(currentExtents, extents);

    let len = designs.length;
    let indices = new Array(len);
    for (let i = 0; i < len; ++i) indices[i] = i;
    indices.sort((a, b) => d3.descending(designs[a][keyz], designs[b][keyz]));

    const sorted_designs = indices.map(i => designs[i]);
    allData = sorted_designs
    /* #region Parallel Coordinate Plot*/
    // Add grey background lines for context.
    background = svg.append("g")
        .attr("class", "background")
        .selectAll("path")
        .data(allData)
        .enter().append("path")
        .attr("d", path);

    // compute densityValues   
    updateDensityValues(allData)

    // add densityValues
    density = svg.append("g")
        .attr("class", "density")
        .selectAll("path")
        .data(densityValues)
        .enter().append("path")
        .attr("d", density_path)

    // Add foreground lines for focus.
    foreground = svg.append("g")
        .attr("class", "foreground")
        .selectAll("path")
        .data(sorted_designs)
        .enter().append("path")
        .attr("d", path)
        .attr("stroke", d => z(d[keyz]));


    // Add a group element for each dimension.
    var g = svg.selectAll(".dimension")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function (d) { return "translate(0," + x(d) + ")"; });

    // Add and store a brush for each axis.
    g.append("g")
        .attr("class", "brush")
        .each(function (d) {
            d3.select(this).call(y[d].brush = d3.brushX(y[d]).extent([[0, -size / 4], [cplot_width, size / 4]]).on("start", brushstart).on("brush", brush));
        })
        .selectAll("rect")
        .attr("y", -size / 4)
        .attr("height", size / 2);
    // Add an axis and title.
    g.append("g")
        .attr("class", "parallel")
        .each(function (d) { d3.select(this).call(axis.scale(y[d])); })
        .append("text")
        .style("text-anchor", "end")
        .style("background-color", "white")
        .attr("x", cplot_width + spacing / 2 - padding)
        .attr("y", -size / 2 + padding)
        .attr("fill", "currentColor")
        .attr("font-size", 15)
        .text(function (d) { return d; });
    g.selectAll("text")
        .clone(true).lower()
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .attr("stroke", "white");



    /* #endregion */
    /* #region Scatter Plots */

    xScatter = d3.scaleLinear()
        .range([0, size - 2 * padding]);
    yScatter = d3.scaleLinear()
        .range([size, 2 * padding]);
    xAxis = d3.axisBottom()
        .scale(xScatter)
        .ticks(3);
    yAxis = d3.axisLeft()
        .scale(yScatter)
        .ticks(3);
    // xAxis.tickSize(-size * n);
    // yAxis.tickSize(-size * n);


    svg.selectAll(".x.axis")
        .data(keys.slice(0, n - 1))
        .enter().append("g")
        .attr("class", "x axis")
        .attr("transform", function (d, i) { return "translate(" + ((i) * size + cplot_width + spacing) + "," + height + ")"; })
        .each(function (d) { xScatter.domain(extents[d]); d3.select(this).call(xAxis); })
        .append("text")
        .style("text-anchor", "end")
        .style("background-color", "white")
        .attr("x", size / 2)
        .attr("y", 35)
        .attr("fill", "currentColor")
        .attr("font-size", 15)
        .text(function (d) { return d; });

    svg.selectAll(".y.axis")
        .data(keys.slice(1, n))
        .enter().append("g")
        .attr("class", "y axis")
        .attr("transform", function (d, i) { return "translate(" + (cplot_width + spacing) + "," + (i) * size + ")"; })
        .each(function (d) { yScatter.domain(extents[d]); d3.select(this).call(yAxis); });

    svg.selectAll(".cell")
        .data(cross(keys))
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", function (d) { return "translate(" + ((cplot_width + spacing) + (d.i) * size) + "," + (d.j - 1) * size + ")"; })
        .each(plot);

    let div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function plot(p) {
        let cell = d3.select(this);
        xScatter.domain(extents[p.x]);
        yScatter.domain(extents[p.y]);

        cell.append("rect")
            .attr("class", "frame")
            .attr("x", 0)
            .attr("y", 2 * padding)
            .attr("width", size - 2 * padding)
            .attr("height", size - 2 * padding);

        cell.selectAll("circle")
            .data(allData)
            .enter().append("circle")
            .attr("cx", function (d) { return xScatter(d[p.x]); })
            .attr("cy", function (d) { return yScatter(d[p.y]); })
            .attr("r", 4)
            .style("fill", d => z(d[keyz]))
            .on("mouseover", function (d, ind) {
                svg.selectAll("g.foreground")
                    .selectAll("path")
                    .filter(function (e, i) { if (i == ind) { d3.select(this).transition().duration(200).ease(d3.easeQuadInOut).style("stroke-width", "10") }; })
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                // div.html("<img src=\""+imgPartialURL[0] + (indices[ind] + 1) + imgPartialURL[1]+"\">")
                //     .style("left", (d3.event.pageX) + "px")
                //     .style("top", (d3.event.pageY - 28) + "px");
                // div.html("<img src=\""+imgPartialURL+"glyph-" + (indices[ind]+1) + ".png\">")
                // .style("left", (d3.event.pageX) + "px")
                // .style("top", (d3.event.pageY - 28) + "px")
                div.html("<img src=\"images/glyph-" + (indices[ind]+1) + ".png\">")
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d, ind) {
                svg.selectAll("g.foreground")
                    .selectAll("path")
                    .filter(function (e, i) { if (i == ind) { d3.select(this).transition().duration(500).ease(d3.easeQuadInOut).style("stroke-width", "1.5") }; })
                div.transition()
                    .duration(200)
                    .style("opacity", 0);
            });
    }

    /* #endregion */


});


function position(d) {
    var v = dragging[d];
    return v == null ? x(d) : v;
}

function transition(g) {
    return g.transition().duration(500);
}

// Returns the path for a given data point.
function path(d) {
    return line(dimensions.map(function (p) { return [y[p](d[p]), position(p)]; }));
}

function density_path(d) {
    p = d[0]
    area.y0(position(p));
    return area(d[1].map(function (x) {
        return [y[p](x[0]), position(p) - Math.max(dscale[p](x[1]))];
    }));
}

function brushstart() {
    d3.event.sourceEvent.stopPropagation();
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
    const actives = [];
    // filter brushed extents
    svg.selectAll('.brush')
        .filter(function (d) {
            return d3.brushSelection(this);
        })
        .each(function (d) {
            actives.push({
                dimension: d,
                extent: d3.brushSelection(this)
            });
        });


    let isSelected = [];
    actives.forEach(function (active) {
        const dim = active.dimension;
        currentExtents[dim] = [y[dim].invert(active.extent[0]), y[dim].invert(active.extent[1])]
    });

    // set un-brushed foreground line disappear and update array of selected data
    foreground.style('display', function (d) {
        selected = actives.every(function (active) {
            const dim = active.dimension;
            return active.extent[0] <= y[dim](d[dim]) && y[dim](d[dim]) <= active.extent[1];
        });
        isSelected.push(selected);
        return selected ? null : 'none';
    });


    let checkbox = document.getElementById('checkboxScaling');
    console.log(checkbox.checked)

    if (checkbox.checked) {
        rescale(currentExtents, 0);
    }

    svg.selectAll("circle").classed("hidden", function (d) {
        selected = actives.every(function (active) {
            const dim = active.dimension;
            return active.extent[0] <= y[dim](d[dim]) && y[dim](d[dim]) <= active.extent[1];
        });
        return selected ? null : 'none';
    });

    // recompute distributions
    // filter selected data
    selectedData = allData.filter((d, ind) => isSelected[ind])

    //update densityValues
    updateDensityValues(selectedData)
    let areaGraph = svg.selectAll("g.density");
    areaGraph.selectAll("path").remove();
    areaGraph
        .selectAll("path")
        .data(densityValues)
        .enter().append("path")
        .attr("d", density_path)
}

function rescale(customExtents, duration) {
    svg.selectAll(".x.axis")
        .each(function (d) {
            if (customExtents[d]) { xScatter.domain(customExtents[d]); d3.select(this).transition().call(xAxis); }
        });

    svg.selectAll(".y.axis")
        .each(function (d) {
            if (customExtents[d]) { yScatter.domain(customExtents[d]); d3.select(this).transition().call(yAxis); }
        });
    svg.selectAll(".cell").each(function (d) {
        d3.select(this).selectAll("circle")
            .each(
                function (e) {
                    xScatter.domain(customExtents[d.x]);
                    yScatter.domain(customExtents[d.y]);
                    let x = xScatter(e[d.x]);
                    let y = yScatter(e[d.y]);
                    if ((y > size || y < 2 * padding) || (x > size - 2 * padding || x < 0)) {
                        d3.select(this).attr("visibility", "hidden");
                    }
                    else {
                        d3.select(this).attr("visibility", "visible");
                        d3.select(this).transition().delay(50).duration(duration).attr("cx", x).attr("cy", y);
                    }
                })
    });
}

function rescaleClick() {

    let checkbox = document.getElementById('checkboxScaling');
    let rescaleExtents = {}
    rescaleExtents = Object.assign(rescaleExtents, (checkbox.checked) ? currentExtents : extents);
    rescale(rescaleExtents, 500);
}

// Utility Functions and Statistics 

function cross(a) {
    let c = [], n = a.length, i, j;
    for (j = 1; j < n; j++) for (i = 0; i < j; i++) { c.push({ x: a[i], i: i, y: a[j], j: j }); }
    return c;
}

function updateDensityValues(data) {
    densityValues = [];
    for (let i = 0;
        i < keys.length; i++) {
        let k = keys[i];
        let arr = [];
        data.forEach(data => arr.push(data[k]));
        const min_y = extents[k][0];
        const max_y = extents[k][1];
        const bandwidth = (max_y - min_y) / h;
        arr = kernelDensityEstimator(kernelEpanechnikov(bandwidth), range(20, min_y, max_y))(arr);
        densityValues.push([k, arr]);
        dscale[k] = d3.scaleLinear().domain([0, d3.max(arr, function (p) { return p[1]; })]).range([0, height * densityMaxHeight / (keys.length - 1)]);
    }
}

function range(size, startAt, endAt) {
    let arr = [];
    const step = (endAt - startAt) * 1.0 / (size - 1);
    for (let i = 0; i < size; i++) {
        arr.push(startAt + i * step);
    }
    return arr;
}

function kernelDensityEstimator(kernel, X) {
    return function (V) {
        return X.map(function (x) {
            return [x, d3.mean(V, function (v) { if (v) { return kernel(x - v); } })];
        });
    };
}

function kernelEpanechnikov(k) {
    return function (v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}

