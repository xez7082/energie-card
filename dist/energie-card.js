import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- EDITEUR DE LA CARTE ---
class EnergieCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _tab: { type: Number } }; }
  constructor() { super(); this._tab = 0; }
  setConfig(config) { this._config = config; }
  _selectTab(idx) { this._tab = idx; this.requestUpdate(); }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: ev.detail.value },
      bubbles: true, composed: true,
    }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = [
      [ // Tab Général
        { name: "title", label: "Titre de la carte", selector: { text: {} } },
        { name: "solar", label: "Capteur Solaire (W)", selector: { entity: {} } },
        { name: "linky", label: "Capteur Linky (W)", selector: { entity: {} } },
      ],
      [ // Tab Batteries
        { name: "battery1", label: "Batterie 1 (%)", selector: { entity: {} } },
        { name: "battery2", label: "Batterie 2 (%)", selector: { entity: {} } },
        { name: "battery3", label: "Batterie 3 (%)", selector: { entity: {} } },
      ],
      [ // Tab Appareils (Les 60)
        { name: "devices", label: "Liste des appareils (Entities)", selector: { entity: { multiple: true } } }
      ]
    ];
    const tabs = ["Général", "Batteries", "Appareils"];
    return html`
      <div class="tabs">${tabs.map((n, i) => html`<div class="tab ${this._tab === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${n}</div>`)}</div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._tab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.tabs{display:flex;gap:4px;margin-bottom:10px}.tab{padding:8px;background:#444;color:#fff;border-radius:4px;cursor:pointer;font-size:12px}.tab.active{background:#00f9f9;color:#000;font-weight:bold}`;
}

// --- CORPS DE LA CARTE ---
class EnergieCard extends LitElement {
  static getConfigElement() { return document.createElement("energie-card-editor"); }
  static get properties() { return { hass: {}, config: {} }; }
  
  setConfig(config) { 
    this.config = config; 
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;
    
    const solar = parseFloat(this.hass.states[c.solar]?.state) || 0;
    const grid = parseFloat(this.hass.states[c.linky]?.state) || 0;
    const b1 = parseFloat(this.hass.states[c.battery1]?.state) || 0;
    const b2 = parseFloat(this.hass.states[c.battery2]?.state) || 0;
    const b3 = parseFloat(this.hass.states[c.battery3]?.state) || 0;
    const avg_bat = Math.round((b1 + b2 + b3) / 3) || 0;

    const autarky = Math.min(Math.round((solar / (solar + Math.max(grid, 0))) * 100), 100) || 0;

    // Filtrage des 60 appareils
    const activeDevices = (c.devices || []).filter(id => {
      const s = this.hass.states[id];
      return s && parseFloat(s.state) > 2;
    });

    return html`
      <ha-card>
        <div class="header">
          <span>${c.title || 'FLUX ÉNERGÉTIQUE'}</span>
          <span class="autarky-text">${autarky}% AUTONOME</span>
        </div>
        
        <div class="bar-container">
          <div class="bar-fill" style="width: ${autarky}%"></div>
        </div>

        <div class="main-grid">
          <div class="box solar">
            <ha-icon icon="mdi:solar-power"></ha-icon>
            <div class="val">${solar}W</div>
            <div class="lbl">SOLAIRE</div>
          </div>
          <div class="box battery">
            <ha-icon icon="mdi:battery-high"></ha-icon>
            <div class="val">${avg_bat}%</div>
            <div class="lbl">BATT. AVG</div>
          </div>
          <div class="box linky">
            <ha-icon icon="mdi:transmission-tower"></ha-icon>
            <div class="val">${grid}W</div>
            <div class="lbl">RÉSEAU</div>
          </div>
        </div>

        <div class="bat-sub">
          <span>B1: ${b1}%</span><span>B2: ${b2}%</span><span>B3: ${b3}%</span>
        </div>

        <div class="device-grid">
          ${activeDevices.map(id => {
            const s = this.hass.states[id];
            return html`
              <div class="dev-card">
                <ha-icon icon="${s.attributes.icon || 'mdi:flash'}"></ha-icon>
                <div class="dev-val">${Math.round(s.state)}W</div>
                <div class="dev-name">${s.attributes.friendly_name || id}</div>
                <div class="flow"></div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 20px;
      color: #fff;
    }
    .header { display: flex; justify-content: space-between; font-weight: 900; font-size: 14px; letter-spacing: 1px; }
    .autarky-text { color: #00f9f9; }
    .bar-container { height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 15px 0; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #00f9f9, #00ff88); box-shadow: 0 0 10px #00f9f9; transition: width 1s ease; }
    .main-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .box { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .solar { border-bottom: 3px solid #ffce70; }
    .battery { border-bottom: 3px solid #00f9f9; }
    .linky { border-bottom: 3px solid #ff4d4d; }
    .val { font-size: 16px; font-weight: bold; margin-top: 5px; }
    .lbl { font-size: 9px; opacity: 0.6; }
    .bat-sub { display: flex; justify-content: space-around; font-size: 10px; margin-top: 8px; opacity: 0.8; }
    .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 10px; margin-top: 20px; }
    .dev-card { background: rgba(255,255,255,0.08); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden; }
    .dev-val { font-size: 12px; font-weight: bold; margin-top: 4px; }
    .dev-name { font-size: 8px; opacity: 0.5; white-space: nowrap; overflow: hidden; }
    .flow { height: 2px; background: repeating-linear-gradient(90deg, transparent, transparent 4px, #00f9f9 4px, #00f9f9 8px); animation: flow 1.5s linear infinite; margin-top: 6px; }
    @keyframes flow { from { background-position: 0 0; } to { background-position: 24px 0; } }
    ha-icon { --mdc-icon-size: 20px; color: #00f9f9; }
  `;
}

customElements.define("energie-card-editor", EnergieCardEditor);
customElements.define("energie-card", EnergieCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "energie-card", name: "ENERGIE MASTER ULTIMATE", preview: true });
