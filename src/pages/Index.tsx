// Update this page (the content is just a fallback if you fail to update the page)

import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, Bell, BookOpen, Play } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center max-w-3xl px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">
            TradeRadar
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create custom trading strategies in plain English, monitor markets 24/7, 
            and get real-time alerts when setups occur.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex items-center mb-4">
                <BarChart3 className="h-8 w-8 text-primary mr-3" />
                <h3 className="text-xl font-semibold">Strategy Creator</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Build strategies using natural language or our visual form builder. 
                Preview and validate before going live.
              </p>
              <Button onClick={() => navigate("/strategies")} variant="secondary">
                Create Strategy
              </Button>
            </div>
            
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex items-center mb-4">
                <Bell className="h-8 w-8 text-primary mr-3" />
                <h3 className="text-xl font-semibold">Real-time Alerts</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Get notified instantly when your strategies trigger. 
                Receive alerts via Telegram and in-app notifications.
              </p>
              <Button onClick={() => navigate("/alerts")} variant="secondary">
                View Alerts
              </Button>
            </div>
            
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex items-center mb-4">
                <Play className="h-8 w-8 text-primary mr-3" />
                <h3 className="text-xl font-semibold">Live Monitoring</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Watch your strategies in action with live market data and 
                TradingView-style charts.
              </p>
              <Button onClick={() => navigate("/dashboard")} variant="secondary">
                Monitor Now
              </Button>
            </div>
            
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <div className="flex items-center mb-4">
                <BookOpen className="h-8 w-8 text-primary mr-3" />
                <h3 className="text-xl font-semibold">Trade Journal</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Log your trades manually or import from CSV. 
                Analyze performance with detailed metrics.
              </p>
              <Button onClick={() => navigate("/journal")} variant="secondary">
                Log Trades
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/dashboard")}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/strategies")}
            >
              Create Your First Strategy
            </Button>
          </div>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;