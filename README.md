# ⚡ Energie Card Ultimate (v2.6)
### Optimisée pour Stockage Hybride : StorCube + Marstek Venus

Cette carte personnalisée pour **Home Assistant** est conçue pour piloter une installation solaire avec une précision extrême. Elle gère dynamiquement ton parc batterie mixte et t'aide à respecter ton objectif de sobriété.

![Aperçu de la carte Energie](https://github.com/xez7082/energie-card/raw/main/enerrgie.png)

---

## 🌟 Points Forts

* **🔋 Gestion Hybride (7168 Wh)** : Additionne automatiquement `2x 1024Wh (StorCube)` + `1x 5120Wh (Marstek)`.
* **📉 Score de Sobriété** : Compare en temps réel ta consommation à ton **talon de 150W**.
* **🌙 Mode Veille Intuitif** : L'interface s'adapte automatiquement (titre et couleurs) dès que le soleil se couche.
* **📊 Sparklines intégrées** : Historiques graphiques en temps réel pour le Solaire, la Batterie et le Réseau.
* **🔌 Liste d'appareils intelligente** : Affichage compact avec icônes à gauche et Watts/Noms empilés.

![Interface de Configuration](https://github.com/xez7082/energie-card/raw/main/enrgiiie.png)

---

## 🛠 Installation

1.  **Créer le fichier** : Créez `/www/community/energie-card.js` dans votre dossier Home Assistant.
2.  **Copier le code** : Collez l'intégralité du code JavaScript (Master version).
3.  **Ajouter la ressource** : Allez dans **Paramètres > Tableaux de bord > Ressources** et ajoutez :
    * **URL** : `/local/community/energie-card.js`
    * **Type** : `JavaScript Module`

---

## ⚙️ Configuration Recommandée

Une fois la carte ajoutée à votre interface, utilisez l'éditeur intégré :

| Onglet | Paramètre | Valeur |
| :--- | :--- | :--- |
| **Sources** | Solaire / Réseau | Vos entités (ZLinky, SINSTS, etc.) |
| **Batteries** | Capacité StorCube | **2048** (Wh) |
| **Batteries** | Capacité Marstek | **5120** (Wh) |
| **Batteries** | Talon Électrique | **150** (W) |



---

## 🤖 Automatisations (YAML)

Copiez ces exemples dans votre fichier `automations.yaml` pour une surveillance proactive.

### Alerte Dépassement de Talon (Vigilance)
```yaml
alias: "Energie : Alerte Dépassement Talon"
trigger:
  - platform: numeric_state
    entity_id: sensor.votre_conso_totale
    above: 450
    for: "00:15:00"
action:
  - service: notify.mobile_app_votre_telephone
    data:
      title: "⚠️ Consommation Élevée"
      message: "La maison consomme {{ states('sensor.votre_conso_totale') }}W. Le talon est loin !"
