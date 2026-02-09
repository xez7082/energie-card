# ⚡ Energie Card Ultimate (v2.6)
### Spécial Hybride : StorCube + Marstek Venus

Ce projet est une carte **Lovelace personnalisée** pour Home Assistant. Elle centralise la gestion d'un parc batterie hybride de **7168 Wh** et optimise la consommation domestique en fonction d'un **talon cible de 150W**.

---

## 📸 Aperçu des Fonctionnalités

* **Gestion Hybride** : Additionne automatiquement `2x 1024Wh (StorCube)` + `1x 5120Wh (Marstek)`.
* **Algorithme de Sobriété** : Analyse l'écart entre ta conso réelle et ton talon de 150W.
* **Indicateur de Flux** : Visualisation instantanée Charge (Solaire > Conso) / Décharge (Batterie/Réseau).
* **Sparklines** : Historique graphique ultra-léger sans base de données externe.
* **Adaptabilité** : Mode nuit automatique et icônes dynamiques à gauche.



---

## 🛠 Installation

1.  **Fichier** : Créez `/www/community/energie-card.js` et collez le code JavaScript fourni.
2.  **Ressource** : Ajoutez `/local/community/energie-card.js` dans vos ressources Lovelace (Type: Module).
3.  **Configuration** :
    * **Talon** : 150 (Watts)
    * **Capacité StorCube** : 2048 (Wh)
    * **Capacité Marstek** : 5120 (Wh)

---

## 🤖 Automatisations Recommandées (YAML)

Voici deux automatisations à copier dans votre fichier `automations.yaml` pour tirer profit de la carte.

### 1. Alerte de dépassement de talon (Vigilance)
Cette automatisation vous prévient si vous dépassez 400W (talon + marge) pendant plus de 10 minutes sans raison apparente.

```yaml
alias: "Energie : Alerte Dépassement Talon"
trigger:
  - platform: numeric_state
    entity_id: sensor.votre_consommation_totale # Remplacez par votre sensor
    above: 400
    for: "00:10:00"
condition:
  - condition: state
    entity_id: sun.sun
    state: "below_horizon" # Uniquement la nuit pour éviter les faux positifs solaires
action:
  - service: notify.mobile_app_votre_telephone
    data:
      title: "⚠️ Vigilance Énergie"
      message: "La maison consomme plus que le talon (actuel: {{ states('sensor.votre_consommation_totale') }}W)."
