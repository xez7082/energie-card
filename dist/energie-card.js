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
        { name: "title", label: "Titre Dashboard", selector: { text: {} } },
        { name: "solar", label: "Puissance Solaire (W)", selector: { entity: { domain: "sensor" } } },
        { name: "linky", label: "Réseau Linky (W)", selector: { entity: { domain: "sensor" } } }
      ],
      [ 
        { name: "bat1_soc", label: "SOC StorCube 1 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "bat2_soc", label: "SOC StorCube 2 (%)", selector: { entity: { domain: "sensor" } } },
        { name: "bat3_soc", label: "SOC Marstek Venus (%)", selector: { entity: { domain: "sensor" } } },
        { name: "cap_st", label: "Capacité réelle StorCube (Wh)", selector: { number: { min: 0, max: 2000, mode: "box" } } },
        { name: "cap_mv", label: "Capacité réelle Marstek (Wh)", selector: { number: { min: 0, max: 10000, mode: "box" } } },
        { name: "talon", label: "Talon Électrique (W)", selector: { number: { min: 0, max: 1000, mode: "box" } } }
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
  constructor() { super(); this._history = { solar: [], battery: [], grid: [] }; }
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

  _calculateAutonomy(soc, power, capTotal) {
    if (!power || Math.abs(power) < 15) return "--h --m";
    if (power < 0) {
      const hours = ((soc / 100) * capTotal) / Math.abs(power);
      return `Vide: ${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
    } else {
      const hours = (((100 - soc) / 100) * capTotal) / power;
      return `Pleine: ${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const talon = parseFloat(c.talon) || 150;

    const s1 = parseFloat(this.hass.states[c.bat1_soc]?.state) || 0;
    const s2 = parseFloat(this.hass.states[c.bat2_soc]?.state) || 0;
    const s3 = parseFloat(this.hass.states[c.bat3_soc]?.state) || 0;

    const capST = parseFloat(c.cap_st) || 655; 
    const capMV = parseFloat(c.cap_mv) || 4510;
    const totalCap = (capST * 2) + capMV;

    const currentWh = (s1/100 * capST) + (s2/100 * capST) + (s3/100 * capMV);
    const globalSoc = Math.round((currentWh / totalCap) * 100) || 0;

    this._updateHistory('solar', solar);
    this._updateHistory('grid', grid);
    this._updateHistory('battery', globalSoc);

    const customNamesArr = c.custom_names ? c.custom_names.split(/,|\n/).map(n => n.trim()) : [];
    let totalCons = 0;
    const activeDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { state: val, stateObj: s, name: customNamesArr[index] || (s?.attributes.friendly_name || id.split('.')[1]) };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const flux = solar - totalCons;
    const sobriety = Math.min(100, Math.max(0, 100 - ((totalCons - talon) / (talon * 4) * 100)));
    const cardStatusColor = sobriety > 80 ? "#00ff88" : sobriety < 40 ? "#ff4d4d" : "#00f9f9";

    return html`
      <ha-card style="border-color: ${cardStatusColor}66">
        <div class="card-header">
          <span class="title">${solar < 10 ? '🌙 VEILLE' : (c.title || 'ENERGIE')}</span>
          <div class="header-right">
             <span class="sobriety-badge" style="color: ${cardStatusColor}">SOBRIÉTÉ: ${Math.round(sobriety)}%</span>
             <span class="badge ${flux >= 0 ? 'charge' : 'discharge'}">${flux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}</span>
          </div>
        </div>

        <div class="main-stats">
          <div class="stat-box ${solar < 10 ? 'dimmed' : ''}">
            ${this._renderSparkline(this._history.solar, '#00ff8844')}
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.battery, cardStatusColor + '44')}
            <ha-icon icon="mdi:battery-clock" style="color: ${cardStatusColor}"></ha-icon>
            <span class="val">${globalSoc}%</span>
            <span class="label-time">${this._calculateAutonomy(globalSoc, flux, totalCap)}</span>
            <div class="mini-socs">
              <span>S1:${Math.round(s1)}%</span><span>S2:${Math.round(s2)}%</span><span>MV:${Math.round(s3)}%</span>
            </div>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.grid, '#ff4d4d44')}
            <ha-icon icon="mdi:home-lightning-bolt"></ha-icon>
            <span class="val">${totalCons}W</span>
            <span class="label">CONSO TOTALE</span>
          </div>
        </div>

        <div class="sobriety-bar">
           <div class="sobriety-fill" style="width: ${sobriety}%; background: ${cardStatusColor}"></div>
           <span class="sobriety-text">${totalCons <= talon ? 'TALON ATTEINT' : `SURPLUS: +${Math.max(0, totalCons - talon)}W`}</span>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => html`
            <div class="device-item" style="border-left: 3px solid ${this._getPowerColor(d.state)}">
              <ha-icon icon="${d.stateObj?.attributes.icon || 'mdi:flash'}" style="color: ${this._getPowerColor(d.state)}"></ha-icon>
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

  _getPowerColor(w) { return w < 100 ? "#00ff88" : w < 1000 ? "#00f9f9" : "#ff9500"; }

  static styles = css`
    ha-card { background: #0a0a0a; border-radius: 20px; padding: 18px; color: #fff; border: 2px solid transparent; transition: 0.5s; overflow: hidden; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-weight: 900; color: #555; text-transform: uppercase; font-size: 11px; }
    .sobriety-badge { font-size: 9px; font-weight: 900; }
    .main-stats { display: flex; gap: 10px; margin-bottom: 20px; }
    .stat-box { background: #141414; padding: 12px 5px; border-radius: 12px; flex: 1; text-align: center; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; border: 1px solid #222; }
    .val { font-weight: 900; font-size: 17px; margin: 4px 0; z-index: 1; }
    .label { font-size: 8px; color: #888; text-transform: uppercase; z-index: 1; }
    .label-time { font-size: 9px; color: #00f9f9; font-weight: bold; z-index: 1; }
    .mini-socs { display: flex; gap: 4px; z-index: 1; margin-top: 2px; }
    .mini-socs span { font-size: 7px; color: #666; font-weight: bold; }
    .sparkline { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; opacity: 0.4; pointer-events: none; }
    .sobriety-bar { height: 14px; background: #1a1a1a; border-radius: 6px; position: relative; overflow: hidden; margin-bottom: 20px; border: 1px solid #333; }
    .sobriety-fill { height: 100%; transition: width 1.5s ease; }
    .sobriety-text { position: absolute; width: 100%; text-align: center; top: 1px; font-size: 8px; font-weight: 900; }
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 10px; }
    .device-item { background: #111; padding: 10px; border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid #222; }
    .dev-info { display: flex; flex-direction: column; min-width: 0; flex: 1; align-items: flex-start; }
    .dev-val { font-weight: 900; font-size: 14px; line-height: 1.1; }
    .dev-name { font-size: 9px; color: #777; text-transform: uppercase; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; }
    .charge { background: #00ff8815; color: #00ff88; }
    .discharge { background: #ff4d4d15; color: #ff4d4d; }
    ha-icon { --mdc-icon-size: 22px; color: #00f9f9; flex-shrink: 0; }
    .dimmed { opacity: 0.3; filter: grayscale(1); }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
