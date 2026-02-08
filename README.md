# ⚡ Energie-Card Lumina

[![HACS](https://img.shields.io/badge/HACS-Default-blue.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/github/v/release/xez7082/energie-card?include_prereleases)
[![License](https://img.shields.io/github/license/xez7082/energie-card)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/xez7082/energie-card/graphs/commit-activity)

**Energie-Card Lumina** est une interface haut de gamme pour Home Assistant. Elle centralise la gestion de votre énergie (Linky, Solaire, 3 Batteries) avec un design **Glassmorphism** épuré et des animations dynamiques.

---

## 💎 Pourquoi ce "Hack" ?

La plupart des cartes d'énergie deviennent illisibles dès que l'on a beaucoup d'appareils. **Energie-Card Lumina** résout ce problème en gérant jusqu'à **60 appareils** tout en restant ultra-propre.

* **Filtrage Intelligent (Auto-Hide) :** Seuls les appareils qui consomment réellement (> 2W) s'affichent. Si votre four est éteint, il disparaît pour libérer de l'espace.
* **Interface Glassmorphism :** Effet de verre dépoli, flou d'arrière-plan (`backdrop-filter`) et lueurs néon.
* **Flux Animés (Shimmer & Dashes) :** Des points et tirets animés indiquent la circulation de l'énergie.
* **Mix Énergétique :** Visualisation claire des sources (Linky, Solaire ou Batteries).
* **Barre d'Autonomie :** Une barre de progression Lumina indique votre pourcentage d'indépendance énergétique en temps réel.

---

## 🚀 Installation

### 1. Via HACS (Recommandé)
1. Dans Home Assistant, allez dans **HACS** > **Interface**.
2. Cliquez sur les trois points en haut à droite > **Dépôts personnalisés**.
3. Collez l'URL de votre dépôt : `https://github.com/xez7082/energie-card`.
4. Sélectionnez la catégorie **Lovelace**.
5. Cliquez sur **Ajouter**, puis sur **Installer**.

### 2. Configuration Lovelace
Ajoutez une carte **Manuel** dans votre tableau de bord et utilisez le code suivant :

```yaml
type: custom:energie-card
solar: sensor.production_solaire      # Watts
linky: sensor.consommation_grid       # Watts
battery_power: sensor.batterie_watts  # Watts (positif = décharge)
battery_soc: sensor.batterie_pourcent # %
devices:
  - sensor.four_power
  - sensor.machine_a_laver_power
  - sensor.clim_salon_power
  - sensor.ordinateur_power
  - sensor.frigo_power
  # ... listez ici vos 60 appareils
