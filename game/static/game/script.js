// Variables globales
let gridData = null;
let selectedPlayer = null;
let selectedCell = null;
let autocompleteTimeout = null;
let filledCells = new Set(); // Suivre les cases déjà remplies

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadGrid();
    setupEventListeners();
    // Mettre le focus sur l'input de recherche au chargement
    setTimeout(() => {
        document.getElementById('player-search-input').focus();
    }, 500);
});

// Charger la grille
async function loadGrid() {
    try {
        const response = await fetch('/game/grid/');
        const data = await response.json();
        
        if (data.success) {
            gridData = data;
            renderGrid();
        } else {
            showMessage('Erreur: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('Erreur lors du chargement de la grille', 'error');
        console.error(error);
    }
}

// Rendre la grille
function renderGrid() {
    const rowTeams = gridData.row_teams;
    const colTeams = gridData.col_teams;
    
    // Afficher les équipes en colonnes (en haut)
    const colTeamsContainer = document.getElementById('col-teams');
    colTeamsContainer.innerHTML = '';
    colTeams.forEach(teamId => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-logo';
        const img = document.createElement('img');
        img.src = `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`;
        img.alt = `Team ${teamId}`;
        img.onerror = function() {
            this.style.display = 'none';
            teamDiv.textContent = `Team ${teamId}`;
        };
        teamDiv.appendChild(img);
        colTeamsContainer.appendChild(teamDiv);
    });
    
    // Afficher les équipes en lignes (à gauche)
    const rowTeamsContainer = document.getElementById('row-teams');
    rowTeamsContainer.innerHTML = '';
    rowTeams.forEach(teamId => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-logo';
        const img = document.createElement('img');
        img.src = `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`;
        img.alt = `Team ${teamId}`;
        img.onerror = function() {
            this.style.display = 'none';
            teamDiv.textContent = `Team ${teamId}`;
        };
        teamDiv.appendChild(img);
        rowTeamsContainer.appendChild(teamDiv);
    });
    
    // Créer les cellules de la grille
    const cellsContainer = document.getElementById('grid-cells');
    cellsContainer.innerHTML = '';
    filledCells.clear(); // Réinitialiser les cases remplies
    
    for (let row = 0; row < rowTeams.length; row++) {
        for (let col = 0; col < colTeams.length; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.rowIndex = row;
            cell.dataset.colIndex = col;
            cell.innerHTML = '<div class="grid-cell-content">?</div>';
            
            cell.addEventListener('click', () => handleCellClick(row, col, cell));
            cellsContainer.appendChild(cell);
        }
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    const searchInput = document.getElementById('player-search-input');
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        clearTimeout(autocompleteTimeout);
        
        if (query.length < 2) {
            hideAutocomplete();
            return;
        }
        
        autocompleteTimeout = setTimeout(() => {
            searchPlayers(query);
        }, 300);
    });
    
    // Gérer la touche Entrée
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedPlayer) {
                fillNextAvailableCell();
            } else {
                // Si un résultat d'autocomplete est visible, sélectionner le premier
                const firstResult = document.querySelector('.autocomplete-item');
                if (firstResult) {
                    firstResult.click();
                    // Attendre un peu puis remplir la case
                    setTimeout(() => {
                        if (selectedPlayer) {
                            fillNextAvailableCell();
                        }
                    }, 100);
                }
            }
        }
    });
    
    // Fermer l'autocomplete si on clique ailleurs
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box')) {
            hideAutocomplete();
        }
    });
}

