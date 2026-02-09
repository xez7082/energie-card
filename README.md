alias: "Energie : Batterie Critique"
trigger:
  - platform: numeric_state
    entity_id: sensor.votre_batterie_soc
    below: 15
action:
  - service: notify.mobile_app_votre_telephone
    data:
      title: "🪫 Batterie Faible"
      message: "Niveau critique : {{ states('sensor.votre_batterie_soc') }}%."
