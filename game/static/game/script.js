// Variables globales
let gridData = null;
let selectedPlayer = null;
let selectedCell = null;
let autocompleteTimeout = null;
let filledCells = new Set(); // Suivre les cases déjà remplies
let savedPlayers = {}; // Stocker les joueurs placés { "row-col": {id, name} }
let uniquePlayers = new Set(); // Suivre les joueurs uniques trouvés (par ID)

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation...');
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
            // Vérifier que les données de la grille sont valides
            if (!data.row_teams || !data.col_teams || data.row_teams.length === 0 || data.col_teams.length === 0) {
                showMessage('Erreur: La grille est vide ou invalide', 'error');
                console.error('Données de grille invalides:', data);
                return;
            }
            
            gridData = data;
            renderGrid();
            // Charger les joueurs sauvegardés
            loadSavedPlayers();
        } else {
            showMessage('Erreur: ' + (data.error || 'Erreur inconnue'), 'error');
        }
    } catch (error) {
        showMessage('Erreur lors du chargement de la grille', 'error');
        console.error('Erreur détaillée:', error);
    }
}

// Rendre la grille
function renderGrid() {
    if (!gridData || !gridData.row_teams || !gridData.col_teams) {
        console.error('Données de grille manquantes:', gridData);
        showMessage('Erreur: Données de grille invalides', 'error');
        return;
    }
    
    const rowTeams = gridData.row_teams;
    const colTeams = gridData.col_teams;
    
    console.log('Rendu de la grille:', { rowTeams, colTeams });
    
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
    uniquePlayers.clear(); // Réinitialiser les joueurs uniques
    savedPlayers = {}; // Réinitialiser les joueurs sauvegardés
    
    for (let row = 0; row < rowTeams.length; row++) {
        for (let col = 0; col < colTeams.length; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.rowIndex = row;
            cell.dataset.colIndex = col;
            cell.innerHTML = '<div class="grid-cell-content">FIND PLAYER</div>';
            
            cell.addEventListener('click', () => handleCellClick(row, col, cell));
            cellsContainer.appendChild(cell);
        }
    }
    
    // Mettre à jour les statistiques
    updateStats();
}

