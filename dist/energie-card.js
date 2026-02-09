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
        { name: "linky", label: "Réseau SINSTS (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "battery_soc", label: "Entité Batterie Principale (%)", selector: { entity: { domain: "sensor" } } },
        { name: "cap_st", label: "Capacité StorCube totale (Wh)", selector: { number: { min: 0, max: 5000, mode: "box" } } },
        { name: "cap_mv", label: "Capacité Marstek Venus (Wh)", selector: { number: { min: 0, max: 10000, mode: "box" } } }
      ],
      [ 
        { name: "devices", label: "Appareils", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "custom_names", label: "Noms (Un par ligne)", selector: { text: { multiline: true } } }
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

  _renderSparkline(data, color) {
    if (!data || data.length < 2) return html``;
    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${30 - ((d - min) / range) * 30}`).join(' ');
    return html`<svg class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="1.5" points="${points}" /></svg>`;
  }

  _updateHistory(type, value) {
    if (!this._history[type]) this._history[type] = [];
    this._history[type].push(value);
    if (this._history[type].length > 40) this._history[type].shift();
  }

  _calculateAutonomy(soc, power, c) {
    const totalWh = (parseFloat(c.cap_st) || 2048) + (parseFloat(c.cap_mv) || 5120);
    if (!power || Math.abs(power) < 10) return "--h --m";
    if (power < 0) {
      const remainingWh = (soc / 100) * totalWh;
      const hours = remainingWh / Math.abs(power);
      return `Vide: ${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
    } else {
      const toFillWh = ((100 - soc) / 100) * totalWh;
      const hours = toFillWh / power;
      return `Pleine: ${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
    }
  }

  _calculateSurvival(soc, c) {
    const totalWh = (parseFloat(c.cap_st) || 2048) + (parseFloat(c.cap_mv) || 5120);
    const remWh = (soc / 100) * totalWh;
    const h = remWh / 200; 
    return h > 48 ? "+48h" : `${Math.floor(h)}h`;
  }

  _getPowerColor(w) { return w < 100 ? "#00ff88" : w < 1000 ? "#00f9f9" : "#ff9500"; }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const bat = Math.round(parseFloat(this.hass.states[c.battery_soc]?.state) || 0);
    const isNight = solar < 10;

    this._updateHistory('solar', solar);
    this._updateHistory('grid', grid);
    this._updateHistory('battery', bat);

    const customNamesArr = c.custom_names ? c.custom_names.split(/,|\n/).map(n => n.trim()) : [];
    let totalCons = 0;
    const activeDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { state: val, stateObj: s, name: customNamesArr[index] || (s?.attributes.friendly_name || id.split('.')[1]) };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const flux = solar - totalCons;
    const autarky = Math.min(Math.round((solar / (solar + (grid > 0 ? grid : 0) || 1)) * 100), 100) || 0;
    const isCritical = (flux < -2000) || (bat < 15);
    let cardStatusColor = isCritical ? "#ff4d4d" : (isNight ? "#7d5fff" : "#00f9f9");

    return html`
      <ha-card class="${isCritical ? 'critical-pulse' : ''}" style="border-color: ${cardStatusColor}66">
        <div class="card-header">
          <span class="title">${isNight ? '🌙 RESILIENCE' : (c.title || 'ENERGIE')}</span>
          <div class="header-right">
             ${isNight ? html`<span class="survival-tag">SURVIE : ${this._calculateSurvival(bat, c)}</span>` : ''}
             <span class="badge ${flux >= 0 ? 'charge' : 'discharge'}">
               ${flux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}
             </span>
          </div>
        </div>

        <div class="main-stats">
          <div class="stat-box ${isNight ? 'dimmed' : ''}">
            ${this._renderSparkline(this._history.solar, '#00ff8844')}
            <ha-icon icon="mdi:solar-power" class="${solar > 10 ? 'flowing' : ''}"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.battery, cardStatusColor + '44')}
            <ha-icon icon="mdi:battery-clock" style="color: ${cardStatusColor}"></ha-icon>
            <span class="val">${bat}%</span>
            <span class="label-time">${this._calculateAutonomy(bat, flux, c)}</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.grid, '#ff4d4d44')}
            <ha-icon icon="mdi:transmission-tower" class="${grid > 10 ? 'flowing-red' : ''}"></ha-icon>
            <span class="val" style="color: ${grid > 1000 ? '#ff9500' : '#fff'}">${grid}W</span>
            <span class="label">RESEAU</span>
          </div>
        </div>

        <div class="autarky-bar-container">
           <div class="autarky-fill" style="width: ${autarky}%; background: ${cardStatusColor}"></div>
           <span class="autarky-text">AUTOCONSOMMATION : ${autarky}%</span>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => html`
            <div class="device-item" style="border-left: 3px solid ${this._getPowerColor(d.state)}">
              <div class="icon-container">
                <ha-icon icon="${d.stateObj?.attributes.icon || 'mdi:flash'}" style="color: ${this._getPowerColor(d.state)}"></ha-icon>
              </div>
              <div class="dev-info">
                 <span class="dev-val" style="color: ${this._getPowerColor(d.state)}">${Math.round(d.state)}W</span>
                 <span class="dev-name">${d.name}</span>
              </div>
            </div>
          `)}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #0a0a0a; border-radius: 20px; padding: 18px; color: #fff; border: 2px solid transparent; transition: 0.5s; overflow: hidden; }
    .critical-pulse { animation: alert-shadow 1.5s infinite; border-color: #ff4d4d !important; }
    @keyframes alert-shadow { 0% { box-shadow: 0 0 0px #ff4d4d; } 50% { box-shadow: 0 0 15px #ff4d4d44; } 100% { box-shadow: 0 0 0px #ff4d4d; } }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .header-right { display: flex; gap: 8px; align-items: center; }
    .survival-tag { font-size: 9px; background: #7d5fff22; color: #7d5fff; border: 1px solid #7d5fff44; padding: 2px 6px; border-radius: 4px; font-weight: 900; }
    .title { font-weight: 900; color: #555; text-transform: uppercase; font-size: 11px; }
    .main-stats { display: flex; gap: 10px; margin-bottom: 20px; }
    .stat-box { background: #141414; padding: 12px 5px; border-radius: 12px; flex: 1; text-align: center; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; }
    .sparkline { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; opacity: 0.4; }
    .dimmed { opacity: 0.3; filter: grayscale(1); }
    .val { font-weight: 900; font-size: 17px; margin: 4px 0; z-index: 1; }
    .label { font-size: 8px; color: #888; text-transform: uppercase; z-index: 1; }
    .label-time { font-size: 9px; color: #00f9f9; font-weight: bold; z-index: 1; }
    .autarky-bar-container { height: 12px; background: #1a1a1a; border-radius: 6px; position: relative; overflow: hidden; margin-bottom: 20px; border: 1px solid #333; }
    .autarky-fill { height: 100%; transition: width 2s ease; }
    .autarky-text { position: absolute; width: 100%; text-align: center; top: 1px; font-size: 8px; font-weight: 900; }

    /* CORRECTION ICI : ALIGNEMENT GAUCHE STRICT */
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 10px; }
    .device-item { 
      background: #111; 
      padding: 12px 10px; 
      border-radius: 12px; 
      display: flex; 
      flex-direction: row; 
      align-items: center; 
      justify-content: flex-start; /* Force l'icône à gauche */
      gap: 12px;
    }
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0; /* Empêche l'icône de s'écraser */
    }
    .dev-info { 
      display: flex; 
      flex-direction: column; 
      align-items: flex-start; /* Aligne le texte à gauche aussi */
      min-width: 0; 
      flex: 1;
    }
    .dev-val { font-weight: 900; font-size: 14px; line-height: 1.1; text-align: left; }
    .dev-name { 
      font-size: 9px; 
      color: #777; 
      text-transform: uppercase; 
      font-weight: bold;
      overflow: hidden; 
      text-overflow: ellipsis; 
      white-space: nowrap; 
      margin-top: 2px;
      text-align: left;
    }

    .badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; }
    .charge { background: #00ff8815; color: #00ff88; }
    .discharge { background: #ff4d4d15; color: #ff4d4d; }
    ha-icon { --mdc-icon-size: 22px; color: #00f9f9; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "energie-card",
  name: "Energie Card Correction Gauche",
  description: "Correction finale de l'alignement des icônes.",
  preview: true
});
