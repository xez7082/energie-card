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
        { name: "talon", label: "Talon Électrique (W)", selector: { number: { min: 0, max: 1000, mode: "box" } } }
      ],
      [
        { name: "devices", label: "Appareils à surveiller", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "kwh_price", label: "Prix du kWh (€)", selector: { number: { min: 0, max: 1, step: 0.0001, mode: "box" } } },
        { name: "size_val", label: "Taille Valeurs (W/%)", selector: { number: { min: 15, max: 50, mode: "slider" } } },
        { name: "size_title", label: "Taille Titre", selector: { number: { min: 10, max: 40, mode: "slider" } } }
      ]
    ];
    return html`
      <div class="tabs">
        ${["Sources", "Batteries", "Style/Appareils"].map((n, i) => html`
          <div class="tab ${this._tab === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${n}</div>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._tab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.tabs { display: flex; gap: 8px; margin-bottom: 20px; } .tab { padding: 8px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; flex: 1; text-align: center; } .tab.active { background: #00f9f9; color: #000; font-weight: bold; }`;
}

class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _history: { type: Object } }; }
  constructor() { super(); this._history = { solar: [], battery: [], grid: [] }; }
  setConfig(config) { this.config = config; }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    // CAPTEURS
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const gridPower = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const s1 = parseFloat(this.hass.states[c.bat1_soc]?.state) || 0;
    const s2 = parseFloat(this.hass.states[c.bat2_soc]?.state) || 0;
    const s3 = parseFloat(this.hass.states[c.bat3_soc]?.state) || 0;
    
    const globalSoc = Math.round((s1 + s2 + s3) / 3);
    const kwhPrice = parseFloat(c.kwh_price) || 0.2288;

    let totalCons = 0;
    const activeDevices = (c.devices || []).map(id => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      return { state: val, name: s?.attributes.friendly_name || id, icon: s?.attributes.icon };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const flux = solar - totalCons;
    const hourlyCost = (totalCons * kwhPrice) / 1000;

    // LOGIQUE DE DÉTECTION DE SOURCE (LINKY vs BATTERIE)
    let statusLabel = "PRODUCTION FAIBLE";
    let statusColor = "#00f9f9";
    let isWasting = false;

    // Si on tire sur le Linky (gridPower > 10W), on est forcément sur le réseau
    if (gridPower > 15) {
        statusLabel = "CONSOMMATION RÉSEAU";
        statusColor = "#ff4d4d"; // Rouge
    } 
    // Sinon, si on produit plus qu'on ne consomme
    else if (solar > totalCons + 10) {
        statusLabel = "AUTOSUFFISANT (ÉCO)";
        statusColor = "#00ff88"; // Vert
        if (globalSoc >= 97) {
            statusLabel = "⚠️ GASPILLAGE : ACTIVEZ UN APPAREIL !";
            statusColor = "#ff9500"; // Orange
            isWasting = true;
        }
    } 
    // Sinon, si les batteries sont encore capables de fournir
    else if (globalSoc > 12) {
        statusLabel = "SUR BATTERIE (OPTIMAL)";
        statusColor = "#00f9f9"; // Cyan
    } 
    // Par défaut (nuit, batteries vides)
    else {
        statusLabel = "BATTERIES VIDES / RÉSEAU";
        statusColor = "#ff4d4d";
    }

    return html`
      <ha-card style="border-color: ${statusColor}88; --status-color: ${statusColor}">
        <div class="card-header">
          <span class="title" style="font-size: ${c.size_title || 18}px">${solar < 10 ? '🌙 VEILLE' : (c.title || 'ENERGIE')}</span>
          <div class="header-right">
             <span class="badge ${flux >= 0 ? 'charge' : 'discharge'}">${flux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}</span>
          </div>
        </div>

        <div class="main-stats">
          <div class="stat-box ${solar < 10 ? 'dimmed' : ''}">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${solar}W</span>
            <span class="label">SOLAIRE</span>
          </div>
          <div class="stat-box">
            <ha-icon icon="mdi:battery-high" style="color: ${statusColor}"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${globalSoc}%</span>
            <div class="mini-socs"><span>${Math.round(s1)}%</span><span>${Math.round(s2)}%</span><span>${Math.round(s3)}%</span></div>
          </div>
          <div class="stat-box">
            <ha-icon icon="mdi:home-lightning-bolt" style="color: ${gridPower > 15 ? '#ff4d4d' : '#00ff88'}"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${totalCons}W</span>
            <span class="label-cost">${hourlyCost.toFixed(4)}€/h</span>
          </div>
        </div>

        <div class="status-bar ${isWasting ? 'wasting' : ''}" style="background: ${statusColor}33">
            <div class="status-fill" style="width: 100%; background: ${statusColor}"></div>
            <span class="status-text">${statusLabel}</span>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => html`
            <div class="device-item">
              <ha-icon icon="${d.icon || 'mdi:flash'}"></ha-icon>
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
    ha-card { background: #0a0a0a; border-radius: 20px; padding: 18px; color: #fff; border: 2px solid transparent; transition: 0.5s; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 10px; }
    .charge { background: #00ff8822; color: #00ff88; }
    .discharge { background: #ff4d4d22; color: #ff4d4d; animation: pulse 2s infinite; }
    .main-stats { display: flex; gap: 10px; margin-bottom: 15px; }
    .stat-box { background: #141414; padding: 15px 5px; border-radius: 12px; flex: 1; text-align: center; border: 1px solid #222; }
    .val { font-weight: 900; display: block; }
    .label { font-size: 10px; color: #888; }
    .label-cost { font-size: 10px; color: #ff4d4d; font-weight: bold; }
    .status-bar { height: 24px; border-radius: 8px; position: relative; overflow: hidden; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; border: 1px solid #333; }
    .status-fill { height: 100%; position: absolute; left: 0; opacity: 0.2; }
    .status-text { position: relative; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #fff; text-shadow: 1px 1px 2px #000; }
    .wasting { animation: blink 1s infinite; border: 1px solid #ff9500; }
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
    .device-item { background: #111; padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 10px; border: 1px solid #222; }
    .dev-val { font-weight: 900; font-size: 13px; display: block; color: var(--status-color); }
    .dev-name { font-size: 8px; color: #777; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 #ff4d4d44; } 70% { box-shadow: 0 0 0 10px #ff4d4d00; } 100% { box-shadow: 0 0 0 0 #ff4d4d00; } }
    @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    ha-icon { --mdc-icon-size: 24px; color: #00f9f9; }
    .dimmed { opacity: 0.3; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
