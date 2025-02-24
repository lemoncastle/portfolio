import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitleElement = document.querySelector('.projects-title');

// if (projectsTitleElement) {
//     projectsTitleElement.textContent = (projects.length).toString() + " Projects(fake)";
// }

let selectedIndex = -1;
let query = '';
let data = []

function renderPieChart(projectsGiven) {
    let newSVG = d3.select('svg');
    newSVG.selectAll('path').remove();
    d3.select('.legend').selectAll('*').remove();
    
    let svg = newSVG.append('g') // Append a group element
        .attr('transform', 'translate(0, 0)'); // Keep it centered

    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

    //input real data
    let rolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );
    
    data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
    
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    
    arcData.forEach((d, i) => {
        svg.append('path')
            .attr('d', arcGenerator(d))
            .attr('fill', colors(i))
            .on('click',() =>{
                selectedIndex = selectedIndex === i ? -1 : i;
                svg
                    .selectAll('path')
                    .attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '');

                legend
                    .selectAll('li')
                    .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
                
                renderFilteredProjects(data);
            });
    });
    
    let legend = d3.select('.legend');
    data.forEach((d, idx) => {
        legend.append('li')
                .attr('style', `--color:${colors(idx)}`)
                .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
    });
}

function renderFilteredProjects(data) {
    let filteredProjects = projects;

    if (query) {
        filteredProjects = filteredProjects.filter((project) =>
            Object.values(project).join(' ').toLowerCase().includes(query)
        );
    }

    if (selectedIndex !== -1) {
        let selectedYear = data[selectedIndex].label; // Use the passed `data`
        filteredProjects = filteredProjects.filter((project) => project.year === selectedYear);
    }

    renderProjects(filteredProjects, projectsContainer, 'h2');
}

renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();
    selectedIndex = -1;
    let filteredProjects = projects.filter(project => 
        Object.values(project).join(' ').toLowerCase().includes(query)
    );

    renderFilteredProjects(data);
    renderPieChart(filteredProjects); // Render filtered pie chart
});
