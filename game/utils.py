from nba_api.stats.static import teams, players
from nba_api.stats.endpoints import playercareerstats
import random

def get_all_team_ids():
    """Récupère les 30 IDs des équipes actuelles."""
    return [t['id'] for t in teams.get_teams()]

def validate_player_combination(player_id, team_id_1, team_id_2):
    """Vérifie si un joueur a joué pour deux équipes spécifiques."""
    try:
        career = playercareerstats.PlayerCareerStats(player_id=player_id)
        # Le premier dataframe contient les totaux par équipe par saison
        df = career.get_data_frames()[0]
        player_teams = df['TEAM_ID'].unique().tolist()
        
        return int(team_id_1) in player_teams and int(team_id_2) in player_teams
    except:
        return False

def count_total_possible_players(row_teams, col_teams):
    """
    Calcule le nombre total de joueurs possibles pour toutes les combinaisons de cases.
    Un joueur peut correspondre à plusieurs cases, donc on compte tous les joueurs uniques.
    
    Note: Cette fonction peut être lente car elle teste tous les joueurs pour toutes les combinaisons.
    Le résultat est mis en cache dans le modèle DailyGrid pour éviter de recalculer.
    """
    all_possible_players = set()
    
    # Récupérer tous les joueurs une seule fois
    all_players = players.get_players()
    
    # Pour chaque combinaison de case (row_team + col_team)
    for row_team_id in row_teams:
        for col_team_id in col_teams:
            # Pour chaque joueur, vérifier s'il correspond à cette case
            for player in all_players:
                player_id = player['id']
                # Vérifier si ce joueur correspond à cette case
                if validate_player_combination(player_id, row_team_id, col_team_id):
                    all_possible_players.add(player_id)
    
    return len(all_possible_players)