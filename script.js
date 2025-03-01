const APP_VERSION = '1.1';

// Theme management
function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    saveState();
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : '');
}

// Import/Export functionality
function exportData() {
    const exportData = {
        meta: {
            version: APP_VERSION,
            created: new Date().toISOString()
        },
        config: {
            cutterCapacity: document.getElementById('cutterCapacity').value,
            daysLeft: document.getElementById('daysLeft').value
        },
        commodities: []
    };

    document.querySelectorAll('#mainTable tbody tr').forEach(row => {
        exportData.commodities.push({
            name: row.querySelector('td:first-child').textContent,
            original: row.querySelector('.original').value,
            delivered: row.querySelector('.delivered').value,
            inFC: row.querySelector('.in-fc').value,
            sourceSystem: row.querySelector('.source-system').value,
            station: row.querySelector('.station').value
        });
    });

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colonization-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.commodities || !data.config) throw new Error('Invalid file format');

            document.getElementById('cutterCapacity').value = data.config.cutterCapacity || 792;
            document.getElementById('daysLeft').value = data.config.daysLeft || 27;

            data.commodities.forEach(commodity => {
                const row = [...document.querySelectorAll('#mainTable tbody tr')].find(
                    tr => tr.querySelector('td:first-child').textContent === commodity.name
                );
                if (row) {
                    row.querySelector('.original').value = commodity.original || 0;
                    row.querySelector('.delivered').value = commodity.delivered || 0;
                    row.querySelector('.in-fc').value = commodity.inFC || 0;
                    row.querySelector('.source-system').value = commodity.sourceSystem || '';
                    row.querySelector('.station').value = commodity.station || '';
                }
            });

            calculateAll();
            saveState();
            event.target.value = '';
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// State management
function saveState() {
    const state = {
        config: {
            cutterCapacity: document.getElementById('cutterCapacity').value,
            daysLeft: document.getElementById('daysLeft').value
        },
        commodities: []
    };

    document.querySelectorAll('#mainTable tbody tr').forEach(row => {
        state.commodities.push({
            name: row.querySelector('td:first-child').textContent,
            original: row.querySelector('.original').value,
            delivered: row.querySelector('.delivered').value,
            inFC: row.querySelector('.in-fc').value,
            sourceSystem: row.querySelector('.source-system').value,
            station: row.querySelector('.station').value
        });
    });

    localStorage.setItem('appState', JSON.stringify(state));
}

function loadState() {
    const saved = JSON.parse(localStorage.getItem('appState'));
    if (!saved) return;

    // Add null checks for config
    document.getElementById('cutterCapacity').value = (saved.config && saved.config.cutterCapacity) ? saved.config.cutterCapacity : 792;
    document.getElementById('daysLeft').value = (saved.config && saved.config.daysLeft) ? saved.config.daysLeft : 27;

    // Rest of the function remains the same
    saved.commodities && saved.commodities.forEach(commodity => {
        const row = [...document.querySelectorAll('#mainTable tbody tr')].find(
            tr => tr.querySelector('td:first-child').textContent === commodity.name
        );
        if (row) {
            row.querySelector('.original').value = commodity.original || 0;
            row.querySelector('.delivered').value = commodity.delivered || 0;
            row.querySelector('.in-fc').value = commodity.inFC || 0;
            row.querySelector('.source-system').value = commodity.sourceSystem || '';
            row.querySelector('.station').value = commodity.station || '';
        }
    });
}

function clearStorage() {
    localStorage.removeItem('appState');
    location.reload();
}

// Calculator functionality
const commodities = [
    { name: 'Steel', original: 19908 },
    { name: 'CMM Composite', original: 14442 },
    { name: 'Aluminium', original: 12186 },
    { name: 'Titanium', original: 11217 },
    { name: 'Liquid Oxygen', original: 4873 },
    { name: 'Water', original: 2204 },
    { name: 'Ceramic Composites', original: 1270 },
    { name: 'Polymers', original: 1167 },
    { name: 'Insulating Membrane', original: 785 },
    { name: 'Food Cartridges', original: 234 },
    { name: 'Computer Components', original: 196 },
    { name: 'Water Purifiers', original: 107 },
    { name: 'Power Generators', original: 65 },
    { name: 'Medical Diagnostic Equipment', original: 24 },
    { name: 'Copper', original: 782 },
    { name: 'Superconductors', original: 341 },
    { name: 'Semiconductors', original: 224 },
    { name: 'Fruit and Vegetables', original: 146 },
    { name: 'Non Lethal Weapons', original: 25 }
];

function createRow(commodity) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${commodity.name}</td>
        <td><input type="number" class="original" value="${commodity.original}"></td>
        <td><input type="number" class="delivered"></td>
        <td class="remaining calc"></td>
        <td class="cutter-loads calc"></td>
        <td><input type="number" class="in-fc"></td>
        <td class="final-remaining calc"></td>
        <td><input type="text" class="source-system"></td>
        <td><input type="text" class="station"></td>
    `;
    return row;
}

function calculateAll() {
    const cutterCapacity = parseInt(document.getElementById('cutterCapacity').value) || 0;
    const daysLeft = parseInt(document.getElementById('daysLeft').value) || 1;
    
    let totals = { original: 0, delivered: 0, remaining: 0, cutterLoads: 0, inFC: 0, finalRemaining: 0 };

    document.querySelectorAll('#mainTable tbody tr').forEach(row => {
        const original = parseInt(row.querySelector('.original').value) || 0;
        const delivered = parseInt(row.querySelector('.delivered').value) || 0;
        const inFC = parseInt(row.querySelector('.in-fc').value) || 0;
        
        const remaining = Math.max(original - delivered, 0);
        const cutterLoads = Math.ceil(remaining / (cutterCapacity || 1));
        const finalRemaining = Math.max(remaining - inFC, 0);

        row.querySelector('.remaining').textContent = remaining;
        row.querySelector('.cutter-loads').textContent = cutterLoads;
        row.querySelector('.final-remaining').textContent = finalRemaining;

        totals.original += original;
        totals.delivered += delivered;
        totals.remaining += remaining;
        totals.cutterLoads += cutterLoads;
        totals.inFC += inFC;
        totals.finalRemaining += finalRemaining;
    });

    document.getElementById('totalOriginal').textContent = totals.original;
    document.getElementById('totalDelivered').textContent = totals.delivered;
    document.getElementById('totalRemaining').textContent = totals.remaining;
    document.getElementById('totalCutterLoads').textContent = totals.cutterLoads;
    document.getElementById('totalInFC').textContent = totals.inFC;
    document.getElementById('totalFinalRemaining').textContent = totals.finalRemaining;

    const unitsPerDay = totals.remaining / daysLeft;
    const loadsPerDay = Math.ceil(unitsPerDay / (cutterCapacity || 1));
    
    document.getElementById('unitsPerDay').textContent = unitsPerDay.toFixed(2);
    document.getElementById('loadsPerDay').textContent = loadsPerDay;

    saveState();
}

// Initialize application
function initializeApp() {
    initializeTheme();
    const tbody = document.querySelector('#mainTable tbody');
    commodities.forEach(commodity => {
        tbody.appendChild(createRow(commodity));
    });
    loadState();
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', calculateAll);
    });
    calculateAll();
    
    // Set version number
    document.getElementById('version-indicator').querySelector('small').textContent = `Version: ${APP_VERSION}`;
}

// Start the app
initializeApp();