// Recherche de joueurs (autocomplete)
async function searchPlayers(query) {
    try {
        const response = await fetch(`/game/autocomplete/?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.players.length > 0) {
            displayAutocomplete(data.players);
        } else {
            hideAutocomplete();
        }
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        hideAutocomplete();
    }
}

// Afficher les résultats de l'autocomplete
function displayAutocomplete(players) {
    const resultsContainer = document.getElementById('autocomplete-results');
    resultsContainer.innerHTML = '';
    
    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = player.full_name;
        item.addEventListener('click', () => selectPlayer(player));
        resultsContainer.appendChild(item);
    });
    
    resultsContainer.classList.add('show');
}

// Masquer l'autocomplete
function hideAutocomplete() {
    const resultsContainer = document.getElementById('autocomplete-results');
    resultsContainer.classList.remove('show');
}

// Sélectionner un joueur
function selectPlayer(player) {
    selectedPlayer = player;
    
    const selectedPlayerDiv = document.getElementById('selected-player');
    selectedPlayerDiv.innerHTML = `<span class="selected-player-name">Joueur sélectionné: ${player.full_name}</span>`;
    selectedPlayerDiv.classList.add('show');
    
    hideAutocomplete();
    document.getElementById('player-search-input').value = player.full_name;
    
    showMessage(`Joueur sélectionné: ${player.full_name}. Appuyez sur Entrée pour valider dans la prochaine case disponible.`, 'info');
}

// Trouver et remplir la prochaine case disponible
function fillNextAvailableCell() {
    if (!selectedPlayer || !gridData) {
        return;
    }
    
    const rowTeams = gridData.row_teams;
    const colTeams = gridData.col_teams;
    
    // Trouver la première case non remplie (ordre: de gauche à droite, de haut en bas)
    for (let row = 0; row < rowTeams.length; row++) {
        for (let col = 0; col < colTeams.length; col++) {
            const cellKey = `${row}-${col}`;
            if (!filledCells.has(cellKey)) {
                const cellElement = document.querySelector(`.grid-cell[data-row-index="${row}"][data-col-index="${col}"]`);
                if (cellElement) {
                    handleCellClick(row, col, cellElement);
                    return;
                }
            }
        }
    }
    
    // Si toutes les cases sont remplies
    showMessage('Toutes les cases sont déjà remplies !', 'info');
}

// Gérer le clic sur une case ou la validation automatique
async function handleCellClick(rowIndex, colIndex, cellElement) {
    if (!selectedPlayer) {
        showMessage('Veuillez d\'abord sélectionner un joueur', 'error');
        return;
    }
    
    const cellKey = `${rowIndex}-${colIndex}`;
    if (cellElement.classList.contains('filled')) {
        showMessage('Cette case est déjà remplie', 'error');
        return;
    }
    
    // Afficher un message de chargement
    cellElement.innerHTML = '<div class="grid-cell-content">Vérification...</div>';
    
    try {
        const response = await fetch(
            `/game/check/?player_id=${selectedPlayer.id}&row_index=${rowIndex}&col_index=${colIndex}`
        );
        const data = await response.json();
        
        if (data.success) {
            if (data.valid) {
                cellElement.classList.add('valid', 'filled');
                cellElement.innerHTML = `<div class="grid-cell-content">${selectedPlayer.full_name}</div>`;
                filledCells.add(cellKey); // Marquer la case comme remplie
                showMessage(`✅ Correct ! ${selectedPlayer.full_name} a bien joué pour ces deux équipes.`, 'success');
                
                // Réinitialiser la sélection
                selectedPlayer = null;
                document.getElementById('selected-player').classList.remove('show');
                document.getElementById('player-search-input').value = '';
                document.getElementById('player-search-input').focus(); // Remettre le focus sur l'input
            } else {
                cellElement.classList.add('invalid');
                cellElement.innerHTML = '<div class="grid-cell-content">❌</div>';
                showMessage(`❌ Incorrect. ${selectedPlayer.full_name} n'a pas joué pour ces deux équipes.`, 'error');
                
                // Retirer la classe invalid après 2 secondes
                setTimeout(() => {
                    cellElement.classList.remove('invalid');
                    cellElement.innerHTML = '<div class="grid-cell-content">?</div>';
                }, 2000);
            }
        } else {
            cellElement.innerHTML = '<div class="grid-cell-content">?</div>';
            showMessage('Erreur: ' + data.error, 'error');
        }
    } catch (error) {
        cellElement.innerHTML = '<div class="grid-cell-content">?</div>';
        showMessage('Erreur lors de la validation', 'error');
        console.error(error);
    }
}

// Afficher un message
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message show ${type}`;
    
    // Masquer le message après 5 secondes (sauf pour les erreurs)
    if (type !== 'error') {
        setTimeout(() => {
            messageDiv.classList.remove('show');
        }, 5000);
    }
}