// Charger les joueurs sauvegardés depuis localStorage
function loadSavedPlayers() {
    if (!gridData) return;
    
    const storageKey = `hoop_tac_toe_${gridData.date}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
        try {
            savedPlayers = JSON.parse(saved);
            
            // Restaurer les joueurs dans la grille
            Object.keys(savedPlayers).forEach(cellKey => {
                const [row, col] = cellKey.split('-').map(Number);
                const player = savedPlayers[cellKey];
                const cellElement = document.querySelector(`.grid-cell[data-row-index="${row}"][data-col-index="${col}"]`);
                
                if (cellElement && player) {
                    cellElement.classList.add('valid', 'filled');
                    cellElement.innerHTML = `<div class="grid-cell-content">${player.name}</div>`;
                    filledCells.add(cellKey);
                    // Ajouter le joueur aux joueurs uniques
                    uniquePlayers.add(player.id);
                }
            });
            
            updateStats();
        } catch (error) {
            console.error('Erreur lors du chargement des joueurs sauvegardés:', error);
        }
    }
}

// Sauvegarder les joueurs dans localStorage
function savePlayers() {
    if (!gridData) return;
    
    const storageKey = `hoop_tac_toe_${gridData.date}`;
    localStorage.setItem(storageKey, JSON.stringify(savedPlayers));
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    const searchInput = document.getElementById('player-search-input');
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        // Réinitialiser la sélection si on tape un nouveau nom
        if (selectedPlayer && query !== selectedPlayer.full_name) {
            selectedPlayer = null;
            document.getElementById('selected-player').classList.remove('show');
        }
        
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
    searchInput.addEventListener('keydown', async function(e) {
        console.log('Touche pressée:', e.key);
        if (e.key === 'Enter') {
            console.log('Entrée détectée!');
            e.preventDefault();
            const query = this.value.trim();
            console.log('Requête:', query);
            
            if (!query) {
                console.log('Requête vide');
                showMessage('Veuillez entrer un nom de joueur', 'error');
                return;
            }
            
            if (selectedPlayer) {
                console.log('Joueur déjà sélectionné, recherche case valide...');
                // Si un joueur est déjà sélectionné, chercher une case valide
                await findAndFillValidCell();
            } else if (query.length >= 2) {
                console.log('Recherche du joueur...');
                // Si on a tapé un nom mais pas sélectionné, chercher le joueur d'abord
                await searchAndValidatePlayer(query);
            } else {
                console.log('Requête trop courte');
                showMessage('Veuillez entrer au moins 2 caractères', 'error');
            }
        }
    });
    
    console.log('Event listeners configurés');
    
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
        item.addEventListener('click', async () => {
            await selectPlayer(player);
        });
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
async function selectPlayer(player) {
    selectedPlayer = player;
    
    const selectedPlayerDiv = document.getElementById('selected-player');
    selectedPlayerDiv.innerHTML = `<span class="selected-player-name">Joueur sélectionné: ${player.full_name}</span>`;
    selectedPlayerDiv.classList.add('show');
    
    hideAutocomplete();
    document.getElementById('player-search-input').value = player.full_name;
    
    // Chercher automatiquement une case valide
    await findAndFillValidCell();
}

// Rechercher un joueur par nom et le valider dans une case
async function searchAndValidatePlayer(query) {
    console.log('searchAndValidatePlayer appelé avec:', query);
    try {
        console.log('Fetch vers /game/autocomplete/?q=' + encodeURIComponent(query));
        const response = await fetch(`/game/autocomplete/?q=${encodeURIComponent(query)}`);
        console.log('Réponse reçue:', response.status);
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (data.success && data.players.length > 0) {
            console.log('Joueurs trouvés:', data.players.length);
            
            // Chercher d'abord une correspondance exacte
            let player = data.players.find(p => p.full_name.toLowerCase() === query.toLowerCase());
            
            // Si pas de correspondance exacte, chercher une correspondance qui commence par la requête
            if (!player) {
                player = data.players.find(p => p.full_name.toLowerCase().startsWith(query.toLowerCase()));
            }
            
            // Si toujours pas trouvé, prendre le premier résultat
            if (!player) {
                player = data.players[0];
            }
            
            // Si plusieurs résultats et que le premier n'est pas une bonne correspondance, 
            // afficher l'autocomplete pour que l'utilisateur choisisse
            if (data.players.length > 1 && !query.toLowerCase().includes(player.full_name.toLowerCase().split(' ')[0].toLowerCase())) {
                // Afficher l'autocomplete pour que l'utilisateur choisisse
                displayAutocomplete(data.players);
                showMessage('Plusieurs joueurs trouvés. Veuillez sélectionner un joueur dans la liste.', 'info');
                return;
            }
            
            selectedPlayer = player;
            
            // Mettre à jour l'interface
            const selectedPlayerDiv = document.getElementById('selected-player');
            selectedPlayerDiv.innerHTML = `<span class="selected-player-name">Joueur sélectionné: ${player.full_name}</span>`;
            selectedPlayerDiv.classList.add('show');
            document.getElementById('player-search-input').value = player.full_name;
            hideAutocomplete();
            
            // Chercher une case valide pour ce joueur
            await findAndFillValidCell();
        } else {
            showMessage('Aucun joueur trouvé avec ce nom', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showMessage('Erreur lors de la recherche du joueur', 'error');
    }
}

// Trouver et remplir une case valide pour le joueur sélectionné
async function findAndFillValidCell() {
    if (!selectedPlayer) {
        showMessage('Aucun joueur sélectionné', 'error');
        return;
    }
    
    if (!gridData) {
        showMessage('La grille n\'est pas encore chargée', 'error');
        return;
    }
    
    const rowTeams = gridData.row_teams;
    const colTeams = gridData.col_teams;
    
    // Afficher un indicateur de chargement
    showMessage('Vérification en cours...', 'info');
    
    // Collecter toutes les cases (vides ou déjà remplies - on peut remplacer)
    const allCells = [];
    for (let row = 0; row < rowTeams.length; row++) {
        for (let col = 0; col < colTeams.length; col++) {
            const cellKey = `${row}-${col}`;
            const cellElement = document.querySelector(`.grid-cell[data-row-index="${row}"][data-col-index="${col}"]`);
            if (cellElement) {
                allCells.push({ row, col, cellElement, cellKey });
            }
        }
    }
    
    if (allCells.length === 0) {
        return;
    }
    
    // Tester toutes les cases en parallèle
    const validationPromises = allCells.map(({ row, col }) => 
        checkCellValidity(row, col, selectedPlayer.id).then(isValid => ({ row, col, isValid }))
    );
    
    try {
        const results = await Promise.all(validationPromises);
        
        // Trouver toutes les cases valides
        const validCells = results.filter(r => r.isValid);
        
        if (validCells.length > 0) {
            // Remplir toutes les cases valides et compter les nouvelles cases
            let newBoxesCount = 0;
            for (const validCell of validCells) {
                const cellData = allCells.find(c => c.row === validCell.row && c.col === validCell.col);
                if (cellData) {
                    const isNewBox = await fillCell(validCell.row, validCell.col, cellData.cellElement, selectedPlayer);
                    if (isNewBox) {
                        newBoxesCount++;
                    }
                }
            }
            
            // Ajouter le joueur aux joueurs uniques (une seule fois, même s'il remplit plusieurs cases)
            uniquePlayers.add(selectedPlayer.id);
            updateStats();
            
            // Réinitialiser la sélection
            selectedPlayer = null;
            document.getElementById('selected-player').classList.remove('show');
            document.getElementById('player-search-input').value = '';
            document.getElementById('player-search-input').focus();
        } else {
            // Si aucune case valide n'a été trouvée
            showMessage(`❌ ${selectedPlayer.full_name} ne correspond à aucune case de la grille.`, 'error');
            // Réinitialiser la sélection
            selectedPlayer = null;
            document.getElementById('selected-player').classList.remove('show');
            document.getElementById('player-search-input').value = '';
            document.getElementById('player-search-input').focus();
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des cases:', error);
        showMessage('Erreur lors de la vérification', 'error');
    }
}

// Vérifier si une case est valide pour un joueur
async function checkCellValidity(rowIndex, colIndex, playerId = null) {
    const playerIdToCheck = playerId || selectedPlayer?.id;
    if (!playerIdToCheck) {
        return false;
    }
    
    try {
        const response = await fetch(
            `/game/check/?player_id=${playerIdToCheck}&row_index=${rowIndex}&col_index=${colIndex}`
        );
        const data = await response.json();
        return data.success && data.valid;
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        return false;
    }
}

// Remplir une case avec un joueur
async function fillCell(rowIndex, colIndex, cellElement, player) {
    const cellKey = `${rowIndex}-${colIndex}`;
    const wasAlreadyFilled = filledCells.has(cellKey);
    
    cellElement.classList.add('valid', 'filled');
    cellElement.innerHTML = `<div class="grid-cell-content">${player.full_name}</div>`;
    filledCells.add(cellKey);
    
    // Sauvegarder le joueur
    savedPlayers[cellKey] = {
        id: player.id,
        name: player.full_name
    };
    savePlayers();
    
    // Retourner si c'était une nouvelle case (pas un remplacement)
    return !wasAlreadyFilled;
}

// Gérer le clic sur une case ou la validation automatique
async function handleCellClick(rowIndex, colIndex, cellElement) {
    if (!selectedPlayer) {
        showMessage('Veuillez d\'abord sélectionner un joueur', 'error');
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
                // Remplir cette case
                await fillCell(rowIndex, colIndex, cellElement, selectedPlayer);
                
                // Chercher et remplir toutes les autres cases valides pour ce joueur
                await findAndFillAllValidCellsForPlayer(selectedPlayer);
                
                // Ajouter le joueur aux joueurs uniques (une seule fois)
                uniquePlayers.add(selectedPlayer.id);
                updateStats();
                
                // Réinitialiser la sélection
                selectedPlayer = null;
                document.getElementById('selected-player').classList.remove('show');
                document.getElementById('player-search-input').value = '';
                document.getElementById('player-search-input').focus();
            } else {
                cellElement.classList.add('invalid');
                cellElement.innerHTML = '<div class="grid-cell-content">❌</div>';
                showMessage(`❌ ${selectedPlayer.full_name} ne correspond pas à cette case.`, 'error');
                
                // Retirer la classe invalid après 2 secondes
                setTimeout(() => {
                    cellElement.classList.remove('invalid');
                    const cellKey = `${rowIndex}-${colIndex}`;
                    if (savedPlayers[cellKey]) {
                        cellElement.innerHTML = `<div class="grid-cell-content">${savedPlayers[cellKey].name}</div>`;
                    } else {
                        cellElement.innerHTML = '<div class="grid-cell-content">FIND PLAYER</div>';
                    }
                }, 2000);
            }
        } else {
            cellElement.innerHTML = '<div class="grid-cell-content">FIND PLAYER</div>';
            showMessage('Erreur: ' + data.error, 'error');
        }
    } catch (error) {
        cellElement.innerHTML = '<div class="grid-cell-content">FIND PLAYER</div>';
        showMessage('Erreur lors de la validation', 'error');
        console.error(error);
    }
}

// Trouver et remplir toutes les cases valides pour un joueur (sans inclure la case déjà testée)
async function findAndFillAllValidCellsForPlayer(player) {
    if (!gridData) return;
    
    const rowTeams = gridData.row_teams;
    const colTeams = gridData.col_teams;
    
    // Collecter toutes les autres cases
    const allCells = [];
    for (let row = 0; row < rowTeams.length; row++) {
        for (let col = 0; col < colTeams.length; col++) {
            const cellKey = `${row}-${col}`;
            const cellElement = document.querySelector(`.grid-cell[data-row-index="${row}"][data-col-index="${col}"]`);
            if (cellElement) {
                // Ne pas retester les cases déjà remplies avec ce joueur
                if (!savedPlayers[cellKey] || savedPlayers[cellKey].id !== player.id) {
                    allCells.push({ row, col, cellElement, cellKey });
                }
            }
        }
    }
    
    if (allCells.length === 0) return;
    
    // Tester toutes les cases en parallèle
    const validationPromises = allCells.map(({ row, col }) => 
        checkCellValidity(row, col, player.id).then(isValid => ({ row, col, isValid }))
    );
    
    try {
        const results = await Promise.all(validationPromises);
        const validCells = results.filter(r => r.isValid);
        
        // Remplir toutes les cases valides
        for (const validCell of validCells) {
            const cellData = allCells.find(c => c.row === validCell.row && c.col === validCell.col);
            if (cellData) {
                await fillCell(validCell.row, validCell.col, cellData.cellElement, player);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la recherche des autres cases:', error);
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

// Mettre à jour les statistiques
function updateStats() {
    const filled = filledCells.size; // Nombre de cases remplies
    const players = uniquePlayers.size; // Nombre de joueurs uniques trouvés
    
    // Calculer le pourcentage basé sur le nombre total de joueurs possibles
    let percent = 0;
    if (gridData && gridData.total_possible_players && gridData.total_possible_players > 0) {
        percent = Math.round((players / gridData.total_possible_players) * 100);
    }
    
    document.getElementById('stat-boxes').textContent = filled; // Commence à 0 et augmente avec les cases remplies
    document.getElementById('stat-filled').textContent = filled;
    document.getElementById('stat-players').textContent = players;
    document.getElementById('stat-percent').textContent = percent + '%';
}
