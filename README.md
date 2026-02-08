# ⚡ Energie Card Ultimate (Edition Marstek & ZLinky)

[![HACS](https://img.shields.io/badge/HACS-Default-blue.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/github/v/release/xez7082/energie-card-ultimate?include_prereleases)
[![License](https://img.shields.io/github/license/xez7082/energie-card-ultimate)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/xez7082/energie-card-ultimate/graphs/commit-activity)

**Energie Card Ultimate** est la carte Lovelace la plus avancée pour Home Assistant, conçue spécifiquement pour la gestion d'énergie complexe (Solaire, Réseau, Batteries). Elle transforme vos données brutes en une interface **Glassmorphism** futuriste et ultra-lisible.

### 📸 Aperçu du Dashboard
![Aperçu de l'interface utilisateur](https://r.jina.ai/i/6f9035a901044390b14c33075c74238e)

---

## ✨ Points Forts

* **Tri Dynamique par Puissance :** Les appareils sont classés en temps réel. Le plus gros consommateur s'affiche toujours en haut à gauche.
* **Filtrage Intelligent :** Seuls les appareils consommant **plus de 5W** sont affichés pour éviter l'encombrement.
* **Affichage Grand Format :** Tuiles élargies à **120px** pour lire les noms longs sans coupure (ex: *Ordinateur Frédérick*).
* **Renommage Multiligne :** Système robuste de correspondance par ligne dans l'éditeur.
* **Monitoring Batteries :** Moyenne globale et détails individuels pour 3 batteries.

---

## 🚀 Installation

1.  **Fichier JavaScript :** Créez un fichier nommé `energie-card.js` dans votre dossier `/config/www/`.
2.  **Ressource Home Assistant :** Allez dans **Paramètres > Tableaux de bord > Ressources** et ajoutez :
    * **URL :** `/local/community/spa-card/spa-card.js`
    * **Type :** `Module JavaScript`
3.  **Ajout de la carte :** Recherchez **"Energie Card Ultimate"** dans votre sélecteur de cartes.

---

## ⚙️ Configuration des Appareils (48+)

Dans l'onglet **Appareils** de l'éditeur, copiez-collez cette liste dans le champ **"Noms des appareils"** :

```text
Télévision salon
barre-son
Aspirateur
Micro-onde
Cave à vins
Lave linge
Delonghi
IBC

Scie sous-table
Alexa spa
Analyseur d'eau
