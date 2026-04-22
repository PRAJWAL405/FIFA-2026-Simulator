import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
import random
import math

class FIFASimulator:
    def __init__(self, matches_path, groups_path):
        self.matches_df = pd.read_csv(matches_path)
        self.groups_df = pd.read_csv(groups_path)
        self.model = None
        self.teams_data = {}
        self.teams_list = []
        self._prepare_data()
        self._train_model()

    def _prepare_data(self):
        # Convert date and get latest ranks
        self.matches_df['date'] = pd.to_datetime(self.matches_df['date'])
        
        # Get latest rank for each team
        latest_ranks = self.matches_df.sort_values('date').groupby('home_team').last()
        latest_ranks_away = self.matches_df.sort_values('date').groupby('away_team').last()
        
        # Merge latest rank info
        for team in latest_ranks.index:
            self.teams_data[team] = {
                'rank': latest_ranks.loc[team, 'home_team_fifa_rank'],
                'points': latest_ranks.loc[team, 'home_team_total_fifa_points'],
                'offense': latest_ranks.loc[team, 'home_team_mean_offense_score'],
                'defense': latest_ranks.loc[team, 'home_team_mean_defense_score'],
                'midfield': latest_ranks.loc[team, 'home_team_mean_midfield_score']
            }
            
        # Standardize team names in groups_df
        self.groups_df['team'] = self.groups_df['team'].replace({'South Korea': 'Korea Republic', 'Iran': 'IR Iran'})
        
        # Original 32 teams
        existing_teams = self.groups_df['team'].unique().tolist()
        
        # Find 16 more teams (highest rank not in existing)
        all_ranks = []
        for team, data in self.teams_data.items():
            if team not in existing_teams:
                all_ranks.append((team, data['rank']))
        
        all_ranks.sort(key=lambda x: x[1])
        missing_teams = [x[0] for x in all_ranks[:16]]
        
        self.teams_list = existing_teams + missing_teams
        
        # Add missing teams to groups (I, J, K, L)
        extra_groups = []
        for i, team in enumerate(missing_teams):
            grp = chr(ord('I') + (i // 4))
            extra_groups.append({'team': team, 'groups': grp})
        
        self.groups_df = pd.concat([self.groups_df, pd.DataFrame(extra_groups)], ignore_index=True)

    def _train_model(self):
        # Prepare training data from historical matches
        train_df = self.matches_df.copy()
        train_df = train_df.dropna(subset=['home_team_fifa_rank', 'away_team_fifa_rank'])
        
        # Features: Rank difference and Point difference
        X = train_df[['home_team_fifa_rank', 'away_team_fifa_rank', 'home_team_total_fifa_points', 'away_team_total_fifa_points']]
        X_diff = pd.DataFrame()
        X_diff['rank_diff'] = X['home_team_fifa_rank'] - X['away_team_fifa_rank']
        X_diff['point_diff'] = X['home_team_total_fifa_points'] - X['away_team_total_fifa_points']
        
        # Target: Match Result (1: Home Win, 0: Away Win or Draw - simplified as Win/Loss for simulation logic eventually)
        y = (train_df['home_team_score'] > train_df['away_team_score']).astype(int)
        
        self.model = LogisticRegression()
        self.model.fit(X_diff, y)

    def predict_match(self, team1, team2):
        if team1 not in self.teams_data or team2 not in self.teams_data:
            return 0.5 # Default to even if data missing
            
        t1 = self.teams_data[team1]
        t2 = self.teams_data[team2]
        
        rank_diff = t1['rank'] - t2['rank']
        point_diff = t1['points'] - t2['points']
        
        input_df = pd.DataFrame({'rank_diff': [rank_diff], 'point_diff': [point_diff]})
        prob = self.model.predict_proba(input_df)[0][1]
        return prob

    def simulate_tournament(self):
        # 1. Group Stage
        groups = self.groups_df.groupby('groups')
        group_results = {}
        knockout_teams = []
        third_place_candidates = []

        for name, group in groups:
            teams = group['team'].tolist()
            standings = {team: {'points': 0, 'gd': 0, 'gc': 0, 'team': str(team)} for team in teams}
            
            # Round Robin
            for i in range(len(teams)):
                for j in range(i + 1, len(teams)):
                    t1, t2 = teams[i], teams[j]
                    prob = self.predict_match(t1, t2)
                    
                    # Randomize outcome based on probability
                    roll = random.random()
                    if roll < prob: # t1 wins
                        diff = random.randint(1, 3)
                        t2_goals = random.randint(0, 2)
                        t1_goals = t2_goals + diff
                        
                        standings[t1]['points'] += 3
                        standings[t1]['gd'] += diff
                        standings[t1]['gc'] += t2_goals
                        
                        standings[t2]['gd'] -= diff
                        standings[t2]['gc'] += t1_goals
                        
                    elif roll < (prob + 0.1): # Draw (10% chance roughly for now)
                        goals = random.randint(0, 2)
                        standings[t1]['points'] += 1
                        standings[t1]['gc'] += goals
                        standings[t2]['points'] += 1
                        standings[t2]['gc'] += goals
                        
                    else: # t2 wins
                        diff = random.randint(1, 3)
                        t1_goals = random.randint(0, 2)
                        t2_goals = t1_goals + diff
                        
                        standings[t2]['points'] += 3
                        standings[t2]['gd'] += diff
                        standings[t2]['gc'] += t1_goals
                        
                        standings[t1]['gd'] -= diff
                        standings[t1]['gc'] += t2_goals
            
            # Sort group
            sorted_teams = sorted(standings.values(), key=lambda x: (x['points'], x['gd']), reverse=True)
            group_results[name] = sorted_teams
            
            # Top 2 advance
            knockout_teams.append(sorted_teams[0]['team'])
            knockout_teams.append(sorted_teams[1]['team'])
            
            # 3rd place candidate
            third_place_candidates.append(sorted_teams[2])

        # Select 8 best 3rd place teams
        best_third = sorted(third_place_candidates, key=lambda x: (x['points'], x['gd']), reverse=True)[:8]
        for t in best_third:
            knockout_teams.append(t['team'])

        # 2. Knockout Stage (Round of 32)
        # Total 32 teams. We'll shuffle for a dynamic experience or follow a fixed path.
        # Fixed path for 48 teams is complex, let's do a semi-random bracket for simulator variety.
        r32 = knockout_teams
        random.shuffle(r32)
        
        bracket = {'R32': [], 'R16': [], 'QF': [], 'SF': [], 'Final': [], 'Winner': None}
        
        # R32
        matches = []
        for i in range(0, 32, 2):
            t1, t2 = r32[i], r32[i+1]
            t1g, t2g, w = self._get_match_result(t1, t2)
            matches.append({'t1': t1, 't2': t2, 't1_goals': t1g, 't2_goals': t2g, 'winner': w})
        bracket['R32'] = matches
        
        # R16
        r16_teams = [m['winner'] for m in matches]
        matches = []
        for i in range(0, 16, 2):
            t1, t2 = r16_teams[i], r16_teams[i+1]
            t1g, t2g, w = self._get_match_result(t1, t2)
            matches.append({'t1': t1, 't2': t2, 't1_goals': t1g, 't2_goals': t2g, 'winner': w})
        bracket['R16'] = matches
        
        # QF
        qf_teams = [m['winner'] for m in matches]
        matches = []
        for i in range(0, 8, 2):
            t1, t2 = qf_teams[i], qf_teams[i+1]
            t1g, t2g, w = self._get_match_result(t1, t2)
            matches.append({'t1': t1, 't2': t2, 't1_goals': t1g, 't2_goals': t2g, 'winner': w})
        bracket['QF'] = matches
        
        # SF
        sf_teams = [m['winner'] for m in matches]
        matches = []
        for i in range(0, 4, 2):
            t1, t2 = sf_teams[i], sf_teams[i+1]
            t1g, t2g, w = self._get_match_result(t1, t2)
            matches.append({'t1': t1, 't2': t2, 't1_goals': t1g, 't2_goals': t2g, 'winner': w})
        bracket['SF'] = matches
        
        # Final
        final_teams = [m['winner'] for m in matches]
        t1, t2 = final_teams[0], final_teams[1]
        t1g, t2g, w = self._get_match_result(t1, t2)
        bracket['Final'] = {'t1': t1, 't2': t2, 't1_goals': t1g, 't2_goals': t2g, 'winner': w}
        bracket['Winner'] = w
        
        return {'groups': group_results, 'bracket': bracket}

    def _get_match_result(self, t1, t2):
        prob = self.predict_match(t1, t2)
        winner = t1 if random.random() < prob else t2
        loser = t2 if winner == t1 else t1
        
        loser_goals = random.randint(0, 2)
        winner_goals = loser_goals + random.randint(1, 3)
        
        if winner == t1:
            return winner_goals, loser_goals, winner
        else:
            return loser_goals, winner_goals, winner

    @staticmethod
    def _native(val):
        """Convert numpy types to native Python types for JSON serialization."""
        if isinstance(val, (np.integer,)):
            return int(val)
        if isinstance(val, (np.floating,)):
            v = float(val)
            return 0.0 if math.isnan(v) else v
        if isinstance(val, np.ndarray):
            return val.tolist()
        return val

    def get_analytics(self):
        # Extract metadata for plots
        analytics = {
            'top_offense': [],
            'top_defense': [],
            'top_midfield': [],
            'rankings': []
        }
        
        sorted_teams = sorted(self.teams_data.items(), key=lambda x: self._native(x[1]['rank']))
        for team, data in sorted_teams[:15]:
            analytics['rankings'].append({'team': str(team), 'rank': self._native(data['rank']), 'points': self._native(data['points'])})
            analytics['top_offense'].append({'team': str(team), 'score': self._native(data['offense'])})
            analytics['top_defense'].append({'team': str(team), 'score': self._native(data['defense'])})
            analytics['top_midfield'].append({'team': str(team), 'score': self._native(data['midfield'])})
            
        return analytics
