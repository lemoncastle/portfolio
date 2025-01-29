import { fetchJSON, renderProjects } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitleElement = document.querySelector('.projects-title');

if (projectsTitleElement) {
    projectsTitleElement.textContent = (projects.length).toString() + " Projects";
}