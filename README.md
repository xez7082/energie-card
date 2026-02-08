# ⚡ Energie-Card Lumina

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

Une interface **Glassmorphism Lumina** haute performance pour Home Assistant. Cette carte gère intelligemment votre mix énergétique (Solaire, Linky, Batteries) et filtre dynamiquement jusqu'à **60 appareils électriques**.

---

## 💎 Aperçu du Design
* **Interface Glassmorphism :** Effet de flou translucide (`backdrop-filter`) et bordures lumineuses.
* **Gestion Dynamique :** Seuls les appareils consommant plus de 2W sont affichés. Les 60 autres restent masqués pour garder un tableau de bord épuré.
* **Animations de Flux :** Lignes de courant animées (dashes/glow) indiquant la circulation de l'énergie.
* **Barre d'Autonomie :** Calcul en temps réel de votre indépendance énergétique.

---

## 🚀 Installation

### 1. Via HACS (Recommandé)
1. Dans Home Assistant, allez dans **HACS** > **Interface**.
2. Cliquez sur les trois points en haut à droite > **Dépôts personnalisés**.
3. Collez l'URL de ce dépôt GitHub.
4. Sélectionnez la catégorie **Lovelace**.
5. Cliquez sur **Installer**.

### 2. Configuration Lovelace
Ajoutez une carte "Manuel" et utilisez le schéma suivant :

```yaml
type: custom:energie-card
solar: sensor.votre_production_solaire  # Watts
linky: sensor.votre_conso_linky         # Watts
battery_power: sensor.puissance_batterie # Watts (positif = décharge)
battery_soc: sensor.etat_batterie_percent # %
devices:
  - sensor.four_power
  - sensor.lave_linge_power
  - sensor.clim_salon_power
  - sensor.ordinateur_bureau_power
  - sensor.chauffe_eau_power
  # ... vous pouvez lister jusqu'à 60 appareils ici
