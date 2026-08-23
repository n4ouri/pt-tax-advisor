# TaxVerde (AutonomoPT) 🇵🇹
> **Local-First Portuguese Tax, VAT & Segurança Social Copilot for Freelancers, Autónomos (Recibos Verdes), and Micro-Enterprises (ENI / Unipessoal LDA)**

[![Node.js Tests](https://img.shields.io/badge/tests-17%20passing-brightgreen.svg)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-orange.svg)](extension/)
[![Tax Authority](https://img.shields.io/badge/Portugal-AT%20%7C%20Seguran%C3%A7a%20Social%20%7C%20e--Fatura-red.svg)](https://portaldasfinancas.gov.pt)

**TaxVerde** is an intelligent, privacy-preserving tax copilot and compliance engine built specifically for independent workers (*Trabalhadores Independentes / Recibos Verdes*), tech contractors, digital nomads, and single-member company owners in Portugal.

It bridges the gap between **Portal das Finanças (AT)**, **Segurança Social Direta**, and **e-Fatura** — turning opaque Portuguese tax laws into actionable, real-time optimizations, cashflow forecasts, and automated legal documents.

---

## 🚀 Why TaxVerde for Autónomos?

Portuguese tax and social security compliance for independent contractors is notoriously complex. **TaxVerde** automates the heavy lifting:

### 1. 🔍 15% Expense Justification Watchdog (`CIRS Art. 31º, n.º 13`)
* Under the *Regime Simplificado*, 75% of your service revenue is taxable. However, 15% of your gross income **must be justified** with activity-related expenses or Social Security contributions.
* TaxVerde calculates your exact expense deficit and tells you how much to validate on **e-Fatura** before year-end to prevent automatic tax penalties.

### 2. 📈 Social Security Quarterly $\pm 25\%$ Variation Strategy (`CRCSPSS Art. 163º`)
* Autónomos submit a *Declaração Trimestral* every 3 months.
* TaxVerde calculates both options:
  * **$-25\%$**: Reduce monthly social security payments to free up immediate liquidity during low-revenue quarters.
  * **$+25\%$**: Maximize contributions 6 months prior to parental/sick leave (benefits cover up to 100% of reference salary) or to maximize IRS Category B deductions.

### 3. 🎯 Start-of-Activity Tax Breaks (`CIRS Art. 31º, n.º 10`)
* Automatically applies and tracks the **50% taxable base reduction in Year 1** (coefficient drops to 0.375) and **25% reduction in Year 2** (coefficient 0.5625) to prevent overpaying IRS on Anexo B.

### 4. 🌍 Cross-Border Invoicing & VIES / VAT Reverse Charge (`CIVA Art. 6º`)
* **EU B2B**: Invoices with 0% VAT using the mandatory legal mention (*"Autoliquidação - Artigo 6.º, n.º 6, alínea a) do CIVA"* / *Directiva 2006/112/CE*) and triggers alerts for the **Declaração Recapitulativa VIES** (avoiding fines of €50 to €3,750).
* **Non-EU (US/UK/Canada/Switzerland)**: Guides non-EU VAT exemptions and periodic declaration mapping (Quadro 06, Campo 8).

### 5. 🛡️ IRS Settlement & Withholding Buffer (`PPC - CIRS Art. 102º`)
* Invoicing foreign clients means 0% withholding tax (*Retenção na Fonte*). In May of the following year, autónomos face huge lump-sum tax bills, followed by mandatory advance tax installments (*Pagamentos por Conta* in July, September, and December).
* TaxVerde forecasts exact quarterly reserves (25%–30%) and calculates when you can legally suspend or reduce the 3rd PPC installment under Art. 102º n.º 7.

### 6. 🏠 Home Office & Expense Deductibility (`CIRS Art. 31º, n.º 13 d)`)
* Automatically calculates the statutory **25% deduction** for rent/mortgage interest, electricity, gas, water, and internet when working from home.

### 7. ⚖️ Transition Simulator: Recibos Verdes vs. Sociedade Unipessoal
* Pinpoints the exact revenue tipping point (usually > €45k–€50k/year) where incorporating as a *Sociedade Unipessoal por Quotas* (17% PME IRC rate + tax-free meal allowances up to €9.60/day + EV deductions) saves thousands compared to progressive IRS brackets.

### 8. 📄 Official Document & Legal Dossier Generator
* Built-in generator creates official, legally binding documents:
  * **Mapa de Km / Ajudas de Custo** (DL n.º 106/98).
  * **Ata de Assembleia Geral de Remuneração e Cartão Refeição** (Art. 252.º CSC).
  * **Declaração de Meios de Subsistência para AIMA** (Art. 89.º da Lei n.º 23/2007).
  * **Ofício de Extinção de Execuções Fiscais da SS** (Art. 196.º CPPT).

---

## 📁 Repository Architecture

```
pt-tax-advisor/
├── extension/                         # Chrome Extension (Manifest V3)
│   ├── manifest.json                  # Extension configuration
│   ├── popup/                         # Quick status popup
│   ├── dashboard/                     # Interactive dashboard & advisor visualizer
│   ├── content-scripts/               # Non-invasive DOM & session extractors
│   │   ├── at-financas.js             # Portal das Finanças
│   │   ├── seg-social.js              # Segurança Social Direta
│   │   └── efatura.js                 # e-Fatura invoice & deduction parser
│   └── background/
│       ├── service-worker.js          # Background alarms & change notifications
│       └── advisor-engine.js          # Core rules & Portuguese tax intelligence
├── cli/                               # Node.js CLI & Offline Analyzer
│   ├── index.js                       # CLI entry point
│   ├── advisor.js                     # General tax health advisor
│   ├── autonomo-advisor.js            # Specialized CIRS/CIVA/CRCSPSS engine
│   └── fetcher.js                     # Authenticated session fetcher & cookie parser
├── document_generator.mjs             # Legal document & corporate minutes generator
├── generate_snapshot.mjs              # Unified Segurança Social snapshot builder
├── pt-autonomo-api/                   # Optional REST API & SQLite persistence backend
└── tests/                             # Comprehensive automated unit & engine tests
```

---

## 🔒 Privacy & Local-First Architecture

* **Zero Credential Storage**: TaxVerde never asks for your NIF password, Segurança Social password, or Chave Móvel Digital.
* **On-Device Execution**: Runs completely inside your browser or local Node.js environment.
* **Session-Based Extraction**: Simply log into the official government portals in your browser; the extension reads active DOM sessions locally.

---

## 🛠️ Installation & Getting Started

### 1. Load the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** (*Carregar expandida*).
4. Select the `extension/` folder inside this repository.
5. Browse normally to:
   * [Portal das Finanças](https://www.portaldasfinancas.gov.pt)
   * [e-Fatura](https://faturas.portaldasfinancas.gov.pt)
   * [Segurança Social Direta](https://app.seg-social.pt)
6. Click the **TaxVerde** extension icon or open the dashboard to see your real-time tax health and optimization advice!

---

### 2. Run the Offline CLI & Advisor Engine

```bash
# Clone the repository
git clone https://github.com/n4ouri/pt-tax-advisor.git
cd pt-tax-advisor

# Run the advisor on sample autónomo data
node cli/index.js --sample

# Ingest an exported session cookie backup
node cli/index.js --cookies cookies.json

# Analyze an exported government snapshot
node cli/index.js --snapshot snapshot.json
```

---

### 3. Generate Legal & Corporate Documents

```bash
# Generate Mapa de Km, Corporate Minutes, and AIMA declarations:
npm run docs
# Documents are saved ready-to-print in downloads/generated_docs/
```

---

### 4. Running Automated Tests

```bash
npm test
```

---

## ⚖️ Legal & Regulatory References

* **CIRS**: Código do Imposto sobre o Rendimento das Pessoas Singulares (Art. 31º, 78º, 101º, 102º)
* **CRCSPSS**: Código dos Regimes Contributivos do Sistema Previdencial de Segurança Social (Art. 139º–168º)
* **CIVA**: Código do Imposto sobre o Valor Acrescentado (Art. 6º, 29º, 53º, VIES / EU Reverse Charge)
* **CPPT**: Código de Procedimento e de Processo Tributário (Art. 196º, 200º)
* **CSC**: Código das Sociedades Comerciais (Art. 252º, 254º)

---

## 📄 License

MIT License — feel free to use, modify, and distribute for personal or commercial tax planning.
