<img width="1919" height="914" alt="image" src="https://github.com/user-attachments/assets/8494635e-56f0-478b-a956-2802482af9bb" /># 📈 TradeRadar

TradeRadar is a **secure, alert-only trading companion**. It lets traders turn written strategies into validated, running monitors, watches markets **24×7**, and sends concise alerts when setups occur. It also includes a **fast manual trade journal** with analytics to help improve decision-making over time.

🚫 No auto-trading.  
✅ Real-time data, low-noise alerts, auditable, and production-ready.  
🔒 Security-first design.

---

## 🔹 One-liner
**TradeRadar turns a trader’s written strategy into a validated monitor that watches markets all day, sends precise alerts (via Telegram), and converts manually logged trades into actionable performance insights — no auto-trading, no fluff.**

---

## 📸 Screenshots

### 1. Homepage – Dashboard
_A clean overview of your strategies, their running status, and quick actions._
<img width="1919" height="913" alt="image" src="https://github.com/user-attachments/assets/a4c602b7-14ab-4c0c-9363-eb86ea1732ab" />


---

### 2. Strategy Creator – Chatbot + GUI
_Create or edit strategies using natural language, a structured form, or DSL. See parsed preview before saving._
<img width="1919" height="914" alt="image" src="https://github.com/user-attachments/assets/a706b349-ba37-4e3f-960c-3832d07d5dd7" />



---


### 3. Homepage – Trade Journal View
_Per-strategy KPIs, win/loss ratios, expectancy curves, drawdowns, and sentiment-driven insights._
<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/31af32da-b5c2-4b5e-bd19-dc8e230c646d" />


---

## 🚀 Features (MVP)

- **Strategy Creation**
  - Type in plain English → parser converts to structured JSON
  - GUI form & DSL fallback
  - Ambiguity highlights + confirmation before save

- **Strategy Lifecycle**
  - Create, start, stop multiple strategies  
  - States: running / offline / degraded  

- **24×7 Monitoring & Alerts**
  - Live evaluation against market feeds  
  - Lightweight TradingView charts  
  - Deduplication & cooldowns prevent spam  
  - Alerts include reason, SL/TP (if defined), timestamp, R:R, and chart link  

- **Trade Journal**
  - One-click logging modal  
  - CSV import, chart snapshots  
  - Link trades to strategies  

- **Analytics & Suggestions**
  - KPIs: win%, avg R, expectancy, Sharpe, drawdown  
  - Sentiment context from Finnhub (news + social)  
  - Strategy-wise dashboards & insights  

- **Health & Trust**
  - Strategies marked degraded if data lag or worker issues occur  
  - Notifications paused until healthy  

- **Security**
  - No order execution  
  - Encrypted secrets (AES + KMS)  
  - Audit logs + export/delete endpoints  

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind, TradingView Lightweight Charts  
- **Backend**: FastAPI (Python), Pydantic  
- **Workers/Scheduler**: Celery + Redis (K8s-ready)  
- **Market Data**: Finnhub, Alpha Vantage, Binance (crypto)  
- **Parser/NLP**: Regex + DSL (future: spaCy/LLM fallback)  
- **Storage**: Postgres, Redis, S3-compatible for snapshots  
- **Notifications**: Telegram  
- **Analytics**: Manual logs + batch KPIs (future backtesting support)  
- **Infra/Deploy**: Docker, Kubernetes, Prometheus, Grafana, ELK/CloudWatch  
- **Secrets**: AWS KMS / OCI Vault / GCP KMS  

---

## 📊 Data Models (MVP)

- **Strategy** → id, user_id, name, json_spec, status, version  
- **Trade Log** → id, strategy_id, entry/exit data, pnl, notes, snapshot_url  
- **Alert** → id, strategy_id, symbol, trigger_reason, timestamp, payload_url  

---

## ⚙️ How It Works (UX Flow)

1. **Create a Strategy**  
   Type it out → parser highlights ambiguities → confirm → save.  

2. **Start Monitoring**  
   Toggle start → workers subscribe to feeds → status updates in real-time.  

3. **Alerts**  
   Triggers evaluated at candle close → deduped & throttled → Telegram notification.  

4. **Trade Logging**  
   Shortcut/modal → prefilled snapshot → save in <10s → link to strategy.  

5. **Analytics**  
   Daily jobs compute KPIs & suggestions.  
   Sentiment analysis contextualizes outcomes.  

---

## 📌 Defaults & Safeguards

- **Evaluation**: Candle close by default; intrabar only if enabled.  
- **Cooldowns**: TF-based sensible defaults (e.g., 30m cooldown for 15m–1h TF).  
- **Degraded Status**: Triggered on lag >2×TF, worker crashes, or queue backlog.  

---

## ⚖️ Disclaimer
TradeRadar is **alert-only**. It does not execute trades. All trading decisions remain the user’s responsibility. Use at your own risk.

---


