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
        { name: "linky", label: "ZLinky SINSTS (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "nb_modules", label: "Modules IBC (5.12kWh)", selector: { number: { min: 1, max: 6, mode: "box" } } },
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "devices", label: "Appareils", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "custom_names", label: "Noms personnalisés", selector: { text: { multiline: true } } }
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
    .tab { padding: 8px 12px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; font-size: 11px; border: 1px solid #444; flex: 1; text-align: center; }
    .tab.active { background: #00f9f9; color: #000; font-weight: bold; border-color: #00f9f9; }
  `;
}

class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _history: { type: Object } }; }
  
  constructor() {
    super();
    this._history = { solar: [], battery: [], grid: [] };
  }

  setConfig(config) { this.config = config; }

  // Générateur de mini-graphique SVG
  _renderSparkline(data, color) {
    if (!data || data.length < 2) return html``;
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return html`
      <svg class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" />
      </svg>
    `;
  }

  _updateHistory(type, value) {
    const now = Date.now();
    this._history[type].push(value);
    if (this._history[type].length > 30) this._history[type].shift(); // Garde les 30 derniers points
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const bat = Math.round(parseFloat(this.hass.states[c.battery1]?.state) || 0);

    // Mise à jour silencieuse de l'historique
    this._updateHistory('solar', solar);
    this._updateHistory('grid', grid);
    this._updateHistory('battery', bat);

    const customNamesArr = c.custom_names ? c.custom_names.split(/,|\n/).map(n => n.trim()) : [];
    let totalCons = 0;
    const activeDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { state: val, name: customNamesArr[index] || (s?.attributes.friendly_name || id.split('.')[1]) };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const batPowerFlux = solar - totalCons;
    const autarky = Math.min(Math.round((solar / (solar + (grid > 0 ? grid : 0) || 1)) * 100), 100) || 0;
    let cardStatusColor = autarky > 90 ? "#00ff88" : (autarky < 20 ? "#ff4d4d" : "#00f9f9");

    return html`
      <ha-card style="border-color: ${cardStatusColor}66">
        <div class="card-header">
          <span class="title">${c.title || 'ENERGIE LIVE'}</span>
          <span class="badge ${batPowerFlux >= 0 ? 'charge' : 'discharge'}">
            ${batPowerFlux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}
          </span>
        </div>

        <div class="main-stats">
          <div class="stat-box">
            ${this._renderSparkline(this._history.solar, '#00ff8866')}
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.battery, '#00f9f966')}
            <ha-icon icon="mdi:battery-high"></ha-icon>
            <span class="val">${bat}%</span>
            <span class="label">BATTERIE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.grid, '#ff4d4d66')}
            <ha-icon icon="mdi:transmission-tower"></ha-icon>
            <span class="val" style="color: ${grid > 100 ? '#ff4d4d' : '#fff'}">${grid}W</span>
            <span class="label">RÉSEAU</span>
          </div>
        </div>

        <div class="autarky-bar-container">
           <div class="autarky-fill" style="width: ${autarky}%; background: ${cardStatusColor}"></div>
           <span class="autarky-text">AUTOSUFFISANCE : ${autarky}%</span>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => html`
            <div class="device-item">
              <div class="dev-info">
                 <span class="dev-val">${Math.round(d.state)}W</span>
                 <span class="dev-name">${d.name}</span>
              </div>
            </div>
          `)}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #0d0d0d; border-radius: 16px; padding: 18px; color: #fff; border: 2px solid transparent; overflow: hidden; }
    .card-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .title { font-weight: 900; color: #555; text-transform: uppercase; font-size: 12px; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; }
    .charge { background: #00ff8822; color: #00ff88; }
    .discharge { background: #ff4d4d22; color: #ff4d4d; }

    .main-stats { display: flex; gap: 10px; margin-bottom: 20px; }
    .stat-box { background: #1a1a1a; padding: 10px; border-radius: 12px; flex: 1; text-align: center; position: relative; overflow: hidden; }
    .sparkline { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; z-index: 0; opacity: 0.5; }
    ha-icon, .val, .label { position: relative; z-index: 1; }
    .val { font-weight: 900; display: block; font-size: 16px; margin: 4px 0; }
    .label { font-size: 8px; opacity: 0.5; }

    .autarky-bar-container { height: 18px; background: #1a1a1a; border-radius: 6px; position: relative; overflow: hidden; margin-bottom: 20px; }
    .autarky-fill { height: 100%; transition: width 1s; opacity: 0.6; }
    .autarky-text { position: absolute; width: 100%; text-align: center; top: 3px; font-size: 9px; font-weight: 900; }

    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
    .device-item { background: #151515; padding: 10px; border-radius: 10px; border-left: 3px solid #00f9f9; }
    .dev-val { font-weight: 900; display: block; color: #00f9f9; }
    .dev-name { font-size: 10px; opacity: 0.7; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
