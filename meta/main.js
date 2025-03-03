let data = [];
let commits = [];
let filteredCommits = [];
let xScale = d3.scaleTime();
let yScale = d3.scaleLinear();
let brushSelection = null;
let selectedCommits = [];

//slider
let commitProgress = 100;
let timeScale;
let commitMaxTime;
const slider = document.getElementById('commit-slider');
const commitTime = document.getElementById('time-slider');

//step2?????????????????
let lines;
let files = [];

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