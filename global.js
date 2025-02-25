console.log('you semll');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [ // this is an array of elements where each element has url and title
    { url: '/', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'meta/', title: 'Meta' },
    { url: 'https://github.com/lemoncastle', title: 'Profile' }
];

let nav = document.createElement('nav'); //creates a new nav thing
document.body.prepend(nav); // this places the new nav we made and puts it at the top of body using prepend

const BASE_PATH = location.pathname.startsWith('/portfolio') ? '/portfolio/' : '/';
const ARE_WE_HOME = document.documentElement.classList.contains('Home');

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    
    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }
    
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }

    if (a.host !== location.host) {
        a.target = "_blank"
    }
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light">Light</option>
            <option value="dark">Dark</option>    
        </select>
    </label>
    `
); //<option value="light dark">Auto</option> 

const select = document.querySelector('.color-scheme select'); 
select.addEventListener('input', function (event) {
    setTheme(event.target.value);
    localStorage.colorScheme = event.target.value; //local storage for theme
});

document.addEventListener('DOMContentLoaded', () => { //default theme is light
    const savedScheme = localStorage.colorScheme || 'light';
    setTheme(savedScheme);
    select.value = savedScheme;
});

function setTheme(scheme) {
    document.documentElement.style.setProperty('color-scheme', scheme);
    if (scheme === 'dark') {
        document.documentElement.style.setProperty('--text-color', 'canvastext');
    } else {
        document.documentElement.style.setProperty('--text-color', '#454545');
    }
}

const form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
    event.preventDefault();

    const data = new FormData(form);
    let url = form.action + '?'; 

    for (let [name, value] of data) {
        value = encodeURIComponent(value); 
        url += `${name}=${value}&`;
    }

    url = url.slice(0, -1); 
    location.href = url;
});

export async function fetchJSON(url) {
    try {
        // Fetch the JSON file from the given URL
        const response = await fetch(url);

        if (!response.ok) { // Check if the request was successful
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json(); // Parse and return the JSON data
        return data;

    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(project, containerElement, headingLevel = 'h2') {
    if (!(containerElement instanceof HTMLElement)) { // checks if valid type or not 
        console.error("Not a DOM Element.");
        return;
    }

    containerElement.innerHTML = ''; // clear element

    project.forEach(project => { // bruh you need to make it a loop...
        // define title, image and description first and fill it with default text
        const title = project.title || "No Title";
        const image = project.image || "picture";
        const description = project.description || "No Description Available";
        const year = project.year || 1;

        const article = document.createElement('article');
        
        article.innerHTML = `
            <${headingLevel}>${title}</${headingLevel}>
            <img src="${image}" alt="${title}">
            <p>${description}</p>
            <p> c.${year}</p>
        `;

        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
  }