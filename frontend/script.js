const API_URL = "";

// Country code mapping for flag images (using flagcdn.com)
const countryCodeMap = {
    'Argentina': 'ar', 'Australia': 'au', 'Belgium': 'be', 'Brazil': 'br',
    'Cameroon': 'cm', 'Canada': 'ca', 'Costa Rica': 'cr', 'Croatia': 'hr',
    'Denmark': 'dk', 'Ecuador': 'ec', 'England': 'gb-eng', 'France': 'fr',
    'Germany': 'de', 'Ghana': 'gh', 'IR Iran': 'ir', 'Japan': 'jp',
    'Mexico': 'mx', 'Morocco': 'ma', 'Netherlands': 'nl', 'Poland': 'pl',
    'Portugal': 'pt', 'Qatar': 'qa', 'Saudi Arabia': 'sa', 'Senegal': 'sn',
    'Serbia': 'rs', 'Korea Republic': 'kr', 'Spain': 'es', 'Switzerland': 'ch',
    'Tunisia': 'tn', 'USA': 'us', 'Uruguay': 'uy', 'Wales': 'gb-wls',
    'Italy': 'it', 'Sweden': 'se', 'Colombia': 'co', 'Peru': 'pe',
    'Ukraine': 'ua', 'Chile': 'cl', 'Nigeria': 'ng', 'Egypt': 'eg',
    'Russia': 'ru', 'Czech Republic': 'cz', 'Austria': 'at', 'Scotland': 'gb-sct',
    'Hungary': 'hu', 'Norway': 'no', 'Turkey': 'tr', 'Algeria': 'dz',
    'Iran': 'ir', 'South Korea': 'kr'
};

function getFlagImg(team, size = 20) {
    const code = countryCodeMap[team];
    if (!code) return `<span class="flag-placeholder">⚽</span>`;
    return `<img src="https://flagcdn.com/w${size}/${code}.png" 
                 srcset="https://flagcdn.com/w${size * 2}/${code}.png 2x"
                 width="${size}" alt="${team}" class="flag-img"
                 onerror="this.outerHTML='⚽'">`;
}

function showView(viewId) {
    document.querySelectorAll('main').forEach(v => v.classList.add('hidden'));
    document.getElementById(`${viewId}-view`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId === 'simulator' ? 'sim-btn' : 'ins-btn').classList.add('active');
    if (viewId === 'insights') loadAnalytics();
}

document.getElementById('run-sim').addEventListener('click', async () => {
    document.getElementById('loading').classList.remove('hidden');
    try {
        const response = await fetch(`${API_URL}/simulate`);
        const data = await response.json();
        renderSimulation(data);
        renderSimulationAnalytics(data);
        document.getElementById('results-container').classList.remove('hidden');
        document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        alert("Failed to connect to backend. Make sure main.py is running!");
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
});

function createMatchEl(m) {
    const div = document.createElement('div');
    div.className = 'match';
    const t1Score = m.t1_goals !== undefined ? m.t1_goals : '-';
    const t2Score = m.t2_goals !== undefined ? m.t2_goals : '-';

    div.innerHTML = `
        <div class="team-row ${m.winner === m.t1 ? 'winner-row' : ''}">
            ${getFlagImg(m.t1, 16)}
            <span class="name">${m.t1}</span>
            <span class="score">${t1Score}</span>
        </div>
        <div class="team-row ${m.winner === m.t2 ? 'winner-row' : ''}">
            ${getFlagImg(m.t2, 16)}
            <span class="name">${m.t2}</span>
            <span class="score">${t2Score}</span>
        </div>
    `;
    return div;
}

function renderSimulation(data) {
    // 1. Render Groups
    const groupGrid = document.getElementById('group-grid');
    groupGrid.innerHTML = '';
    Object.keys(data.groups).sort().forEach(groupName => {
        const groupData = data.groups[groupName];
        const card = document.createElement('div');
        card.className = 'glass-card group-card';
        let tableRows = groupData.map((t, i) => `
            <tr class="${i < 2 ? 'qualified' : ''}">
                <td>${getFlagImg(t.team, 16)} ${t.team}</td>
                <td>${t.points}</td>
                <td>${t.gd}</td>
                <td>${t.gc}</td>
            </tr>
        `).join('');
        card.innerHTML = `
            <h3>Group ${groupName}</h3>
            <table class="group-table">
                <thead><tr><th>Team</th><th>Pts</th><th>GD</th><th>GC</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;
        groupGrid.appendChild(card);
    });

    // 2. Render Bracket
    const bracket = data.bracket;
    const r32 = bracket.R32;
    const r16 = bracket.R16;
    const qf  = bracket.QF;
    const sf  = bracket.SF;
    const final_ = bracket.Final;

    // Split into left/right halves
    const leftR32 = r32.slice(0, 8);
    const leftR16 = r16.slice(0, 4);
    const leftQF  = qf.slice(0, 2);
    const leftSF  = sf.slice(0, 1);

    const rightR32 = r32.slice(8, 16);
    const rightR16 = r16.slice(4, 8);
    const rightQF  = qf.slice(2, 4);
    const rightSF  = sf.slice(1, 2);

    // Clear all round containers
    const ids = ['left-r32','left-r16','left-qf','left-sf','final-match','right-sf','right-qf','right-r16','right-r32'];
    ids.forEach(id => document.getElementById(id).innerHTML = '');

    // Populate left half
    leftR32.forEach(m => document.getElementById('left-r32').appendChild(createMatchEl(m)));
    leftR16.forEach(m => document.getElementById('left-r16').appendChild(createMatchEl(m)));
    leftQF.forEach(m  => document.getElementById('left-qf').appendChild(createMatchEl(m)));
    leftSF.forEach(m  => document.getElementById('left-sf').appendChild(createMatchEl(m)));

    // Populate right half
    rightSF.forEach(m  => document.getElementById('right-sf').appendChild(createMatchEl(m)));
    rightQF.forEach(m  => document.getElementById('right-qf').appendChild(createMatchEl(m)));
    rightR16.forEach(m => document.getElementById('right-r16').appendChild(createMatchEl(m)));
    rightR32.forEach(m => document.getElementById('right-r32').appendChild(createMatchEl(m)));

    // Final
    document.getElementById('final-match').appendChild(createMatchEl(final_));

    // Winner banner
    const banner = document.getElementById('winner-banner');
    banner.classList.remove('hidden');
    document.getElementById('winner-flag').innerHTML = getFlagImg(bracket.Winner, 48);
    document.getElementById('winner-name').textContent = bracket.Winner;
}

// ── Analytics ──
let charts = {};

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/analytics`);
        const data = await response.json();
        renderRankings(data.rankings);
        renderMidfield(data.top_midfield);
        renderPower(data.top_offense, data.top_defense);
    } catch (e) {
        console.error("Analytics load failed", e);
    }
}

function renderRankings(rankings) {
    if (charts.ranking) charts.ranking.destroy();
    const ctx = document.getElementById('rankingsChart').getContext('2d');
    charts.ranking = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: rankings.map(r => r.team),
            datasets: [{
                label: 'FIFA Points',
                data: rankings.map(r => r.points),
                backgroundColor: 'rgba(201, 164, 78, 0.7)',
                borderColor: '#c9a44e', borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { x: { ticks: { color: '#aaa', maxRotation: 45 } }, y: { ticks: { color: '#aaa' } } }
        }
    });
}

