console.log('you semll');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [ // this is an array of elements where each element has url and title
    { url: '/', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/lemoncastle', title: 'Profile' }
];

let nav = document.createElement('nav'); //creates a new nav thing
document.body.prepend(nav); // this places the new nav we made and puts it at the top of body using prepend

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
            <option value="light dark">Auto</option>    
            <option value="light">Light</option>
            <option value="dark">Dark</option>    
        </select>
    </label>
    `
);

const select = document.querySelector('.color-scheme select'); //have to add select variable I guess ? I asked chatgpt to help me cause it wasn't working without this
select.addEventListener('input', function (event) {
    
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
    console.log('color scheme changed to', event.target.value);
});

document.addEventListener('DOMContentLoaded', () => { //sets default theme (to light) cause fuck dark mode - chatgpt helped me with this
    document.documentElement.style.setProperty('color-scheme', select.value="light");

    if ('colorScheme' in localStorage) { //chatgpt told me to put this here instead 
        document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
        select.value = localStorage.colorScheme; // Update the dropdown to match the saved theme
    }

});

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