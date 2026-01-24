from django.db import models

class DailyGrid(models.Model):
    date = models.DateField(auto_now_add=True, unique=True)
    # On stocke les IDs des équipes (ex: [1610612747, ...])
    row_teams = models.JSONField() 
    col_teams = models.JSONField()
    # Nombre total de joueurs possibles pour toutes les cases
    total_possible_players = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"Grille du {self.date}"