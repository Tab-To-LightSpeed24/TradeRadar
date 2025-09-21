# TradeRadar 🚀
Website Link: https://trader-radar-app.vercel.app/

<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/d724cb33-d30b-4cb3-8bc2-def114ec9fcd" />
<img width="1919" height="902" alt="image" src="https://github.com/user-attachments/assets/86bdbd47-42aa-47bf-af0e-dd0c768e8c30" />

TradeRadar is an AI-powered platform that allows you to build, test, and deploy automated trading strategies without writing a single line of code. It monitors the markets 24/7, sending you real-time alerts so you never miss an opportunity.

## ✨ Key Features

*   **Visual Strategy Builder**: Design complex trading strategies using an intuitive, no-code interface with popular technical indicators.
*   **Real-Time Alerts**: Get instant notifications via in-app popups and Telegram the moment your strategy conditions are met.
*   **Automated Trade Journal**: Log every signal and trade. Analyze your performance with insightful metrics and charts.
*   **Performance Analytics**: A comprehensive dashboard provides a snapshot of your P&L, win rate, and best-performing strategies.
*   **Data Import/Export**: Easily import your existing trade history via CSV or export your TradeRadar data for external analysis.

## 📸 Screenshots

*(I've set up this section for you. Please replace the placeholders below with your own screenshots!)*

| Dashboard | Strategies Page |
| :---: | :---: |
| <img width="1919" height="899" alt="image" src="https://github.com/user-attachments/assets/7c72302c-436d-4a5a-a859-cc3e71e119cb" /> | <img width="1919" height="899" alt="image" src="https://github.com/user-attachments/assets/a717459b-70d5-44e5-8b2e-5ae1eccd4986" /> |

| Trade Journal | Strategy Editor |
| :---: | :---: |
|<img width="1919" height="905" alt="image" src="https://github.com/user-attachments/assets/79f4f220-5184-4450-a3f2-975a118dde36" /> | <img width="1919" height="902" alt="image" src="https://github.com/user-attachments/assets/46f7d6b6-f890-457c-8e5e-2267cc029633" /> |


## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS, shadcn/ui
*   **Backend & Database**: Supabase (PostgreSQL, Auth, Edge Functions)
*   **Charting**: Recharts
*   **Market Data**: Twelve Data API

## 🚀 Getting Started

This project is set up to run with Supabase.

### Prerequisites

*   Node.js and npm
*   A Supabase account

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/traderadar-app.git
    cd traderadar-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Supabase:**
    *   Create a new project on [Supabase](https://supabase.com/).
    *   In your Supabase project, go to the **SQL Editor** and run the SQL scripts provided in the `supabase/` directory to set up your database schema.
    *   Go to **Project Settings > API** and find your Project URL and `anon` public key.

4.  **Configure Environment Variables:**
    *   Create a `.env` file in the root of the project.
    *   Add your Supabase credentials and any other required API keys:
        ```
        VITE_SUPABASE_URL=YOUR_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:8080`.

## 📄 License

This project is licensed under the MIT License.
