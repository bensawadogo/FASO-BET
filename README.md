# ⚡ FASO BET

FASO BET est une plateforme moderne de prédictions sportives basée sur l'intelligence artificielle. Elle propose une interface futuriste (Dark Mode, Glassmorphism, Tailwind CSS) et permet aux utilisateurs de pronostiquer sur différents sports (Football, Basketball, Tennis, Rugby/MMA).

## 🚀 Fonctionnalités

*   **Design Moderne :** Interface sombre avec effets de verre (Glassmorphism), orbes cosmiques et animations fluides.
*   **Scores en Direct :** Ticker défilant pour les matchs en direct.
*   **Prédictions IA :** Formulaire de prédiction avec niveau de confiance.
*   **Classement :** Système de points, précision et séries (streaks) pour les meilleurs pronostiqueurs.
*   **Authentification :** Inscription et connexion sécurisées.

## 🛠️ Technologies Utilisées

*   **Backend :** Python, Django (SQLite par défaut)
*   **Frontend :** HTML5, Tailwind CSS, Material Symbols, Polices Google (Space Grotesk, Manrope)

## 📦 Installation et Lancement

Suivez ces étapes pour installer et lancer le projet sur n'importe quelle machine :

### 1. Prérequis
*   Python 3.8 ou supérieur installé sur la machine.

### 2. Créer un environnement virtuel (Recommandé)
Ouvrez un terminal dans le dossier du projet et exécutez :
```bash
# Sur Windows
python -m venv venv
venv\Scripts\activate

# Sur macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 4. Initialiser la base de données
Si c'est la première fois ou si vous n'avez pas le fichier `db.sqlite3` :
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Générer les données de démonstration (Optionnel)
Pour peupler la base de données avec des sports, équipes, matchs et utilisateurs démo :
```bash
python seed_data.py
```

### 6. Lancer le serveur
```bash
python manage.py runserver
```
Ouvrez ensuite votre navigateur à l'adresse : [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 📁 Structure du Projet

*   `sportpred/` : Configuration globale du projet Django (settings, urls).
*   `predictions/` : L'application principale contenant les modèles, vues, et templates.
*   `seed_data.py` : Script pour injecter des données de démonstration.
*   `requirements.txt` : Liste des paquets Python nécessaires.
