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
        { name: "solar", label: "Solaire (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky", label: "Réseau (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery2", label: "Batterie 2 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery3", label: "Batterie 3 (%)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "devices", label: "Appareils", selector: { entity: { multiple: true, domain: "sensor" } } }
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
    .tab { padding: 8px 12px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; font-size: 12px; border: 1px solid #444; }
    .tab.active { background: #00f9f9; color: #000; font-weight: bold; border-color: #00f9f9; }
  `;
}

class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {} }; }
  setConfig(config) { this.config = config; }

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

    const activeDevices = (c.devices || []).filter(id => {
      const s = this.hass.states[id];
      return s && parseFloat(s.state) > 5; // On n'affiche que si ça consomme > 5W
    });

    return html`
      <ha-card>
        <div class="card-header">
          <span class="title">${c.title || 'ENERGIE-CARD'}</span>
          <span class="autarky">${autarky}% AUTOSUFFISANT</span>
        </div>
        <div class="progress-container"><div class="progress-bar" style="width: ${autarky}%"></div></div>

        <div class="main-stats">
          <div class="stat-box solar"><ha-icon icon="mdi:solar-power"></ha-icon><span class="val">${solar}W</span><span class="label">SOLAIRE</span></div>
          <div class="stat-box battery"><ha-icon icon="mdi:battery-high"></ha-icon><span class="val">${avg_bat}%</span><div class="bat-mini">B1:${b1}%|B2:${b2}%|B3:${b3}%</div></div>
          <div class="stat-box grid"><ha-icon icon="mdi:transmission-tower"></ha-icon><span class="val">${grid}W</span><span class="label">RÉSEAU</span></div>
        </div>

        <div class="device-list">
          ${activeDevices.map(id => {
            const s = this.hass.states[id];
            return html`
              <div class="device-item">
                <ha-icon class="active-icon" icon="${s.attributes.icon || 'mdi:flash'}"></ha-icon>
                <span class="dev-name">${s.attributes.friendly_name || id.split('.')[1]}</span>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: rgba(10,10,10,0.9); backdrop-filter: blur(10px); border: 1px solid rgba(0,249,249,0.4); border-radius: 18px; padding: 20px; color: #fff; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .title { font-weight: 900; color: #00f9f9; text-transform: uppercase; }
    .autarky { font-size: 10px; background: rgba(0,249,249,0.1); color: #00f9f9; padding: 2px 8px; border-radius: 20px; border: 1px solid rgba(0,249,249,0.3); }
    .progress-container { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
    .progress-bar { height: 100%; background: #00f9f9; box-shadow: 0 0 15px #00f9f9; transition: width 1s; }
    .main-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
    .stat-box { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .val { display: block; font-weight: bold; font-size: 15px; margin: 5px 0; }
    .label { font-size: 8px; opacity: 0.5; }
    .bat-mini { font-size: 7px; color: #00f9f9; }
    
    /* Grille des appareils optimisée sans les Watts */
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); gap: 8px; margin-top: 20px; }
    .device-item { background: rgba(255,255,255,0.05); padding: 10px 5px; border-radius: 12px; text-align: center; border: 1px solid rgba(0, 249, 249, 0.1); display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .dev-name { font-size: 9px; font-weight: 500; text-transform: capitalize; color: #fff; opacity: 0.9; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
    
    ha-icon { --mdc-icon-size: 22px; color: #00f9f9; }
    .active-icon { animation: pulse 2s infinite ease-in-out; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; color: #00f9f9; filter: drop-shadow(0 0 5px #00f9f9); } 100% { transform: scale(1); opacity: 0.7; } }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energie-card",
  name: "energie-card",
  description: "Dashboard épuré : icônes animées et noms sans les puissances.",
  preview: true
});
