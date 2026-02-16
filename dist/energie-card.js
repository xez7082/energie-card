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
        { name: "accent_color", label: "Couleur d'accentuation", selector: { select: { options: [
          { value: "#00f9f9", label: "Cyan" },
          { value: "#00ff88", label: "Vert" },
          { value: "#ff9500", label: "Ambre" },
          { value: "#ff4d4d", label: "Rouge" },
          { value: "#a020f0", label: "Violet" }
        ] } } },
        { name: "size_title", label: "Taille Titre", selector: { number: { min: 10, max: 30, mode: "slider" } } },
        { name: "size_sobriety", label: "Taille Sobriété", selector: { number: { min: 8, max: 20, mode: "slider" } } },
        { name: "size_badge", label: "Taille Badge", selector: { number: { min: 8, max: 20, mode: "slider" } } }
      ]
    ];

    return html`
      <div class="tabs">
        ${["Sources", "Batteries", "Style"].map((n, i) => html`
          <div class="tab ${this._tab === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${n}</div>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._tab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`
    .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    .tab { padding: 8px 12px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; font-size: 11px; border: 1px solid #444; flex: 1; text-align: center; }
    .tab.active { background: var(--accent-color, #00f9f9); color: #000; font-weight: bold; }
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

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    const accent = c.accent_color || "#00f9f9";

    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const grid = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const talon = parseFloat(c.talon) || 150;
    
    // Batteries
    const s1 = parseFloat(this.hass.states[c.bat1_soc]?.state) || 0;
    const s2 = parseFloat(this.hass.states[c.bat2_soc]?.state) || 0;
    const s3 = parseFloat(this.hass.states[c.bat3_soc]?.state) || 0;
    const capST = parseFloat(c.cap_st) || 655; 
    const capMV = parseFloat(c.cap_mv) || 4510;
    const totalCap = (capST * 2) + capMV;
    const currentWh = (s1/100 * capST) + (s2/100 * capST) + (s3/100 * capMV);
    const globalSoc = Math.round((currentWh / totalCap) * 100) || 0;

    // Consommation
    let totalCons = 0;
    const activeDevices = (c.devices || []).map((id, index) => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { state: val, stateObj: s };
    });

    const flux = solar - totalCons;
    const sobriety = Math.min(100, Math.max(0, 100 - ((totalCons - talon) / (talon * 4) * 100)));
    const statusColor = sobriety > 80 ? "#00ff88" : sobriety < 40 ? "#ff4d4d" : accent;

    this._updateHistory('solar', solar);
    this._updateHistory('grid', totalCons);
    this._updateHistory('battery', globalSoc);

    return html`
      <ha-card style="border-color: ${statusColor}66; --accent: ${accent}">
        <div class="card-header">
          <span class="title" style="font-size: ${c.size_title || 16}px">
            ${solar < 10 ? '🌙 VEILLE' : (c.title || 'ENERGIE')}
          </span>
          <div class="header-right">
             <span class="sobriety-badge" style="color: ${statusColor}; font-size: ${c.size_sobriety || 12}px">SOBRIÉTÉ: ${Math.round(sobriety)}%</span>
             <span class="badge ${flux >= 0 ? 'charge' : 'discharge'}" style="font-size: ${c.size_badge || 11}px">
               ${flux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}
             </span>
          </div>
        </div>

        <div class="main-stats">
          <div class="stat-box ${solar < 10 ? 'dimmed' : ''}">
            ${this._renderSparkline(this._history.solar, '#00ff8844')}
            <div class="flow-icon solar">▼</div>
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.battery, statusColor + '44')}
            <div class="flow-icon battery ${flux >= 0 ? 'up' : 'down'}">${flux >= 0 ? '▲' : '▼'}</div>
            <ha-icon icon="mdi:battery-clock" style="color: ${statusColor}"></ha-icon>
            <span class="val">${globalSoc}%</span>
            <div class="mini-socs">
              <span>${Math.round(s1)}%</span><span>${Math.round(s2)}%</span><span>${Math.round(s3)}%</span>
            </div>
          </div>

          <div class="stat-box">
            ${this._renderSparkline(this._history.grid, '#ff4d4d44')}
            <div class="flow-icon home">▲</div>
            <ha-icon icon="mdi:home-lightning-bolt"></ha-icon>
            <span class="val">${totalCons}W</span>
            <span class="label">CONSO</span>
          </div>
        </div>

        <div class="sobriety-bar">
            <div class="sobriety-fill" style="width: ${sobriety}%; background: ${statusColor}"></div>
            <span class="sobriety-text">${totalCons <= talon ? 'TALON MAÎTRISÉ' : `SURPLUS: +${Math.max(0, totalCons - talon)}W`}</span>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #0a0a0a; border-radius: 20px; padding: 18px; color: #fff; border: 2px solid transparent; overflow: hidden; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .header-right { display: flex; align-items: center; gap: 8px; }
    .sobriety-badge { font-weight: 900; }
    .badge { padding: 4px 8px; border-radius: 6px; font-weight: 900; }
    .charge { background: #00ff8815; color: #00ff88; border: 1px solid #00ff8844; }
    .discharge { background: #ff4d4d15; color: #ff4d4d; border: 1px solid #ff4d4d44; animation: pulse 2s infinite; }
    
    .main-stats { display: flex; gap: 10px; margin-bottom: 20px; }
    .stat-box { background: #141414; padding: 15px 5px; border-radius: 12px; flex: 1; text-align: center; position: relative; border: 1px solid #222; }
    .val { font-weight: 900; font-size: 19px; display: block; }
    .label { font-size: 8px; color: #888; text-transform: uppercase; }
    
    /* FLUX ANIMÉS */
    .flow-icon { position: absolute; font-size: 10px; font-weight: bold; opacity: 0.8; }
    .flow-icon.solar { top: 5px; right: 8px; color: #00ff88; animation: slideDown 1.5s infinite linear; }
    .flow-icon.home { top: 5px; right: 8px; color: #ff4d4d; animation: slideUp 1.5s infinite linear; }
    .flow-icon.battery { top: 5px; right: 8px; }
    .flow-icon.battery.up { color: #00ff88; animation: slideUp 1.5s infinite linear; }
    .flow-icon.battery.down { color: #ff4d4d; animation: slideDown 1.5s infinite linear; }

    .mini-socs { font-size: 7px; color: #666; margin-top: 5px; display: flex; justify-content: center; gap: 3px; }
    .sparkline { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; opacity: 0.3; }
    .sobriety-bar { height: 12px; background: #1a1a1a; border-radius: 6px; position: relative; overflow: hidden; border: 1px solid #333; }
    .sobriety-fill { height: 100%; transition: width 1s; }
    .sobriety-text { position: absolute; width: 100%; text-align: center; top: 1px; font-size: 8px; font-weight: 900; text-shadow: 1px 1px 2px #000; }

    @keyframes slideDown { 0% { transform: translateY(-5px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(5px); opacity: 0; } }
    @keyframes slideUp { 0% { transform: translateY(5px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(-5px); opacity: 0; } }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 #ff4d4d44; } 70% { box-shadow: 0 0 0 10px #ff4d4d00; } 100% { box-shadow: 0 0 0 0 #ff4d4d00; } }
    
    ha-icon { --mdc-icon-size: 24px; margin-bottom: 4px; }
    .dimmed { opacity: 0.3; filter: grayscale(1); }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
