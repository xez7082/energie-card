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
        { name: "title", label: "Titre du Dashboard", selector: { text: {} } },
        { name: "solar", label: "Production Marstek (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky", label: "ZLinky SINSTS (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery2", label: "Batterie 2 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery3", label: "Batterie 3 (%)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "devices", label: "Sélectionner les Appareils", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "font_size", label: "Taille du texte (px)", selector: { number: { min: 8, max: 20, mode: "slider" } } },
        { name: "icon_size", label: "Taille des icônes (px)", selector: { number: { min: 15, max: 40, mode: "slider" } } }
      ]
    ];
    return html`
      <div class="tabs">
        ${["Sources", "Batteries", "Réglages"].map((n, i) => html`
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
  static get properties() { return { hass: {}, config: {} }; }
  setConfig(config) { this.config = config; }

  // Fonction pour déterminer la couleur selon la puissance
  _getPowerColor(watts) {
    if (watts < 100) return "#00ff88"; // Vert (Éco)
    if (watts < 1000) return "#00f9f9"; // Cyan (Normal)
    if (watts < 2500) return "#ff9500"; // Orange (Fort)
    return "#ff4d4d"; // Rouge (Très fort)
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const b1 = Math.round(parseFloat(this.hass.states[c.battery1]?.state) || 0);
    const b2 = Math.round(parseFloat(this.hass.states[c.battery2]?.state) || 0);
    const b3 = Math.round(parseFloat(this.hass.states[c.battery3]?.state) || 0);
    
    const avg_bat = Math.round((b1 + b2 + b3) / 3) || 0;
    const total_cons = solar + (grid > 0 ? grid : 0);
    const autarky = Math.min(Math.round((solar / total_cons) * 100), 100) || 0;

    let totalDevicesPower = 0;
    const activeDevices = (c.devices || []).filter(id => {
      const s = this.hass.states[id];
      if (s) {
        const val = parseFloat(s.state) || 0;
        totalDevicesPower += val;
        return val > 5;
      }
      return false;
    });

    const fontSize = c.font_size || 11;
    const iconSize = c.icon_size || 20;

    return html`
      <ha-card>
        <div class="card-header">
          <span class="title">${c.title || 'ENERGIE-CARD'}</span>
          <div class="header-badges">
            <span class="badge info">CONSO: ${Math.round(totalDevicesPower)}W</span>
            <span class="badge autarky">${autarky}% AUTONOME</span>
          </div>
        </div>
        <div class="progress-container"><div class="progress-bar" style="width: ${autarky}%"></div></div>

        <div class="main-stats">
          <div class="stat-box solar">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>
          <div class="stat-box battery">
            <ha-icon icon="mdi:battery-high"></ha-icon>
            <span class="val">${avg_bat}%</span>
            <div class="bat-mini">B1:${b1}%|B2:${b2}%|B3:${b3}%</div>
          </div>
          <div class="stat-box grid">
            <ha-icon icon="mdi:transmission-tower"></ha-icon>
            <span class="val" style="color: ${this._getPowerColor(grid)}">${grid}W</span>
            <span class="label">RÉSEAU</span>
          </div>
        </div>

        <div class="device-list">
          ${activeDevices.map(id => {
            const s = this.hass.states[id];
            const pwr = Math.round(parseFloat(s.state));
            const color = this._getPowerColor(pwr);
            return html`
              <div class="device-item" style="border-color: ${color}44">
                <ha-icon class="active-icon" 
                         icon="${s.attributes.icon || 'mdi:flash'}" 
                         style="--mdc-icon-size: ${iconSize}px; color: ${color}; filter: drop-shadow(0 0 3px ${color})">
                </ha-icon>
                <div class="dev-info">
                   <span class="dev-val" style="font-size: ${fontSize}px; color: ${color}">${pwr}W</span>
                   <span class="dev-name" style="font-size: ${fontSize - 3}px">${s.attributes.friendly_name || id.split('.')[1]}</span>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: rgba(13, 13, 13, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(0, 249, 249, 0.3); border-radius: 20px; padding: 18px; color: #fff; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .title { font-weight: 800; color: #00f9f9; letter-spacing: 1px; font-size: 14px; }
    .header-badges { display: flex; gap: 5px; }
    .badge { font-size: 9px; padding: 2px 8px; border-radius: 12px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); }
    .badge.autarky { background: rgba(0, 249, 249, 0.1); color: #00f9f9; border-color: rgba(0, 249, 249, 0.3); }
    .badge.info { background: rgba(255, 255, 255, 0.05); color: #fff; }
    
    .progress-container { height: 5px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 22px; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #00f9f9, #008f8f); box-shadow: 0 0 10px #00f9f9; transition: width 1.5s ease-in-out; }
    
    .main-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
    .stat-box { background: rgba(255,255,255,0.02); padding: 12px 5px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); }
    .val { display: block; font-weight: bold; font-size: 16px; margin: 4px 0; transition: color 0.5s; }
    .label { font-size: 8px; opacity: 0.4; font-weight: bold; }
    .bat-mini { font-size: 7px; color: #00f9f9; opacity: 0.7; }
    
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 8px; margin-top: 22px; }
    .device-item { background: rgba(255,255,255,0.03); padding: 10px 5px; border-radius: 14px; border: 1px solid transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.3s; }
    .dev-info { display: flex; flex-direction: column; align-items: center; width: 100%; }
    .dev-val { font-weight: bold; transition: color 0.5s; }
    .dev-name { opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 90%; text-align: center; }
    
    .active-icon { animation: pulse 2.5s infinite ease-in-out; }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } }
    ha-icon { color: #00f9f9; }
    .solar ha-icon { color: #ffce70; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energie-card",
  name: "energie-card",
  description: "Dashboard Marstek dynamique avec couleurs selon puissance et réglage texte.",
  preview: true
});
