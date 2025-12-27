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