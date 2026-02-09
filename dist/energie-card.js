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
        { name: "solar", label: "Solaire (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky", label: "ZLinky SINSTS (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "nb_modules", label: "Modules IBC (5.12kWh)", selector: { number: { min: 1, max: 6, mode: "box" } } },
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "devices", label: "Appareils", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "custom_names", label: "Noms personnalisés (Un par ligne)", selector: { text: { multiline: true } } }
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

  _getPowerColor(watts) {
    if (watts < 100) return "#00ff88"; 
    if (watts < 1000) return "#00f9f9"; 
    if (watts < 2500) return "#ff9500"; 
    return "#ff4d4d"; 
  }

  _renderSparkline(data, color) {
    if (!data || data.length < 2) return html``;
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${30 - ((d - min) / range) * 30}`).join(' ');
    return html`<svg class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" /></svg>`;
  }

  _updateHistory(type, value) {
    if (!this._history[type]) this._history[type] = [];
    this._history[type].push(value);
    if (this._history[type].length > 40) this._history[type].shift();
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const bat = Math.round(parseFloat(this.hass.states[c.battery1]?.state) || 0);

    this._updateHistory('solar', solar);
    this._updateHistory('grid', grid);
    this._updateHistory('battery', bat);

    const customNamesArr = c.custom_names ? c.custom_names.split(/,|\n/).map(n => n.trim()) : [];
    let totalCons = 0;
    const activeDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { 
        state: val, 
        stateObj: s, 
        name: customNamesArr[index] || (s?.attributes.friendly_name || id.split('.')[1])
      };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const batPowerFlux = solar - totalCons;
    const autarky = Math.min(Math.round((solar / (solar + (grid > 0 ? grid : 0) || 1)) * 100), 100) || 0;
    let cardStatusColor = autarky > 90 ? "#00ff88" : (autarky < 20 ? "#ff4d4d" : "#00f9f9");

    return html`
      <ha-card style="border-color: ${cardStatusColor}66">
        <div class="card-header">
          <span class="title">${c.title || 'ENERGIE ULTIMATE'}</span>
          <span class="badge ${batPowerFlux >= 0 ? 'charge' : 'discharge'}">
            ${batPowerFlux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}
          </span>
        </div>

        <div class="main-stats">
          <div class="stat-box">
            ${this._renderSparkline(this._history.solar, '#00ff8844')}
            <ha-icon icon="mdi:solar-power" class="${solar > 10 ? 'flowing' : ''}"></ha-icon>
            <span class="val" style="font-size: ${c.main_font_size || 18}px">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.battery, '#00f9f944')}
            <ha-icon icon="mdi:battery-high"></ha-icon>
            <span class="val" style="font-size: ${c.main_font_size || 18}px">${bat}%</span>
            <span class="label">BATTERIE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.grid, '#ff4d4d44')}
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
                   <span class="dev-val" style="color: ${color}">${Math.round(d.state)}W</span>
                   <span class="dev-name">${d.name}</span>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #0d0d0d; border-radius: 16px; padding: 18px; color: #fff; border: 2px solid transparent; overflow: hidden; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-weight: 900; color: #555; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 900; }
    .charge { background: #00ff8822; color: #00ff88; border: 1px solid #00ff88; }
    .discharge { background: #ff4d4d22; color: #ff4d4d; border: 1px solid #ff4d4d; }

    .main-stats { display: flex; gap: 10px; margin-bottom: 25px; }
    .stat-box { background: #1a1a1a; padding: 15px 5px; border-radius: 12px; flex: 1; text-align: center; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; }
    .sparkline { position: absolute; bottom: 0; left: 0; width: 100%; height: 35px; z-index: 0; opacity: 0.6; pointer-events: none; }
    ha-icon, .val, .label { position: relative; z-index: 1; }
    .val { font-weight: 900; margin: 5px 0; }
    .label { font-size: 8px; opacity: 0.5; font-weight: bold; }

    .autarky-bar-container { height: 20px; background: #1a1a1a; border-radius: 8px; position: relative; overflow: hidden; margin-bottom: 25px; border: 1px solid #333; }
    .autarky-fill { height: 100%; transition: width 1s; opacity: 0.7; }
    .autarky-text { position: absolute; width: 100%; text-align: center; top: 3px; font-size: 10px; font-weight: 900; }

    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .device-item { background: #151515; padding: 12px 14px; border-radius: 12px; display: flex; align-items: center; gap: 10px; border-bottom: 3px solid transparent; min-width: 0; }
    .dev-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .dev-val { font-weight: 900; font-size: 13px; }
    .dev-name { opacity: 0.7; font-size: 11px; word-break: break-word; line-height: 1.1; }

    .flowing { animation: glow-green 2s infinite; }
    .flowing-red { animation: glow-red 2s infinite; }
    @keyframes glow-green { 0%, 100% { color: #fff; } 50% { color: #00ff88; filter: drop-shadow(0 0 5px #00ff88); } }
    @keyframes glow-red { 0%, 100% { color: #fff; } 50% { color: #ff4d4d; filter: drop-shadow(0 0 5px #ff4d4d); } }
    ha-icon { --mdc-icon-size: 24px; color: #00f9f9; flex-shrink: 0; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
