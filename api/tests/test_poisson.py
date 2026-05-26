"""Tests for Poisson distribution math (BLOC 2)
Équivalent des tests implicites des agents TS.
"""

import pytest
from api.lib.poisson import (
    poisson_pmf,
    compute_lambdas,
    prob_1x2,
    prob_over_25,
    prob_btts,
)


class TestPoissonPMF:
    def test_zero_goals(self):
        """P(X=0 | lambda=1.0) ≈ 0.368"""
        p = poisson_pmf(0, 1.0)
        assert p == pytest.approx(0.3679, rel=0.01)

    def test_one_goal(self):
        """P(X=1 | lambda=1.5) ≈ 0.335"""
        p = poisson_pmf(1, 1.5)
        assert p == pytest.approx(0.3347, rel=0.01)

    def test_three_goals(self):
        """P(X=3 | lambda=2.0) ≈ 0.180"""
        p = poisson_pmf(3, 2.0)
        assert p == pytest.approx(0.1804, rel=0.01)

    def test_sum_to_one(self):
        """La somme des probabilités de 0 à 10 buts ≈ 1.0"""
        total = sum(poisson_pmf(k, 2.5) for k in range(10))
        assert total == pytest.approx(1.0, rel=0.001)


class TestComputeLambdas:
    def test_equal_teams(self):
        """Équipes égales → lambdas proches de la moyenne/2"""
        l_h, l_a = compute_lambdas(1.5, 1.0, 1.5, 1.0, league_avg_goals=2.5)
        assert l_h == pytest.approx(l_a, rel=0.1)
        assert l_h > 0

    def test_strong_home(self):
        """Équipe à domicile forte → lambda_home > lambda_away"""
        l_h, l_a = compute_lambdas(2.5, 0.8, 1.0, 1.5, league_avg_goals=2.8)
        assert l_h > l_a

    def test_strong_away(self):
        """Équipe à l'extérieur forte → lambda_away > lambda_home"""
        l_h, l_a = compute_lambdas(1.0, 1.5, 2.5, 0.8, league_avg_goals=2.8)
        assert l_a > l_h

    def test_minimum_lambda(self):
        """Lambda minimum plafonné à 0.1"""
        l_h, l_a = compute_lambdas(0.01, 5.0, 5.0, 0.01, league_avg_goals=2.5)
        assert l_h >= 0.1
        assert l_a >= 0.1


class TestProb1X2:
    def test_home_favored(self):
        """Lambda_home > lambda_away → prob_home_win > prob_away_win"""
        probs = prob_1x2(2.0, 0.8)
        assert probs["home"] > probs["away"]

    def test_away_favored(self):
        """Lambda_away > lambda_home → prob_away_win > prob_home_win"""
        probs = prob_1x2(0.8, 2.0)
        assert probs["away"] > probs["home"]

    def test_equal(self):
        """Lambdas égaux → prob_home ≈ prob_away (avec léger avantage domicile)"""
        probs = prob_1x2(1.2, 1.2)
        assert abs(probs["home"] - probs["away"]) < 0.1

    def test_probabilities_sum_to_one(self):
        """home + draw + away = 1.0"""
        probs = prob_1x2(1.5, 1.2)
        total = probs["home"] + probs["draw"] + probs["away"]
        assert total == pytest.approx(1.0, rel=0.001)


class TestProbOver25:
    def test_high_scoring(self):
        """Hauts lambdas → prob_over_25 élevée"""
        p = prob_over_25(2.5, 2.0)
        assert p > 0.7

    def test_low_scoring(self):
        """Bas lambdas → prob_over_25 faible"""
        p = prob_over_25(0.5, 0.5)
        assert p < 0.3

    def test_between_zero_and_one(self):
        """Toujours entre 0 et 1"""
        for l_h, l_a in [(0.1, 0.1), (5.0, 5.0), (1.5, 1.2)]:
            p = prob_over_25(l_h, l_a)
            assert 0 <= p <= 1


class TestProbBTTS:
    def test_both_attack(self):
        """Deux équipes offensives → prob_btts élevée"""
        p = prob_btts(2.0, 2.0)
        assert p > 0.6

    def test_both_defensive(self):
        """Deux équipes défensives → prob_btts faible"""
        p = prob_btts(0.3, 0.3)
        assert p < 0.2

    def test_between_zero_and_one(self):
        """Toujours entre 0 et 1"""
        for l_h, l_a in [(0.1, 0.1), (5.0, 5.0), (1.5, 1.2)]:
            p = prob_btts(l_h, l_a)
            assert 0 <= p <= 1
