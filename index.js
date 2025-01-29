import { fetchJSON, renderProjects,fetchGitHubData} from '../global.js';
const projects = await fetchJSON('../lib/projects.json'); //assumes projects.json located in lib folder relative to index.js
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');