function renderMidfield(midfield) {
    if (charts.midfield) charts.midfield.destroy();
    const ctx = document.getElementById('midfieldChart').getContext('2d');
    charts.midfield = new Chart(ctx, {
        type: 'line',
        data: {
            labels: midfield.map(r => r.team),
            datasets: [{
                label: 'Midfield Rating',
                data: midfield.map(r => r.score),
                borderColor: '#2c52ed', backgroundColor: 'rgba(44, 82, 237, 0.1)',
                fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#2c52ed'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { x: { ticks: { color: '#aaa', maxRotation: 45 } }, y: { ticks: { color: '#aaa' } } }
        }
    });
}

function renderPower(offense, defense) {
    if (charts.power) charts.power.destroy();
    const ctx = document.getElementById('powerChart').getContext('2d');
    charts.power = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: offense.slice(0, 8).map(r => r.team),
            datasets: [{
                label: 'Offense', data: offense.slice(0, 8).map(r => r.score),
                borderColor: '#ff4d4d', backgroundColor: 'rgba(255, 77, 77, 0.15)', pointBackgroundColor: '#ff4d4d'
            }, {
                label: 'Defense', data: defense.slice(0, 8).map(r => r.score),
                borderColor: '#c9a44e', backgroundColor: 'rgba(201, 164, 78, 0.15)', pointBackgroundColor: '#c9a44e'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#aaa' }, ticks: { display: false } } }
        }
    });
}

function renderSimulationAnalytics(data) {
    const groupsData = data.groups;
    const bracketData = data.bracket;

    // Reveal the dynamic charts container in the Insights view
    document.getElementById('sim-insights-placeholder').style.display = 'none';
    document.getElementById('sim-insights-grid').style.display = 'grid';

    // Extract all teams from the group stage results
    let allTeams = [];
    Object.values(groupsData).forEach(group => {
        allTeams.push(...group);
    });

    // Identify teams that reached the knockout stage (R32)
    let knockoutTeamNames = new Set();
    if (bracketData && bracketData.R32) {
        bracketData.R32.forEach(match => {
            knockoutTeamNames.add(match.t1);
            knockoutTeamNames.add(match.t2);
        });
    }

    let knockoutTeams = allTeams.filter(t => knockoutTeamNames.has(t.team));

    // Top 10 by Points
    let byPoints = [...allTeams].sort((a, b) => b.points - a.points).slice(0, 10);
    // Top 10 by Goal Difference
    let byGD = [...allTeams].sort((a, b) => b.gd - a.gd).slice(0, 10);
    // Top 10 by Least Goals Conceded (ONLY considering teams that reached knockout stages)
    let byGC = [...knockoutTeams].sort((a, b) => a.gc - b.gc).slice(0, 10);

    if (charts.simPoints) charts.simPoints.destroy();
    const ctxPoints = document.getElementById('simPointsChart').getContext('2d');
    charts.simPoints = new Chart(ctxPoints, {
        type: 'bar',
        data: {
            labels: byPoints.map(t => t.team),
            datasets: [{
                label: 'Group Stage Points',
                data: byPoints.map(t => t.points),
                backgroundColor: 'rgba(44, 82, 237, 0.7)',
                borderColor: '#2c52ed', borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' }, beginAtZero: true } }
        }
    });

    if (charts.simGD) charts.simGD.destroy();
    const ctxGD = document.getElementById('simGDChart').getContext('2d');
    charts.simGD = new Chart(ctxGD, {
        type: 'bar',
        data: {
            labels: byGD.map(t => t.team),
            datasets: [{
                label: 'Goal Difference',
                data: byGD.map(t => t.gd),
                backgroundColor: 'rgba(201, 164, 78, 0.7)',
                borderColor: '#c9a44e', borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' } } }
        }
    });

    if (charts.simGC) charts.simGC.destroy();
    const ctxGC = document.getElementById('simGCChart').getContext('2d');
    charts.simGC = new Chart(ctxGC, {
        type: 'bar',
        data: {
            labels: byGC.map(t => t.team),
            datasets: [{
                label: 'Goals Conceded (Least is Better)',
                data: byGC.map(t => t.gc),
                backgroundColor: 'rgba(255, 77, 77, 0.7)',
                borderColor: '#ff4d4d', borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: { x: { ticks: { color: '#aaa' } }, y: { ticks: { color: '#aaa' }, beginAtZero: true } }
        }
    });
}

// ── Head-to-Head Logic ──
async function loadTeams() {
    try {
        const response = await fetch(`${API_URL}/teams`);
        const teams = await response.json();
        const t1Select = document.getElementById('h2h-team1');
        const t2Select = document.getElementById('h2h-team2');
        
        teams.forEach(team => {
            const opt1 = document.createElement('option');
            opt1.value = team; opt1.textContent = team;
            t1Select.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = team; opt2.textContent = team;
            t2Select.appendChild(opt2);
        });

        // Set different defaults if possible
        if (teams.length > 1) {
            t2Select.selectedIndex = 1;
        }
    } catch (e) {
        console.error("Failed to load teams", e);
    }
}

document.getElementById('h2h-predict-btn').addEventListener('click', async () => {
    const team1 = document.getElementById('h2h-team1').value;
    const team2 = document.getElementById('h2h-team2').value;
    
    if (team1 === team2) {
        alert("Please select two different teams!");
        return;
    }
    
    const btn = document.getElementById('h2h-predict-btn');
    btn.textContent = "Analyzing...";
    btn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/predict_h2h`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team1, team2 })
        });
        const data = await response.json();
        
        // Update UI
        document.getElementById('h2h-result').classList.remove('hidden');
        
        // Update names and flags
        document.getElementById('h2h-name1').textContent = data.team1;
        document.getElementById('h2h-name2').textContent = data.team2;
        document.getElementById('h2h-flag1').innerHTML = getFlagImg(data.team1, 80);
        document.getElementById('h2h-flag2').innerHTML = getFlagImg(data.team2, 80);
        
        // Update probability bar and labels
        const p1 = (data.team1_prob * 100).toFixed(1);
        const p2 = (data.team2_prob * 100).toFixed(1);
        document.getElementById('h2h-prob-lbl1').textContent = `${p1}%`;
        document.getElementById('h2h-prob-lbl2').textContent = `${p2}%`;
        
        // Animate bar
        setTimeout(() => {
            document.getElementById('h2h-prob-bar').style.width = `${p1}%`;
        }, 100);
        
        // Update Stats Team 1
        const s1 = data.team1_stats;
        document.getElementById('h2h-rank1').textContent = s1.rank || '--';
        document.getElementById('h2h-off1').textContent = s1.offense ? s1.offense.toFixed(1) : '--';
        document.getElementById('h2h-def1').textContent = s1.defense ? s1.defense.toFixed(1) : '--';
        document.getElementById('h2h-mid1').textContent = s1.midfield ? s1.midfield.toFixed(1) : '--';
        
        // Update Stats Team 2
        const s2 = data.team2_stats;
        document.getElementById('h2h-rank2').textContent = s2.rank || '--';
        document.getElementById('h2h-off2').textContent = s2.offense ? s2.offense.toFixed(1) : '--';
        document.getElementById('h2h-def2').textContent = s2.defense ? s2.defense.toFixed(1) : '--';
        document.getElementById('h2h-mid2').textContent = s2.midfield ? s2.midfield.toFixed(1) : '--';
        
    } catch (e) {
        console.error("H2H prediction failed", e);
        alert("Prediction failed. Make sure backend is running.");
    } finally {
        btn.textContent = "Analyze Matchup";
        btn.disabled = false;
    }
});

// Load teams initially
loadTeams();

