class EnergieCard extends HTMLElement {
  // Déclare l'éditeur pour l'interface HA
  static getConfigElement() {
    return document.createElement("energie-card-editor");
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div id="container"></div>
        </ha-card>
        <style>
          ha-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border-radius: 24px; padding: 20px; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
          .title-area { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #00f9f9; }
          .bar-bg { height: 10px; width: 100%; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
          .bar-fill { height: 100%; background: linear-gradient(90deg, #00f9f9, #00ff88); transition: width 1s ease; box-shadow: 0 0 10px #00f9f9; }
          .main-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center; }
          .box { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.1); }
          .val { font-size: 1.2em; font-weight: bold; display: block; }
          .lbl { font-size: 0.7em; opacity: 0.6; text-transform: uppercase; }
          .bat-sub { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 10px; font-size: 0.7em; }
          .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; margin-top: 20px; }
          .dev-card { background: rgba(255,255,255,0.07); padding: 10px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
          .flow { height: 2px; background: repeating-linear-gradient(90deg, transparent, transparent 4px, #00f9f9 4px, #00f9f9 8px); animation: flow 1.5s linear infinite; margin-top: 8px; }
          @keyframes flow { from { background-position: 0 0; } to { background-position: 24px 0; } }
          ha-icon { color: #00f9f9; --mdc-icon-size: 24px; }
        </style>
      `;
      this.content = this.querySelector('#container');
    }

    this.update();
  }

  update() {
    const config = this._config;
    const hass = this._hass;
    if (!config || !hass) return;

    const solar = Math.round(parseFloat(hass.states[config.solar]?.state) || 0);
    const grid = Math.round(parseFloat(hass.states[config.linky]?.state) || 0);
    const b1 = Math.round(parseFloat(hass.states[config.battery1]?.state) || 0);
    const b2 = Math.round(parseFloat(hass.states[config.battery2]?.state) || 0);
    const b3 = Math.round(parseFloat(hass.states[config.battery3]?.state) || 0);
    
    const avg_bat = Math.round((b1 + b2 + b3) / 3);
    const autarky = Math.min(Math.round((solar / (solar + Math.max(grid, 0))) * 100), 100) || 0;

    const activeDevices = (config.devices || []).filter(id => {
      const s = hass.states[id];
      return s && parseFloat(s.state) > 2;
    });

    this.content.innerHTML = `
      <div class="title-area">
        <span>${config.title || 'SOLAR ENERGY'}</span>
        <span>${autarky}% AUTONOME</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width: ${autarky}%"></div></div>
      
      <div class="main-grid">
        <div class="box"><ha-icon icon="mdi:solar-power"></ha-icon><span class="val">${solar}W</span><span class="lbl">Solaire</span></div>
        <div class="box"><ha-icon icon="mdi:battery-high"></ha-icon><span class="val">${avg_bat}%</span><span class="lbl">Batteries</span></div>
        <div class="box"><ha-icon icon="mdi:transmission-tower"></ha-icon><span class="val">${grid}W</span><span class="lbl">Réseau</span></div>
      </div>

      <div class="bat-sub">
        <div class="box">B1: ${b1}%</div><div class="box">B2: ${b2}%</div><div class="box">B3: ${b3}%</div>
      </div>

      <div class="device-grid">
        ${activeDevices.map(id => {
          const s = hass.states[id];
          return `
            <div class="dev-card">
              <ha-icon icon="${s.attributes.icon || 'mdi:flash'}"></ha-icon>
              <div style="font-size: 12px; font-weight: bold;">${Math.round(s.state)}W</div>
              <div style="font-size: 8px; opacity: 0.5;">${s.attributes.friendly_name || id.split('.')[1]}</div>
              <div class="flow"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  setConfig(config) {
    this._config = config;
  }
}

// --- LOGIQUE DE L'EDITEUR SANS LIT ---
class EnergieCardEditor extends HTMLElement {
  set hass(hass) { this._hass = hass; }
  setConfig(config) { this._config = config; }
  // L'éditeur basique peut être étendu plus tard, mais pour stabiliser tes erreurs, 
  // on utilise d'abord la config YAML.
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

// Notification console propre
console.info("%c ENERGIE-CARD %c v1.0.0 ", "color: white; background: #00f9f9; font-weight: 700;", "color: #00f9f9; background: #333; font-weight: 700;");
