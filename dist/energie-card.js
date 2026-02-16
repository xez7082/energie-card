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
        { name: "devices", label: "Appareils à surveiller", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "kwh_price", label: "Prix du kWh (€)", selector: { number: { min: 0, max: 1, step: 0.0001, mode: "box" } } }
      ],
      [
        { name: "accent_color", label: "Couleur d'accentuation", selector: { select: { options: [
          { value: "#00f9f9", label: "Cyan" }, { value: "#00ff88", label: "Vert" },
          { value: "#ff9500", label: "Ambre" }, { value: "#ff4d4d", label: "Rouge" }
        ] } } },
        { name: "size_title", label: "Taille Titre", selector: { number: { min: 10, max: 40, mode: "slider" } } },
        { name: "size_val", label: "Taille Valeurs (W/%)", selector: { number: { min: 15, max: 60, mode: "slider" } } },
        { name: "size_autonomy", label: "Taille Autonomie", selector: { number: { min: 7, max: 25, mode: "slider" } } },
        { name: "size_label", label: "Taille Labels", selector: { number: { min: 7, max: 25, mode: "slider" } } },
        { name: "size_mini", label: "Taille Mini-SOCs", selector: { number: { min: 6, max: 20, mode: "slider" } } },
        { name: "size_device", label: "Taille Texte Appareils", selector: { number: { min: 8, max: 25, mode: "slider" } } }
      ]
    ];
    return html`
      <div class="tabs">
        ${["Sources", "Batteries", "Appareils", "Style"].map((n, i) => html`
          <div class="tab ${this._tab === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${n}</div>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._tab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`
    .tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; } 
    .tab { padding: 10px 4px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; flex: 1; min-width: 70px; text-align: center; font-size: 11px; border: 1px solid #444; } 
    .tab.active { background: #00f9f9; color: #000; font-weight: bold; border-color: #00f9f9; }
  `;
}

class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _history: { type: Object } }; }
  constructor() { super(); this._history = { solar: [], battery: [], grid: [] }; }
  setConfig(config) { this.config = config; }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = Math.round(parseFloat(this.hass.states[c.solar]?.state) || 0);
    const gridPower = Math.round(parseFloat(this.hass.states[c.linky]?.state) || 0);
    const s1 = parseFloat(this.hass.states[c.bat1_soc]?.state) || 0;
    const s2 = parseFloat(this.hass.states[c.bat2_soc]?.state) || 0;
    const s3 = parseFloat(this.hass.states[c.bat3_soc]?.state) || 0;
    
    const capST = parseFloat(c.cap_st) || 655;
    const capMV = parseFloat(c.cap_mv) || 4510;
    const totalCapWh = (capST * 2) + capMV;
    const currentWh = ((s1/100)*capST) + ((s2/100)*capST) + ((s3/100)*capMV);
    const globalSoc = Math.round((currentWh / totalCapWh) * 100) || 0;

    let totalCons = 0;
    const activeDevices = (c.devices || []).map(id => {
      const stateObj = this.hass.states[id];
      const val = stateObj ? parseFloat(stateObj.state) || 0 : 0;
      totalCons += val;
      
      // LOGIQUE DE NOM AMÉLIORÉE
      let name = "Inconnu";
      if (stateObj) {
        name = stateObj.attributes.friendly_name || id.split('.')[1].replace(/_/g, ' ');
      }
      
      return { state: val, name: name, icon: stateObj?.attributes.icon };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const netFlux = solar - totalCons;
    const kwhPrice = parseFloat(c.kwh_price) || 0.2288;
    const hourlyCost = (totalCons * kwhPrice) / 1000;

    let autonomyText = "";
    if (Math.abs(netFlux) > 20) {
        if (netFlux < 0 && globalSoc > 5) {
            const hours = currentWh / Math.abs(netFlux);
            autonomyText = `Vide: ~${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
        } else if (netFlux > 0 && globalSoc < 98) {
            const hours = (totalCapWh - currentWh) / netFlux;
            autonomyText = `Pleine: ~${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
        }
    }

    let statusColor = c.accent_color || "#00f9f9";
    let statusLabel = "PRODUCTION FAIBLE";
    if (gridPower > 15) { statusColor = "#ff4d4d"; statusLabel = "CONSOMMATION RÉSEAU"; } 
    else if (solar > totalCons + 10) { 
        statusColor = "#00ff88"; statusLabel = "AUTOSUFFISANT (ÉCO)";
        if (globalSoc >= 97) { statusColor = "#ff9500"; statusLabel = "⚠️ GASPILLAGE : ACTIVEZ UN APPAREIL !"; }
    } 
    else if (globalSoc > 12) { statusColor = c.accent_color || "#00f9f9"; statusLabel = "SUR BATTERIE (OPTIMAL)"; }

    return html`
      <ha-card style="border-color: ${statusColor}88; --status-color: ${statusColor}">
        <div class="card-header">
          <span class="title" style="font-size: ${c.size_title || 18}px">${solar < 10 ? '🌙 VEILLE' : (c.title || 'ENERGIE')}</span>
          <div class="header-right">
             <span class="badge ${netFlux >= 0 ? 'charge' : 'discharge'}">${netFlux >= 0 ? '▲ CHARGE' : '▼ DÉCHARGE'}</span>
          </div>
        </div>

        <div class="main-stats">
          <div class="stat-box ${solar < 10 ? 'dimmed' : ''}">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${solar}W</span>
            <span class="label" style="font-size: ${c.size_label || 10}px">SOLAIRE</span>
          </div>
          <div class="stat-box">
            <ha-icon icon="mdi:battery-high" style="color: ${statusColor}"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${globalSoc}%</span>
            <div class="autonomy" style="font-size: ${c.size_autonomy || 9}px">${autonomyText}</div>
            <div class="mini-socs" style="font-size: ${c.size_mini || 8}px">
                <span>${Math.round(s1)}%</span><span>${Math.round(s2)}%</span><span>${Math.round(s3)}%</span>
            </div>
          </div>
          <div class="stat-box">
            <ha-icon icon="mdi:home-lightning-bolt" style="color: ${gridPower > 15 ? '#ff4d4d' : '#00ff88'}"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${totalCons}W</span>
            <span class="label-cost" style="font-size: ${c.size_label || 10}px">${hourlyCost.toFixed(4)}€/h</span>
          </div>
        </div>

        <div class="status-bar" style="background: ${statusColor}33; border: 1px solid ${statusColor}55">
            <span class="status-text">${statusLabel}</span>
        </div>

        <div class="device-list">
          ${activeDevices.map(d => html`
            <div class="device-item">
              <ha-icon icon="${d.icon || 'mdi:flash'}"></ha-icon>
              <div class="dev-info">
                 <span class="dev-val" style="font-size: ${c.size_device || 13}px">${Math.round(d.state)}W</span>
                 <span class="dev-name" style="font-size: ${(c.size_device || 13) * 0.7}px">${d.name}</span>
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
    .main-stats { display: flex; gap: 8px; margin-bottom: 15px; }
    .stat-box { background: #141414; padding: 12px 4px; border-radius: 12px; flex: 1; text-align: center; border: 1px solid #222; min-height: 105px; display: flex; flex-direction: column; justify-content: center; }
    .val { font-weight: 900; line-height: 1.1; }
    .label, .label-cost { color: #888; text-transform: uppercase; font-weight: bold; margin-top: 2px; }
    .label-cost { color: #ff4d4d; }
    .autonomy { color: #aaa; font-style: italic; margin: 2px 0; font-weight: bold; }
    .status-bar { height: 26px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; }
    .status-text { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #fff; text-shadow: 1px 1px 2px #000; }
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
    .device-item { background: #111; padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 8px; border: 1px solid #222; }
    .dev-val { font-weight: 900; display: block; color: var(--status-color); line-height: 1; }
    .dev-name { color: #777; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 #ff4d4d44; } 70% { box-shadow: 0 0 0 10px #ff4d4d00; } 100% { box-shadow: 0 0 0 0 #ff4d4d00; } }
    ha-icon { --mdc-icon-size: 24px; color: #00f9f9; margin-bottom: 4px; }
    .mini-socs { color: #666; display: flex; justify-content: center; gap: 4px; font-weight: bold; }
    .dimmed { opacity: 0.3; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
