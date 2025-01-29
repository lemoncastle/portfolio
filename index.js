import { fetchJSON, renderProjects,fetchGitHubData} from '../global.js';

//for top 3 projects on home page
const projects = await fetchJSON('../lib/projects.json'); //assumes projects.json located in lib folder relative to index.js
const latestProjects = projects.slice(0, 3);

const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

//for github profile information
const githubData = await fetchGitHubData('lemoncastle');
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
    profileStats.innerHTML = `
          <dl>
            <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
            <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
            <dt>Followers:</dt><dd>${githubData.followers}</dd>
            <dt>Following:</dt><dd>${githubData.following}</dd>
          </dl>
      `;
  }