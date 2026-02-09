# ⚡ Energie Card Ultimate

[![HACS](https://img.shields.io/badge/HACS-Default-blue.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/github/v/release/xez7082/energie-card?include_prereleases&label=version&color=orange)
[![License](https://img.shields.io/github/license/xez7082/energie-card?color=blue)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/xez7082/energie-card/graphs/commit-activity)

**Energie Card Ultimate** est une interface haut de gamme pour Home Assistant, optimisée pour le suivi des écosystèmes **Marstek, StorCube et ZLinky**. Elle transforme vos données brutes en un tableau de bord dynamique, intuitif et intelligent.

### 📸 Aperçu du Dashboard
![Energie Card Preview](https://github.com/xez7082/energie-card/blob/main/elec.png)

---

## ✨ Points Forts de la Version Ultimate

* **⏳ Calculateur d'Autonomie IBC :** Sélectionnez votre nombre de modules (1 à 6) dans l'éditeur. La carte calcule automatiquement le temps restant avant la décharge (Vide) ou la charge complète (Pleine) en fonction de la puissance réelle.
* **🔄 Flux d'Énergie Dynamique :** Détection automatique du sens du courant avec badges animés `CHARGE` / `DÉCHARGE` et icônes pulsantes (Vert pour le solaire, Rouge pour le réseau).
* **📱 Grille XL Adaptative :** Les tuiles d'appareils utilisent une largeur minimale de 140px pour une lecture parfaite des noms longs.
* **🎯 Tri & Filtrage Intelligent :** Classement automatique des appareils par consommation (W) et masquage des entités sous 5W pour garder un dashboard propre.
* **🎨 Éditeur Visuel Intégré :** Plus besoin de YAML. Modifiez les tailles de police, les noms et les modules via 3 onglets dédiés.

---

## 🚀 Installation Rapide

1.  **Fichier :** Déposez le fichier `energie-card.js` dans votre dossier `/config/www/`.
2.  **Ressource :** Dans Home Assistant, allez dans *Paramètres > Tableaux de bord > Ressources* et ajoutez `/local/energie-card.js` (Type : Module JavaScript).
3.  **Carte :** Ajoutez une carte sur votre tableau de bord et recherchez `Energie Card Ultimate`.

---

## ⚙️ Logique de Calcul
L'autonomie est basée sur la capacité nominale des batteries LFP (LiFePO4).


La carte multiplie le nombre de modules sélectionnés par **5 120 Wh** pour définir votre réserve totale, puis croise cette donnée avec le flux entrant (Solaire) et sortant (Appareils).

---

## ⚖️ Licence & Release
* **License :** MIT (Créez un fichier `LICENSE` sur votre dépôt pour activer le badge).
* **Version :** Créez une "Release" sur GitHub pour mettre à jour le badge de version.

---
*Développé par @xez7082 pour la communauté Home Assistant.*
