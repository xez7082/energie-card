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
      [ // SOURCES
        { name: "title", label: "Titre Dashboard", selector: { text: {} } },
        { name: "solar", label: "Entité Solaire", selector: { entity: { domain: "sensor" } } },
        { name: "name_solar", label: "Nom personnalisé Solaire", selector: { text: {} } },
        { name: "linky", label: "Entité Linky", selector: { entity: { domain: "sensor" } } },
        { name: "name_grid", label: "Nom personnalisé Réseau", selector: { text: {} } }
      ],
      [ // BATTERIES
        { name: "bat1_soc", label: "SOC StorCube 1", selector: { entity: { domain: "sensor" } } },
        { name: "name_bat1", label: "Nom Batterie 1", selector: { text: {} } },
        { name: "bat2_soc", label: "SOC StorCube 2", selector: { entity: { domain: "sensor" } } },
        { name: "name_bat2", label: "Nom Batterie 2", selector: { text: {} } },
        { name: "bat3_soc", label: "SOC Marstek Venus", selector: { entity: { domain: "sensor" } } },
        { name: "name_bat3", label: "Nom Batterie 3", selector: { text: {} } },
        { name: "cap_st", label: "Capacité StorCube (Wh)", selector: { number: { min: 0, max: 2000, mode: "box" } } },
        { name: "cap_mv", label: "Capacité Marstek (Wh)", selector: { number: { min: 0, max: 10000, mode: "box" } } }
      ],
      [ // APPAREILS
        { name: "devices", label: "Appareils à surveiller", selector: { entity: { multiple: true, domain: "sensor" } } },
        { name: "device_names", label: "Renommer Appareils (ex: id:Nom, id:Nom)", selector: { text: {} } },
        { name: "kwh_price", label: "Prix du kWh (€)", selector: { number: { min: 0, max: 1, step: 0.0001, mode: "box" } } }
      ],
      [ // STYLE
        { name: "accent_color", label: "Couleur d'accentuation", selector: { select: { options: [
          { value: "#00f9f9", label: "Cyan" }, { value: "#00ff88", label: "Vert" },
          { value: "#ff9500", label: "Ambre" }, { value: "#ff4d4d", label: "Rouge" }
        ] } } },
        { name: "size_title", label: "Taille Titre", selector: { number: { min: 10, max: 40, mode: "slider" } } },
        { name: "size_val", label: "Taille Valeurs (W/%)", selector: { number: { min: 15, max: 60, mode: "slider" } } },
        { name: "size_label", label: "Taille Labels", selector: { number: { min: 7, max: 25, mode: "slider" } } },
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
  static styles = css`.tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; } .tab { padding: 10px 4px; background: #2c2c2c; color: #aaa; border-radius: 8px; cursor: pointer; flex: 1; min-width: 70px; text-align: center; font-size: 11px; border: 1px solid #444; } .tab.active { background: #00f9f9; color: #000; font-weight: bold; border-color: #00f9f9; }`;
}

class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {} }; }
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

    // Parsing du renommage des appareils
    const customNames = {};
    if (c.device_names) {
      c.device_names.split(',').forEach(item => {
        const [id, name] = item.split(':');
        if (id && name) customNames[id.trim()] = name.trim();
      });
    }

    let totalCons = 0;
    const activeDevices = (c.devices || []).map(id => {
      const s = this.hass.states[id];
      const val = s ? parseFloat(s.state) || 0 : 0;
      totalCons += val;
      const displayName = customNames[id] || s?.attributes.friendly_name || id.split('.')[1];
      return { state: val, name: displayName, icon: s?.attributes.icon };
    }).filter(d => d.state > 5).sort((a, b) => b.state - a.state);

    const price = parseFloat(c.kwh_price) || 0.2288;
    const hourlyCost = (totalCons * price) / 1000;
    const hourlyGain = (solar * price) / 1000;

    let statusColor = c.accent_color || "#00f9f9";
    if (gridPower > 15) statusColor = "#ff4d4d";
    else if (solar > totalCons + 10) statusColor = "#00ff88";

    return html`
      <ha-card style="border-color: ${statusColor}88; --status-color: ${statusColor}">
        <div class="card-header">
          <span class="title" style="font-size: ${c.size_title || 18}px">${c.title || 'ENERGIE'}</span>
        </div>

        <div class="main-stats">
          <div class="stat-box">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${solar}W</span>
            <span class="label" style="font-size: ${c.size_label || 10}px">+${hourlyGain.toFixed(3)}€/h</span>
          </div>
          
          <div class="stat-box">
            <ha-icon icon="mdi:battery-high" style="color: ${statusColor}"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${globalSoc}%</span>
            <div class="mini-socs">
                <span>${c.name_bat1 || 'S1'}: ${Math.round(s1)}%</span>
                <span>${c.name_bat2 || 'S2'}: ${Math.round(s2)}%</span>
                <span>${c.name_bat3 || 'MV'}: ${Math.round(s3)}%</span>
            </div>
          </div>
          
          <div class="stat-box">
            <ha-icon icon="mdi:home-lightning-bolt"></ha-icon>
            <span class="val" style="font-size: ${c.size_val || 24}px">${totalCons}W</span>
            <span class="label-cost" style="font-size: ${c.size_label || 10}px">-${hourlyCost.toFixed(3)}€/h</span>
          </div>
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
    ha-card { background: #0a0a0a; border-radius: 20px; padding: 18px; color: #fff; border: 2px solid transparent; }
    .card-header { margin-bottom: 20px; text-align: center; }
    .title { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .main-stats { display: flex; gap: 8px; margin-bottom: 15px; }
    .stat-box { background: #141414; padding: 12px 4px; border-radius: 12px; flex: 1; text-align: center; border: 1px solid #222; min-height: 105px; display: flex; flex-direction: column; justify-content: center; }
    .val { font-weight: 900; line-height: 1.1; }
    .label { color: #00ff88; font-weight: bold; }
    .label-cost { color: #ff4d4d; font-weight: bold; }
    .mini-socs { color: #666; font-size: 9px; display: flex; flex-direction: column; margin-top: 5px; font-weight: bold; }
    .device-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
    .device-item { background: #111; padding: 8px; border-radius: 10px; display: flex; align-items: center; gap: 8px; border: 1px solid #222; }
    .dev-val { font-weight: 900; color: var(--status-color); }
    .dev-name { color: #777; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold; }
    ha-icon { --mdc-icon-size: 24px; color: #00f9f9; margin-bottom: 4px; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
