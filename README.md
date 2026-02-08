# ⚡ Energie Card Ultimate (Edition Marstek & ZLinky)

Cette carte personnalisée pour Home Assistant offre un suivi énergétique futuriste et ultra-lisible. Elle est spécifiquement optimisée pour gérer un grand nombre d'appareils (jusqu'à 60) avec un système de renommage intelligent et un tri dynamique.

### 📸 Aperçu du Dashboard
![Aperçu de l'interface utilisateur](https://r.jina.ai/i/6f9035a901044390b14c33075c74238e)

---

## ✨ Fonctionnalités Principales

* **Tri Automatique par Puissance :** Les appareils sont classés en temps réel. Le plus gros consommateur s'affiche toujours en haut à gauche pour une visibilité immédiate.
* **Filtrage Intelligent :** Seuls les appareils consommant **plus de 5W** sont affichés afin de garder un tableau de bord propre et utile.
* **Gestion des Noms Longs :** Les tuiles d'appareils sont élargies à **120px** (au lieu de 85px) pour permettre l'affichage complet de noms comme *"Ordinateur Frédérick"* ou *"Télévision Ch. parents"*.
* **Renommage Simplifié :** Système de correspondance par ligne dans l'éditeur. Si vous laissez une ligne vide, la carte utilise automatiquement le nom d'origine de Home Assistant.
* **Multi-Batteries :** Affiche la moyenne globale de 3 batteries avec le détail individuel juste en dessous.

---

## 🚀 Installation

1.  **Fichier JavaScript :** Créez un fichier nommé `energie-card.js` dans votre dossier `/config/www/`.
2.  **Ressource Home Assistant :** Allez dans **Paramètres > Tableaux de bord > Ressources** et ajoutez :
    * **URL :** `/local/energie-card.js`
    * **Type :** `Module JavaScript`
3.  **Ajout de la carte :** Sur votre tableau de bord, ajoutez une carte personnalisée et recherchez **"Energie Card Ultimate"**.

---

## ⚙️ Configuration de vos Appareils

Dans l'onglet **Appareils** de l'éditeur de carte, copiez et collez la liste suivante dans le champ **"Noms des appareils"** (un nom par ligne) :

```text
Télévision salon
barre-son
Aspirateur
Micro-onde
Cave à vins
Lave linge
Delonghi
IBC
Carsport
Congélateur
Kenwood

Scie sous-table
Alexa spa
Analyseur d'eau
