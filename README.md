# ⚡ Energie Card (Marstek & ZLinky Edition)

Une carte Home Assistant (Lovelace) ultra-complète et dynamique pour suivre votre production solaire **Marstek**, votre consommation réseau via **ZLinky (TIC)** et vos appareils individuels.



## ✨ Fonctionnalités
* **Optimisé ZLinky** : Conçu spécifiquement pour le mode Standard (`SINSTS`).
* **Gestion Triple Batterie** : Calcul automatique de la moyenne et affichage du détail des 3 blocs.
* **Badges Dynamiques** : Affichage en haut de la **Consommation Totale des appareils** et du **Taux d'autonomie**.
* **Appareils Intelligents** : Seuls les appareils consommant plus de 5W s'affichent pour éviter l'encombrement.
* **Noms Personnalisés** : Renommez vos entités directement depuis l'interface (ex: `sensor.piscine_power_2` -> `Piscine`).
* **Couleurs Dynamiques** : L'interface réagit à la puissance (Vert, Cyan, Orange, Rouge).
* **Réglages Visuels** : 4 curseurs pour régler la taille du titre, des badges, des icônes et du texte.

## 🛠️ Installation

1. Copiez le code JavaScript dans un fichier nommé `energie-card.js` dans votre dossier `www/` (ou `www/community/`).
2. Ajoutez la ressource dans Home Assistant :
   * **Paramètres** > **Tableaux de bord** > **Ressources**.
   * Cliquez sur **Ajouter une ressource**.
   * Saisissez l'URL : `/local/energie-card.js` (ou votre chemin personnalisé).
   * Type de ressource : **Module JavaScript**.
3. Ajoutez une carte manuelle à votre tableau de bord et tapez `type: custom:energie-card`.

---

## ⚙️ Configuration de l'éditeur

### 1. Onglet "Sources"
| Paramètre | Description |
|-----------|-------------|
| **Titre** | Nom affiché en haut à gauche. |
| **Taille Titre** | Curseur pour agrandir le titre principal. |
| **Taille Badges** | Curseur pour agrandir la Conso Totale et l'Autonomie. |
| **Production Marstek** | Entité sensor de puissance PV (W). |
| **ZLinky SINSTS** | Entité `SINSTS` de votre module ZLinky. |

### 2. Onglet "Batteries"
Associez ici vos entités de pourcentage de charge (`SOC`) pour vos 3 batteries. La carte calcule automatiquement la moyenne globale.

### 3. Onglet "Appareils"
* **Sélectionner les Appareils** : Ajoutez vos prises connectées ou modules de mesure.
* **Noms personnalisés** : Liste des noms simplifiés séparés par des virgules (ex: `Frigo, Clim, TV`). **Important :** L'ordre doit correspondre à la liste des appareils sélectionnés.
* **Tailles** : Réglez finement la taille des icônes et des polices pour s'adapter aux écrans (Tablette, Mobile, PC).

---

## 🎨 Logique des Couleurs
La carte change de couleur selon la puissance détectée :
* 🟢 **< 100W** : Éco / Veille.
* 🔵 **100W - 1000W** : Consommation modérée.
* 🟠 **1000W - 2500W** : Consommation élevée (Gros électroménager).
* 🔴 **> 2500W** : Charge critique sur le réseau.

---

## 📄 Exemple de configuration YAML
```yaml
type: custom:energie-card
title: "MON DASHBOARD ÉNERGIE"
title_size: 18
badge_size: 11
solar: sensor.marstek_pv_power
linky: sensor.zlinky_tic_sinsts
battery1: sensor.marstek_bat1_soc
battery2: sensor.marstek_bat2_soc
battery3: sensor.marstek_bat3_soc
devices:
  - sensor.prise_frigo_power
  - sensor.clim_salon_power
  - sensor.four_cuisine_power
custom_names: "Frigo, Salon, Four"
font_size: 12
icon_size: 25
