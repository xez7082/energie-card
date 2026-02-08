class EnergieCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div id="container"></div>
        </ha-card>
        <style>
          ha-card {
            background: rgba(255, 255, 255, 0.03) !important;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 20px;
            color: #fff;
          }
          /* Barre d'autoconsommation */
          .autarky-container { margin-bottom: 20px; }
          .autarky-bar-bg { 
            height: 8px; width: 100%; background: rgba(255,255,255,0.1); 
            border-radius: 10px; overflow: hidden; position: relative;
          }
          .autarky-bar-fill {
            height: 100%; background: linear-gradient(90deg, #00d2ff, #00ff99);
            box-shadow: 0 0 10px #00ff99; transition: width 1s ease-in-out;
          }
          .autarky-text { font-size: 0.8em; margin-bottom: 5px; display: flex; justify-content: space-between; }

          .main-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
          .source-box { 
            background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 15px; text-align: center;
            border: 1px solid rgba(255,255,255,0.05); position: relative;
          }
          .device-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 8px; 
          }
          .device-card {
            background: rgba(255, 255, 255, 0.08); padding: 8px; border-radius: 12px; text-align: center;
            font-size: 0.75em; border: 1px solid rgba(255,255,255,0.05);
            animation: fadeIn 0.4s ease forwards;
          }
          /* Animation Dash/Flow */
          .flow-line {
            height: 2px; width: 100%; background: repeating-linear-gradient(90deg, transparent, transparent 5px, #00ff99 5px, #00ff99 10px);
            animation: flow 1s linear infinite; margin-top: 4px;
          }
          @keyframes flow { from { background-position: 0 0; } to { background-position: 20px 0; } }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          .unit { font-size: 0.7em; opacity: 0.5; }
        </style>
      `;
      this.content = this.querySelector('#container');
    }

    const config = this._config;
    const solar = parseFloat(hass.states[config.solar]?.state) || 0;
    const grid = parseFloat(hass.states[config.linky]?.state) || 0;
    const battery = parseFloat(hass.states[config.battery_power]?.state) || 0;
    const battery_soc = hass.states[config.battery_soc]?.state || 0;

    // Calcul de l'autoconsommation (0 à 100%)
    const total_cons = Math.max(solar + grid + battery, 1);
    const autarky = Math.min(Math.round(((solar + (battery > 0 ? battery : 0)) / total_cons) * 100), 100);

    // Filtrage des 60 appareils
    const activeDevices = (config.devices || []).filter(id => {
      const s = hass.states[id];
      return s && parseFloat(s.state) > 2;
    });

    this.content.innerHTML = `
      <div class="autarky-container">
        <div class="autarky-text">
          <span>Autonomie Énergétique</span>
          <span>${autarky}%</span>
        </div>
        <div class="autarky-bar-bg">
          <div class="autarky-bar-fill" style="width: ${autarky}%"></div>
        </div>
      </div>

      <div class="main-grid">
        <div class="source-box" style="box-shadow: 0 0 10px rgba(255, 206, 112, 0.2)">
          <ha-icon icon="mdi:solar-power" style="color: #ffce70"></ha-icon>
          <div>${solar}<span class="unit">W</span></div>
        </div>
        <div class="source-box" style="box-shadow: 0 0 10px rgba(0, 210, 255, 0.2)">
          <ha-icon icon="mdi:battery-high" style="color: #00d2ff"></ha-icon>
          <div>${battery_soc}<span class="unit">%</span></div>
        </div>
        <div class="source-box" style="box-shadow: 0 0 10px rgba(255, 75, 43, 0.2)">
          <ha-icon icon="mdi:transmission-tower" style="color: #ff4b2b"></ha-icon>
          <div>${grid}<span class="unit">W</span></div>
        </div>
      </div>

      <div class="device-grid">
        ${activeDevices.map(id => {
          const s = hass.states[id];
          return `
            <div class="device-card">
              <ha-icon icon="${s.attributes.icon || 'mdi:flash'}" style="color: #00ff99"></ha-icon>
              <div>${Math.round(s.state)}<span class="unit">W</span></div>
              <div class="flow-line"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  setConfig(config) { this._config = config; }
}
customElements.define('energie-card', EnergieCard);
