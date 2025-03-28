let data = [];
let commits = [];
let filteredCommits = [];
let xScale = d3.scaleTime();
let yScale = d3.scaleLinear();
let brushSelection = null;
let selectedCommits = [];
let accumulatedCommits = []; // Stores all commits that have been loaded so far

//slider
let commitProgress = 100;
let timeScale;
let commitMaxTime;
const slider = document.getElementById('commit-slider');
const commitTime = document.getElementById('time-slider');

//step2?????????????????
let lines;
let files = [];

//scrolly
let NUM_ITEMS = 31; // Ideally, let this value be the length of your commit history
let ITEM_HEIGHT = 75; // Feel free to change
let VISIBLE_COUNT = 4; // Feel free to change as well
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');


//scrolly2
const scrollContainer3 = d3.select('#scroll-container3');
const spacer3 = d3.select('#spacer3');
spacer3.style('height', `${totalHeight}px`);
const itemsContainer3 = d3.select('#items-container3');


updateTooltipVisibility(false);

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    processCommits();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    updateCommitTime(); // Initial update
    renderItems(itemsContainer, 0); // Initial render
    renderItems(itemsContainer3, 0); // Initial render
});

scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(itemsContainer, startIndex);
});

scrollContainer3.on('scroll', () => {
    const scrollTop = scrollContainer3.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(itemsContainer3, startIndex);
});

// Event listener for slider
slider.addEventListener('input', updateCommitTime);
function updateCommitTime() {
    const sliderValue = slider.value;
    const commitMaxTime = timeScale.invert(sliderValue);
    commitTime.textContent = commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' });
    filteredCommits = commits.filter((commit) => commit.datetime <= commitMaxTime);
    
    lines = filteredCommits.flatMap((d) => d.lines);
    files = d3
        .groups(lines, (d) => d.file)
        .map(([name, lines]) => {
    return { name, lines };
    });

    updateScatterPlot(filteredCommits);
    displayStats();
    renderFiles(files);
}

function processCommits() {
    const baseURL = 'https://github.com/lemoncastle/portfolio/commit/';
    commits = d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
  
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          author, date, time, timezone, datetime, 
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
          url: `${baseURL}${commit}`
        };
        
        Object.defineProperty(ret, 'lines', {
            value: lines,
            configurable: true,
            writable: false,
            enumerable: true
        });

        return ret;
      });
    // Initialize timeScale and commitMaxTime after commits are populated
    timeScale = d3.scaleTime([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)], [0, 100]);
    commitMaxTime = timeScale.invert(commitProgress);
}

function displayStats() {
    
    d3.select('#stats').selectAll('dl').remove(); // Clear existing stats
    const dl = d3.select('#stats').append('dl').attr('class', 'stats'); // Create dl element

    dl.append('dt').text('Commits'); // Total commits
    dl.append('dd').text(filteredCommits.length);

    dl.append('dt').text('Files'); // number of files
    dl.append('dd').text(d3.rollup(filteredCommits.flatMap(commit => commit.lines), (v) => v.length, (d) => d.file).size);

    dl.append('dt').html('Lines of Code'); // Total Lines of Code
    dl.append('dd').text(filteredCommits.flatMap(commit => commit.lines).length);

    dl.append('dt').text('First commit'); // first commit
    dl.append('dd').text(d3.min(filteredCommits, (d) => d.date).toLocaleDateString());

    dl.append('dt').text('Last commit'); // latest commit
    dl.append('dd').text(d3.max(filteredCommits, (d) => d.date).toLocaleDateString());
}

function updateScatterPlot(filteredCommits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);

    d3.select('svg').remove(); // Remove existing SVG element
    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
    
    xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredCommits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

    // define axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    
    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([5, 30]);

    svg.selectAll('g').remove(); // clear the scatters in order to re-draw the filtered ones    
    const dots = svg.append('g').attr('class', 'dots');
    
    svg // Add X axis
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg // Add Y axis
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
    
    dots.selectAll('circle').remove(); 
    dots
        .selectAll('circle').data(sortedCommits).join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', '#b19cd9')
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', function (event, d) {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            d3.select(event.currentTarget).classed('selected', true); // change color on hover
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', function () {
            d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
            d3.select(event.currentTarget).classed('selected', false); // change color on hover
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });
    
        const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
    
    // gridlines as axis with no labels and full-width ticks COOL !
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    brushSelector();
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const linesEdited = document.getElementById('commit-lines');
  
    if (Object.keys(commit).length === 0) return;
    link.textContent = commit.id;
    
    link.href = commit.url;
    
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    linesEdited.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    brushSelection = event.selection;
    selectedCommits = !brushSelection
    ? []
    : filteredCommits.filter((commit) => {
        let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
        let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
        let x = xScale(commit.date);
        let y = yScale(commit.hourFrac);

        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
    });

    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}
  
function updateSelection() { 
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d)); 
}

function updateSelectionCount() {
    const selectedCommits = brushSelection? filteredCommits.filter(isCommitSelected): [];
  
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
      ? filteredCommits.filter(isCommitSelected)
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : filteredCommits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  
    return breakdown;
}

function renderFiles(files) {
    d3.select('.files').selectAll('div').remove(); // clear element
    files = d3.sort(files, (d) => -d.lines.length); // sort by # lines
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    // Bind data to new div elements and append them to the .files container
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');

    let dt = filesContainer.append('dt'); // wrap into dt
    dt.append('code').text(d => d.name);
    dt.append('small').text(d => `Lines: ${d.lines.length}`);
    
    filesContainer.append('dd')
            .selectAll('div')
            .data(d => d.lines)
            .enter()
            .append('div')
            .attr('class', 'line')
            .style('background', (line) => fileTypeColors(line.type));
}

function renderItems(container, startIndex) {
    container.selectAll('div').remove(); // Clear existing commit text items
    
    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);
    
    if (startIndex + VISIBLE_COUNT >= commits.length) {
        // At the end, keep all commits
        accumulatedCommits = commits.slice(0, commits.length);
    } else if (startIndex > accumulatedCommits.length) {
        // Scroll down - Add new commits
        accumulatedCommits = [...new Set([...accumulatedCommits, ...newCommitSlice])];
    } else {
        // Scroll - Remove older commits
        const minIndex = Math.max(0, startIndex - VISIBLE_COUNT);
        accumulatedCommits = commits.slice(minIndex, endIndex);
    }
    if (container.attr('id') === 'items-container') {
        updateScatterPlot(accumulatedCommits);
    }
    filteredCommits = accumulatedCommits;
    container.selectAll('div') 
        .data(newCommitSlice)
        .enter()
        .append('div')
        .html((d, index) => `  
            <p>  
                On ${d.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, I  
                <a href="${d.url}" target="_blank">  
                    ${index > 0 ? 'made another meaningful contribution' : 'committed for the first time, marking a glorious milestone'}  
                </a>, editing ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.  
                Today’s commit? <strong>made the repo cooler</strong>  
            </p>   
        `)
        .style('position', 'absolute')
        .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT}px`);
    
    if(container.attr('id') === 'items-container3') {
        displayCommitFiles();
    }
}

function displayCommitFiles() {
    const lines = filteredCommits.flatMap((d) => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => {
      return { name, lines };
    });
    files = d3.sort(files, (d) => -d.lines.length);
    d3.select('.files').selectAll('div').remove();
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
    filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    filesContainer.append('dd')
                  .selectAll('div')
                  .data(d => d.lines)
                  .enter()
                  .append('div')
                  .attr('class', 'line')
                  .style('background', d => fileTypeColors(d.type));
  }