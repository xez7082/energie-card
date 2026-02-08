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
          .autarky-bar-bg { 
            height: 10px; width: 100%; background: rgba(255,255,255,0.1); 
            border-radius: 10px; margin: 15px 0; overflow: hidden;
          }
          .autarky-bar-fill {
            height: 100%; background: linear-gradient(90deg, #00d2ff, #00ff99);
            box-shadow: 0 0 15px #00ff99; transition: width 1s ease;
          }
          .main-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .source-box { 
            background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 18px; 
            text-align: center; border: 1px solid rgba(255,255,255,0.1);
          }
          .device-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
            gap: 10px; margin-top: 20px;
          }
          .device-card {
            background: rgba(255, 255, 255, 0.07); padding: 10px; border-radius: 15px;
            text-align: center; animation: fadeIn 0.5s ease;
          }
          .flow-dots {
            height: 2px; background: repeating-linear-gradient(90deg, transparent, transparent 4px, #00ff99 4px, #00ff99 8px);
            animation: flow 1.5s linear infinite; margin-top: 8px;
          }
          @keyframes flow { from { background-position: 0 0; } to { background-position: 24px 0; } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        </style>
      `;
      this.content = this.querySelector('#container');
    }

    const config = this._config;
    const solar = parseFloat(hass.states[config.solar]?.state) || 0;
    const grid = parseFloat(hass.states[config.linky]?.state) || 0;
    const bat_soc = Math.round(parseFloat(hass.states[config.battery_soc]?.state) || 0);

    // Calcul autonomie
    const total_in = solar + (grid > 0 ? 0 : Math.abs(grid)); 
    const autarky = Math.min(Math.round((solar / (solar + grid)) * 100), 100) || 0;

    const activeDevices = (config.devices || []).filter(id => {
      const s = hass.states[id];
      return s && parseFloat(s.state) > 2;
    });

    this.content.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size:0.9em;">
        <span>Autonomie</span><span>${autarky}%</span>
      </div>
      <div class="autarky-bar-bg"><div class="autarky-bar-fill" style="width:${autarky}%"></div></div>

      <div class="main-grid">
        <div class="source-box"><ha-icon icon="mdi:solar-power" style="color:#ffce70"></ha-icon><div>${solar}W</div></div>
        <div class="source-box"><ha-icon icon="mdi:battery-high" style="color:#00d2ff"></ha-icon><div>${bat_soc}%</div></div>
        <div class="source-box"><ha-icon icon="mdi:transmission-tower" style="color:#ff4b2b"></ha-icon><div>${grid}W</div></div>
      </div>

      <div class="device-grid">
        ${activeDevices.map(id => {
          const s = hass.states[id];
          return `
            <div class="device-card">
              <ha-icon icon="${s.attributes.icon || 'mdi:flash'}" style="color:#00ff99"></ha-icon>
              <div style="font-size:0.8em; margin-top:5px;">${Math.round(s.state)}W</div>
              <div class="flow-dots"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  setConfig(config) { this._config = config; }
}
customElements.define('energie-card', EnergieCard);
