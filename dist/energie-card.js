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
        { name: "title_size", label: "Taille du Titre (px)", selector: { number: { min: 10, max: 40, mode: "slider" } } },
        { name: "badge_size", label: "Taille Consos/Autonomie (px)", selector: { number: { min: 8, max: 30, mode: "slider" } } },
        { name: "solar", label: "Production Marstek (W)", selector: { entity: { domain: "sensor" } } },
        { name: "solar_name", label: "Nom Solaire", selector: { text: {} } },
        { name: "linky", label: "ZLinky SINSTS (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky_name", label: "Nom Réseau", selector: { text: {} } }
      ],
      [ 
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "bat1_name", label: "Nom B1", selector: { text: {} } },
        { name: "battery2", label: "Batterie 2 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "bat2_name", label: "Nom B2", selector: { text: {} } },
        { name: "battery3", label: "Batterie 3 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "bat3_name", label: "Nom B3", selector: { text: {} } }
      ],
      [ 
        { name: "devices", label: "Sélectionner les Appareils (max 60)", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "custom_names", label: "Noms des appareils (virgule ou ligne)", selector: { text: { multiline: true } } },
        { name: "font_size", label: "Taille texte (px)", selector: { number: { min: 8, max: 20, mode: "slider" } } },
        { name: "icon_size", label: "Taille icônes (px)", selector: { number: { min: 15, max: 40, mode: "slider" } } }
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
  static get properties() { return { hass: {}, config: {} }; }
  setConfig(config) { this.config = config; }

  _getPowerColor(watts) {
    if (watts < 100) return "#00ff88"; 
    if (watts < 1000) return "#00f9f9"; 
    if (watts < 2500) return "#ff9500"; 
    return "#ff4d4d"; 
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

    const customNamesArr = c.custom_names ? c.custom_names.split(/,|\n/).map(n => n.trim()) : [];

    let totalDevicesPower = 0;
    // 1. On prépare tous les appareils avec leurs noms
    const allDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalDevicesPower += val;
      return { 
        id, 
        state: val, 
        stateObj: s, 
        name: customNamesArr[index] && customNamesArr[index] !== "" ? customNamesArr[index] : (s?.attributes.friendly_name || id.split('.')[1])
      };
    });

    // 2. On filtre (>5W) ET on trie par puissance décroissante
    const activeDevices = allDevices
      .filter(d => d.state > 5)
      .sort((a, b) => b.state - a.state);

    const titleSize = c.title_size || 14;
    const badgeSize = c.badge_size || 9;
    const fontSize = c.font_size || 11;
    const iconSize = c.icon_size || 20;

    return html`
      <ha-card>
        <div class="card-header">
          <span class="title" style="font-size: ${titleSize}px">${c.title || 'ENERGIE-CARD'}</span>
          <div class="header-badges">
            <span class="badge info" style="font-size: ${badgeSize}px">CONSO: ${Math.round(totalDevicesPower)}W</span>
            <span class="badge autarky" style="font-size: ${badgeSize}px">${autarky}% AUTONOME</span>
          </div>
        </div>
        <div class="progress-container"><div class="progress-bar" style="width: ${autarky}%"></div></div>

        <div class="main-stats">
          <div class="stat-box solar">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">${c.solar_name || 'SOLAIRE'}</span>
          </div>
          <div class="stat-box battery">
            <ha-icon icon="mdi:battery-high"></ha-icon>
            <span class="val">${avg_bat}%</span>
            <div class="bat-mini">
               ${c.bat1_name || 'B1'}:${b1}%|${c.bat2_name || 'B2'}:${b2}%|${c.bat3_name || 'B3'}:${b3}%
            </div>
          </div>
          <div class="stat-box grid">
            <ha-icon icon="mdi:transmission-tower"></ha-icon>
            <span class="val" style="color: ${this._getPowerColor(grid)}">${grid}W</span>
            <span class="label">${c.linky_name || 'RÉSEAU'}</span>
          </div>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => {
            const pwr = Math.round(d.state);
            const color = this._getPowerColor(pwr);
            return html`
              <div class="device-item" style="border-color: ${color}44">
                <ha-icon class="active-icon" 
                         icon="${d.stateObj?.attributes.icon || 'mdi:flash'}" 
                         style="--mdc-icon-size: ${iconSize}px; color: ${color}; filter: drop-shadow(0 0 3px ${color})">
                </ha-icon>
                <div class="dev-info">
                   <span class="dev-val" style="font-size: ${fontSize}px; color: ${color}">${pwr}W</span>
                   <span class="dev-name" style="font-size: ${fontSize - 3}px">${d.name}</span>
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
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
    .title { font-weight: 800; color: #00f9f9; letter-spacing: 1px; }
    .header-badges { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .badge { padding: 5px 14px; border-radius: 20px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); white-space: nowrap; }
    .badge.autarky { background: rgba(0, 249, 249, 0.1); color: #00f9f9; border-color: rgba(0, 249, 249, 0.4); }
    .badge.info { background: rgba(255, 255, 255, 0.05); color: #fff; }
    .progress-container { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 22px; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #00f9f9, #008f8f); box-shadow: 0 0 10px #00f9f9; transition: width 1.5s ease-in-out; }
    .main-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
    .stat-box { background: rgba(255,255,255,0.02); padding: 12px 5px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05); }
    .val { display: block; font-weight: bold; font-size: 16px; margin: 4px 0; }
    .label { font-size: 8px; opacity: 0.4; font-weight: bold; text-transform: uppercase; }
    .bat-mini { font-size: 7px; color: #00f9f9; opacity: 0.7; }
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 8px; margin-top: 22px; }
    .device-item { background: rgba(255,255,255,0.03); padding: 10px 5px; border-radius: 14px; border: 1px solid transparent; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: all 0.3s ease; }
    .dev-info { display: flex; flex-direction: column; align-items: center; width: 100%; }
    .dev-val { font-weight: bold; }
    .dev-name { opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 90%; text-align: center; }
    .active-icon { animation: pulse 2.5s infinite ease-in-out; }
    @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } }
    ha-icon { color: #00f9f9; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energie-card",
  name: "Energie Card Ultimate",
  description: "Dashboard 60 appareils avec tri automatique par puissance.",
  preview: true
});
