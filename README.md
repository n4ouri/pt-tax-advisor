# Personal AT & Segurança Social Advisor (Portugal)

Local-first, automated tax advisor and compliance monitor for:
- **Portal das Finanças (AT)** (`financas.gov.pt` / `portaldasfinancas.gov.pt`)
- **Segurança Social Direta** (`seg-social.pt` / `app.seg-social.pt`)
- **e-Fatura** (`faturas.portaldasfinancas.gov.pt`)

---

## 🌟 Key Capabilities

1. **Automated Session-Based Reading**:
   - Manifest V3 Chrome Extension activates automatically when you visit the official portals.
   - Zero credential or 2FA automation — reads existing authenticated sessions locally on-device.
2. **Proactive Optimization & Advice**:
   - **e-Fatura Deductions Maxing**: Real-time tracking of statutory deduction caps (Saúde, Educação, Imóveis, Despesas Gerais, Benefício IVA) with alerts on unvalidated invoices.
   - **Segurança Social (-25% / +25% Variation)**: Calculates quarterly base variation options (Art. 163º CRCSPSS) for liquidity management vs. maximizing IRS deductions / social protection.
   - **Regime Simplificado (CIRS Art. 31º n.º 13)**: Calculates missing expense justification to prevent IRS tax penalties.
   - **Tax Debts & Enforcement**: Early warning on debts, payment plans, and upcoming offsets against IRS refunds.
3. **Time-Series Diff Engine & Notifications**:
   - Compares successive portal snapshots over time.
   - Alerts via desktop notifications if your status changes (e.g. *Regularizada* → *Não Regularizada*) or new debts appear.
4. **Offline CLI & Cookie Ingestion**:
   - Ingest cookie backups or JSON snapshots directly via CLI (`node cli/index.js --cookies <file>`).

---

## 📁 Project Structure

```
pt-tax-advisor/
├── extension/
│   ├── manifest.json                  # Manifest V3 extension configuration
│   ├── popup/                         # Quick status popup
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── dashboard/                     # Full-featured interactive dashboard
│   │   ├── dashboard.html
│   │   ├── dashboard.css
│   │   └── dashboard.js
│   ├── content-scripts/
│   │   ├── at-financas.js             # AT & Portal das Finanças scraper
│   │   ├── seg-social.js              # Segurança Social Direta scraper
│   │   └── efatura.js                 # e-Fatura scraper
│   ├── background/
│   │   ├── service-worker.js          # Background worker, alarms & notifications
│   │   ├── advisor-engine.js          # Rules & Portuguese tax intelligence engine
│   │   └── diff-engine.js             # Snapshot comparison & change detector
│   └── icons/
└── cli/
    ├── index.js                       # CLI runner
    ├── advisor.js                     # Node.js advisor analysis engine
    └── fetcher.js                     # Cookie parser and portal fetcher
```

---

## 🚀 How to Install and Use the Extension

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked** (Carregar expandida).
4. Select the directory: `pt-tax-advisor/extension/`.
5. Browse normally to:
   - https://www.portaldasfinancas.gov.pt
   - https://faturas.portaldasfinancas.gov.pt
   - https://app.seg-social.pt
6. The extension will automatically capture the state, update your local index, and display real-time advice in the popup and dashboard!

---

## 💻 Running the Offline CLI

To run the offline advisor or analyze exported cookie backups:

```bash
# Run demonstration analysis:
node pt-tax-advisor/cli/index.js --sample

# Ingest cookie backup:
node pt-tax-advisor/cli/index.js --cookies cookies.json

# Analyze exported snapshot:
node pt-tax-advisor/cli/index.js --snapshot snapshot.json
```
