import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class EnergieCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _tab: { type: Number } }; }
  constructor() { super(); this._tab = 0; }
  setConfig(config) { this._config = config; }
  _selectTab(idx) { this._tab = idx; }
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const event = new CustomEvent("config-changed", {
      detail: { config: ev.detail.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = [
      [ 
        { name: "title", label: "Titre", selector: { text: {} } },
        { name: "main_font_size", label: "Taille Watts (px)", selector: { number: { min: 10, max: 40, mode: "slider" } } },
        { name: "solar", label: "Production Solaire (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky", label: "Réseau SINSTS (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "nb_modules", label: "Nombre de modules IBC (5.12kWh)", selector: { number: { min: 1, max: 6, mode: "box" } } },
        { name: "bat_font_size", label: "Taille % Batterie (px)", selector: { number: { min: 10, max: 40, mode: "slider" } } },
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery2", label: "Batterie 2 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery3", label: "Batterie 3 (%)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "devices", label: "Appareils", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "custom_names", label: "Noms (Un par ligne)", selector: { text: { multiline: true } } },
        { name: "font_size", label: "Taille texte Appareils (px)", selector: { number: { min: 8, max: 20, mode: "slider" } } }
      ]
    ];
    return html`
      <div class="tabs">
        ${["Sources", "Batteries", "Appareils"].map((n, i) => html`
          <div class="tab ${this._tab === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${n}</div>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._tab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`
    .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    .tab { padding: 8px 12px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; font-size: 12px; border: 1px solid #444; flex: 1; text-align: center; }
    .tab.active { background: #00f9f9; color: #000; font-weight: bold; border-color: #00f9f9; }
  `;
}

class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _showHelp: { type: Boolean } }; }
  
  setConfig(config) { this.config = config; }

  _getPowerColor(watts) {
    if (watts < 100) return "#00ff88"; 
    if (watts < 1000) return "#00f9f9"; 
    if (watts < 2500) return "#ff9500"; 
    return "#ff4d4d"; 
  }

  _calculateTime(soc, power, nbModules) {
    const capacity = (nbModules || 1) * 5120;
    if (!power || Math.abs(power) < 15) return "--h";
    const whRemaining = (soc / 100) * capacity;
    const whToFull = ((100 - soc) / 100) * capacity;
    if (power < 0) {
      const hours = whRemaining / Math.abs(power);
      return `Vide: ${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
    } else {
      const hours = whToFull / power;
      return `Pleine: ${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const hasBattery = c.battery1 || c.battery2 || c.battery3;
    const b1 = c.battery1 ? Math.round(parseFloat(this.hass.states[c.battery1]?.state) || 0) : null;
    const b2 = c.battery2 ? Math.round(parseFloat(this.hass.states[c.battery2]?.state) || 0) : null;
    const b3 = c.battery3 ? Math.round(parseFloat(this.hass.states[c.battery3]?.state) || 0) : null;
    
    const bat_values = [b1, b2, b3].filter(v => v !== null);
    const avg_soc = bat_values.length > 0 ? Math.round(bat_values.reduce((a, b) => a + b, 0) / bat_values.length) : 0;

    const customNamesArr = c.custom_names ? c.custom_names.split(/,|\n/).map(n => n.trim()) : [];
    let totalCons = 0;
    const activeDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { 
        state: val, 
        stateObj: s, 
        name: customNamesArr[index] && customNamesArr[index] !== "" ? customNamesArr[index] : (s?.attributes.friendly_name || id.split('.')[1])
      };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const batPowerFlux = solar - totalCons;
    const batTime = this._calculateTime(avg_soc, batPowerFlux, c.nb_modules);
    const autarky = Math.min(Math.round((solar / (solar + (grid > 0 ? grid : 0) || 1)) * 100), 100) || 0;
    let cardStatusColor = autarky > 90 ? "#00ff88" : (autarky < 20 ? "#ff4d4d" : "#00f9f9");

    return html`
      <ha-card style="border-color: ${cardStatusColor}66">
        <div class="card-header">
          <span class="title">${c.title || 'ENERGIE-ULTIMATE'}</span>
          <div class="header-badges">
             <span class="badge ${batPowerFlux >= 0 ? 'charge' : 'discharge'}">
               ${batPowerFlux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}
             </span>
          </div>
        </div>

        <div class="main-stats">
          <div class="stat-box solar">
            <ha-icon icon="mdi:solar-power" class="${solar > 10 ? 'flowing' : ''}"></ha-icon>
            <span class="val" style="font-size: ${c.main_font_size || 18}px">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>

          ${hasBattery ? html`
            <div class="stat-box battery">
              <ha-icon icon="mdi:battery-high"></ha-icon>
              <span class="val" style="font-size: ${c.bat_font_size || 18}px">${avg_soc}%</span>
              <span class="label-time">${batTime}</span>
            </div>
          ` : ''}

          <div class="stat-box grid">
            <ha-icon icon="mdi:transmission-tower" class="${grid > 10 ? 'flowing-red' : ''}"></ha-icon>
            <span class="val" style="color: ${this._getPowerColor(grid)}; font-size: ${c.main_font_size || 18}px">${grid}W</span>
            <span class="label">RÉSEAU</span>
          </div>
        </div>

        <div class="autarky-bar-container">
           <div class="autarky-fill" style="width: ${autarky}%; background: ${cardStatusColor}"></div>
           <span class="autarky-text">AUTOSUFFISANCE : ${autarky}%</span>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => {
            const color = this._getPowerColor(d.state);
            return html`
              <div class="device-item" style="border-bottom-color: ${color}aa">
                <ha-icon icon="${d.stateObj?.attributes.icon || 'mdi:flash'}" style="color: ${color}"></ha-icon>
                <div class="dev-info">
                   <span class="dev-val" style="color: ${color}; font-size: ${c.font_size || 12}px">${Math.round(d.state)}W</span>
                   <span class="dev-name" style="font-size: ${(c.font_size || 12) - 1}px">${d.name}</span>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #0d0d0d; border-radius: 16px; padding: 16px; color: #fff; border: 2px solid transparent; transition: border-color 1s ease; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-weight: 900; letter-spacing: 2px; color: #555; text-transform: uppercase; font-size: 13px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; }
    .charge { background: #00ff8822; color: #00ff88; border: 1px solid #00ff88; }
    .discharge { background: #ff4d4d22; color: #ff4d4d; border: 1px solid #ff4d4d; }

    .main-stats { display: flex; gap: 10px; margin-bottom: 20px; justify-content: space-between; }
    .stat-box { background: #1a1a1a; padding: 15px 5px; border-radius: 12px; text-align: center; flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
    .val { font-weight: 900; margin: 5px 0; }
    .label { font-size: 8px; opacity: 0.5; font-weight: bold; }
    .label-time { font-size: 9px; color: #00f9f9; font-weight: bold; }

    .autarky-bar-container { height: 20px; background: #1a1a1a; border-radius: 6px; position: relative; overflow: hidden; margin-bottom: 20px; }
    .autarky-fill { height: 100%; transition: width 2s ease-in-out; opacity: 0.6; }
    .autarky-text { position: absolute; width: 100%; text-align: center; top: 3px; font-size: 10px; font-weight: 900; color: #fff; }

    .device-list { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
      gap: 12px; 
    }
    .device-item { 
      background: #151515; 
      padding: 12px 14px; 
      border-radius: 12px; 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      border-bottom: 3px solid transparent;
      min-width: 0;
    }
    .dev-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .dev-val { font-weight: 900; }
    .dev-name { opacity: 0.7; line-height: 1.2; word-break: break-word; overflow-wrap: anywhere; }

    .flowing { animation: glow-green 2s infinite; }
    .flowing-red { animation: glow-red 2s infinite; }
    @keyframes glow-green { 0%, 100% { color: #fff; } 50% { color: #00ff88; filter: drop-shadow(0 0 5px #00ff88); } }
    @keyframes glow-red { 0%, 100% { color: #fff; } 50% { color: #ff4d4d; filter: drop-shadow(0 0 5px #ff4d4d); } }
    
    ha-icon { --mdc-icon-size: 24px; color: #00f9f9; flex-shrink: 0; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energie-card",
  name: "Energie Card Ultimate",
  description: "Dashboard pro avec modules IBC et cartes larges.",
  preview: true
});
