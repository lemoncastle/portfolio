import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitleElement = document.querySelector('.projects-title');

if (projectsTitleElement) {
    projectsTitleElement.textContent = (projects.length).toString() + " Projects(fake)";
}

let svg = d3.select('#ppie-plot')
            .append('g') // Append a group element
            .attr('transform', 'translate(0, 0)'); // Keep it centered

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let data = [
    { value: 1, label: 'apples' },
    { value: 2, label: 'oranges' },
    { value: 3, label: 'mangos' },
    { value: 4, label: 'pears' },
    { value: 5, label: 'limes' },
    { value: 5, label: 'cherries' },
];

let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));

let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Append arcs to the selected SVG
arcData.forEach((d, idx) => {
    svg.append('path')
        .attr('d', arcGenerator(d))
        .attr('fill', colors(idx));
});

let legend = d3.select('.legend');
data.forEach((d, idx) => {
    legend.append('li')
          .attr('class', 'legend-item') // Adds class for styling
          .attr('style', `--color:${colors(idx)}`) // Uses dynamic color
          .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});