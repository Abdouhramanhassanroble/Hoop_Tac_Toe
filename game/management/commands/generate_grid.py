# game/management/commands/generate_grid.py
from django.core.management.base import BaseCommand
from game.models import DailyGrid
from nba_api.stats.static import teams
from datetime import date
import random

class Command(BaseCommand):
    help = 'Génère une grille NBA pour aujourd\'hui'

    def handle(self, *args, **options):
        all_teams = [t['id'] for t in teams.get_teams()]
        selected = random.sample(all_teams, 6)
        
        grid, created = DailyGrid.objects.get_or_create(
            date=date.today(),
            defaults={
                'row_teams': selected[:3],
                'col_teams': selected[3:],
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Grille créée avec succès : {grid}'))
        else:
            self.stdout.write(self.style.WARNING(f'Une grille existe déjà pour aujourd\'hui : {grid}'))

