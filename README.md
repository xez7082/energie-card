⚡ Energie-Card : Lumina Interface
Une carte Home Assistant ultra-moderne au style Glassmorphism (Lumina) conçue pour la gestion avancée de l'énergie.

Cette carte n'est pas qu'un simple affichage : elle analyse en temps réel jusqu'à 60 appareils et ne montre que ceux qui consomment activement. Elle offre une visualisation fluide du mix énergétique entre votre compteur Linky, votre production solaire et vos batteries.

✨ Caractéristiques (Features)
💎 Design Lumina (Glassmorphism) : Effets de flou d'arrière-plan (backdrop-filter), bordures translucides et ombres néon.

🔋 Gestion Intelligente des Sources : Visualisation claire de la provenance du courant (Solaire, Réseau ou Batterie).

📉 Affichage Dynamique (Auto-Hide) : Gérez jusqu'à 60 appareils. La carte masque automatiquement les appareils éteints ou en veille pour ne garder que l'essentiel.

🔄 Animations de Flux : Lignes de courant animées (style dashes et glow) indiquant la circulation de l'énergie vers les récepteurs.

📊 Barre d'Autonomie : Une barre de progression élégante calcule votre pourcentage d'autoconsommation en temps réel.

🚀 Ultra-Légère : Écrite en Vanilla JS pour des performances maximales, même sur tablette ou vieux smartphone.

🛠️ Installation
Via HACS (Recommandé)
Ouvrez HACS dans votre Home Assistant.

Cliquez sur Interface.

Cliquez sur les trois points en haut à droite et choisissez Dépôts personnalisés.

Collez l'URL de votre dépôt GitHub.

Sélectionnez la catégorie Lovelace.

Cliquez sur Ajouter, puis installez Energie Card Lumina.

⚙️ Configuration
Ajoutez une carte manuelle dans votre tableau de bord avec le code suivant :

YAML
type: custom:energie-card
solar: sensor.solax_production_power  # Votre production solaire
linky: sensor.linky_power             # Votre consommation réseau
battery_power: sensor.battery_power   # Décharge batterie (W)
battery_soc: sensor.battery_soc       # État de charge (%)
devices:
  - sensor.four_power
  - sensor.lave_vaisselle_power
  - sensor.clim_chambre_power
  - sensor.pompe_piscine_power
  # Vous pouvez lister ici jusqu'à 60 entités
🎨 Design & Visuals
Lumina Style Note : Pour un rendu optimal, utilisez un fond d'écran sombre (Dark Mode). Les effets de transparence et de flou ressortiront avec un aspect premium.
