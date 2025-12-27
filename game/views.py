from django.http import JsonResponse
from datetime import date
from .models import DailyGrid
from .utils import validate_player_combination
from nba_api.stats.static import players


def get_grid(request):
    """
    Envoie la grille du jour au joueur.
    Retourne la grille (row_teams et col_teams) pour la date du jour.
    """
    today = date.today()
    
    try:
        grid = DailyGrid.objects.get(date=today)
        return JsonResponse({
            'success': True,
            'date': grid.date.isoformat(),
            'row_teams': grid.row_teams,
            'col_teams': grid.col_teams
        })
    except DailyGrid.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Aucune grille disponible pour aujourd\'hui'
        }, status=404)


def autocomplete_player(request):
    """
    Permet de chercher un joueur sans faire d'erreur.
    Recherche les joueurs dont le nom correspond à la requête.
    """
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 2:
        return JsonResponse({
            'success': False,
            'error': 'La requête doit contenir au moins 2 caractères'
        }, status=400)
    
    try:
        all_players = players.get_players()
        # Filtrer les joueurs dont le nom contient la requête (insensible à la casse)
        query_lower = query.lower()
        matching_players = [
            {
                'id': player['id'],
                'full_name': player['full_name']
            }
            for player in all_players
            if query_lower in player['full_name'].lower()
        ]
        
        # Limiter à 10 résultats pour éviter une réponse trop lourde
        matching_players = matching_players[:10]
        
        return JsonResponse({
            'success': True,
            'players': matching_players,
            'count': len(matching_players)
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Erreur lors de la recherche: {str(e)}'
        }, status=500)


def check_move(request):
    """
    Valide si le choix du joueur est correct.
    Vérifie si un joueur a bien joué pour les deux équipes correspondant à la case choisie.
    """
    player_id = request.GET.get('player_id')
    row_index = request.GET.get('row_index')
    col_index = request.GET.get('col_index')
    
    # Validation des paramètres
    if not player_id or row_index is None or col_index is None:
        return JsonResponse({
            'success': False,
            'error': 'Paramètres manquants: player_id, row_index et col_index sont requis'
        }, status=400)
    
    try:
        player_id = int(player_id)
        row_index = int(row_index)
        col_index = int(col_index)
    except ValueError:
        return JsonResponse({
            'success': False,
            'error': 'Les paramètres doivent être des nombres valides'
        }, status=400)
    
    # Récupérer la grille du jour
    today = date.today()
    try:
        grid = DailyGrid.objects.get(date=today)
    except DailyGrid.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Aucune grille disponible pour aujourd\'hui'
        }, status=404)
    
    # Vérifier que les index sont valides
    row_teams = grid.row_teams
    col_teams = grid.col_teams
    
    if row_index < 0 or row_index >= len(row_teams):
        return JsonResponse({
            'success': False,
            'error': f'Index de ligne invalide (doit être entre 0 et {len(row_teams) - 1})'
        }, status=400)
    
    if col_index < 0 or col_index >= len(col_teams):
        return JsonResponse({
            'success': False,
            'error': f'Index de colonne invalide (doit être entre 0 et {len(col_teams) - 1})'
        }, status=400)
    
    # Récupérer les IDs des équipes correspondant à la case
    team_id_1 = row_teams[row_index]
    team_id_2 = col_teams[col_index]
    
    # Valider la combinaison joueur-équipes
    is_valid = validate_player_combination(player_id, team_id_1, team_id_2)
    
    return JsonResponse({
        'success': True,
        'valid': is_valid,
        'player_id': player_id,
        'team_id_1': team_id_1,
        'team_id_2': team_id_2,
        'row_index': row_index,
        'col_index': col_index
    })
