import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. L'ÉDITEUR (Interface pour configurer la carte sans code) ---
class EnergieCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _tab: { type: Number } }; }
  
  constructor() {
    super();
    this._tab = 0;
  }

  setConfig(config) {
    this._config = config;
  }

  _selectTab(idx) {
    this._tab = idx;
  }

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
        { name: "title", label: "Titre de la carte", selector: { text: {} } },
        { name: "solar", label: "Production Solaire (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky", label: "Consommation Réseau (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery2", label: "Batterie 2 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "battery3", label: "Batterie 3 (%)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "devices", label: "Sélectionner les appareils (ex: clim, four...)", selector: { entity: { multiple: true, domain: "sensor" } } }
      ]
    ];

    const tabs = ["Sources", "Batteries", "Appareils"];

    return html`
      <div class="tabs">
        ${tabs.map((n, i) => html`
          <div class="tab ${this._tab === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${n}</div>
        `)}
      </div>
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schemas[this._tab]}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  static styles = css`
    .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    .tab { padding: 10px 15px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.3s; border: 1px solid #444; }
    .tab.active { background: #00f9f9; color: #000; font-weight: bold; border-color: #00f9f9; box-shadow: 0 0 10px rgba(0, 249, 249, 0.4); }
  `;
}

// --- 2. LA CARTE (Affichage du Dashboard) ---
class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  
  static get properties() {
    return { hass: {}, config: {} };
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const c = this.config;
    // Récupération des données
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const b1 = Math.round(parseFloat(this.hass.states[c.battery1]?.state) || 0);
    const b2 = Math.round(parseFloat(this.hass.states[c.battery2]?.state) || 0);
    const b3 = Math.round(parseFloat(this.hass.states[c.battery3]?.state) || 0);
    
    const avg_bat = Math.round((b1 + b2 + b3) / 3) || 0;
    const total_cons = solar + (grid > 0 ? grid : 0);
    const autarky = Math.min(Math.round((solar / total_cons) * 100), 100) || 0;

    // Filtrer les appareils actifs (> 2W)
    const activeDevices = (c.devices || []).filter(id => {
      const s = this.hass.states[id];
      return s && parseFloat(s.state) > 2;
    });

    return html`
      <ha-card>
        <div class="card-header">
          <span class="title">${c.title || 'ENERGIE CARD'}</span>
          <span class="autarky">${autarky}% AUTOSUFFISANT</span>
        </div>

        <div class="progress-container">
          <div class="progress-bar" style="width: ${autarky}%"></div>
        </div>

        <div class="main-stats">
          <div class="stat-box solar">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>
          <div class="stat-box battery">
            <ha-icon icon="mdi:battery-high"></ha-icon>
            <span class="val">${avg_bat}%</span>
            <div class="bat-mini">B1:${b1}% | B2:${b2}% | B3:${b3}%</div>
          </div>
          <div class="stat-box grid">
            <ha-icon icon="mdi:transmission-tower"></ha-icon>
            <span class="val">${grid}W</span>
            <span class="label">RÉSEAU</span>
          </div>
        </div>

        <div class="device-list">
          ${activeDevices.map(id => {
            const stateObj = this.hass.states[id];
            return html`
              <div class="device-item">
                <ha-icon icon="${stateObj.attributes.icon || 'mdi:flash'}"></ha-icon>
                <div class="dev-info">
                  <span class="dev-val">${Math.round(stateObj.state)}W</span>
                  <span class="dev-name">${stateObj.attributes.friendly_name || id.split('.')[1]}</span>
                </div>
                <div class="flow-line"></div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      background: rgba(15, 15, 15, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 249, 249, 0.4);
      border-radius: 18px;
      padding: 20px;
      color: #fff;
    }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .title { font-weight: 900; color: #00f9f9; text-transform: uppercase; letter-spacing: 1px; }
    .autarky { font-size: 10px; background: rgba(0, 249, 249, 0.1); color: #00f9f9; padding: 2px 8px; border-radius: 20px; border: 1px solid rgba(0, 249, 249, 0.3); }
    
    .progress-container { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 20px; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #00f9f9, #00b3b3); box-shadow: 0 0 15px #00f9f9; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1); }

    .main-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
    .stat-box { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    .val { display: block; font-weight: bold; font-size: 16px; color: #fff; margin: 5px 0; }
    .label { font-size: 8px; opacity: 0.5; font-weight: bold; }
    .bat-mini { font-size: 7px; color: #00f9f9; opacity: 0.8; }

    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: 20px; }
    .device-item { background: rgba(0, 0, 0, 0.3); padding: 8px; border-radius: 10px; border: 1px solid rgba(0, 249, 249, 0.1); position: relative; }
    .dev-name { font-size: 8px; opacity: 0.6; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dev-val { font-size: 11px; font-weight: bold; color: #00f9f9; display: block; }
    
    .flow-line { height: 1px; width: 60%; background: #00f9f9; margin: 4px auto 0; opacity: 0.4; box-shadow: 0 0 5px #00f9f9; animation: flash 2s infinite; }
    @keyframes flash { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.8; } }

    ha-icon { --mdc-icon-size: 22px; color: #00f9f9; }
    .solar ha-icon { color: #ffce70; }
    .grid ha-icon { color: #ff4d4d; }
  `;
}

// --- 3. ENREGISTREMENT ---
customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energie-card",
  name: "energie-card",
  description: "Dashboard Solaire, Réseau, Batteries et 60 appareils.",
  preview: true
});
