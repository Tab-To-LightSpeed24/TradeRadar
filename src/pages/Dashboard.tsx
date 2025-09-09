"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  TrendingUp, 
  BarChart3,
  Bell,
  Settings,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from 'date-fns';
import { PnLChart } from "@/components/PnLChart";

interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'degraded';
}

interface Alert {
  id: string;
  strategy_name: string;
  symbol: string;
  price: number | null;
  type: string | null;
  created_at: string;
}

interface PnLDataPoint {
  date: string;
  pnl: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPnl, setTotalPnl] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([]);
  const [isInvoking, setIsInvoking] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [strategiesRes, alertsRes, tradesRes] = await Promise.all([
        supabase.from('strategies').select('id, name, description, status').eq('user_id', user.id),
        supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('trades').select('pnl, created_at').eq('user_id', user.id).order('created_at', { ascending: true })
      ]);

      if (strategiesRes.error) throw strategiesRes.error;
      if (alertsRes.error) throw alertsRes.error;
      if (tradesRes.error) throw tradesRes.error;

      setStrategies(strategiesRes.data as Strategy[]);
      setAlerts(alertsRes.data as Alert[]);
      
      const trades = tradesRes.data || [];
      const total = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      const winners = trades.filter(t => (t.pnl || 0) > 0).length;
      setTotalPnl(total);
      setWinRate(trades.length > 0 ? Math.round((winners / trades.length) * 100) : 0);

      // Process data for P&L chart
      let cumulativePnl = 0;
      const chartData = trades.map(trade => {
        cumulativePnl += trade.pnl || 0;
        return {
          date: format(parseISO(trade.created_at), 'MMM d'),
          pnl: cumulativePnl,
        };
      });
      setPnlData(chartData);

    } catch (error: any) {
      toast.error("Failed to fetch dashboard data:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const handleInvokeFunction = async () => {
    setIsInvoking(true);
    toast.info("Invoking strategy engine... Please wait.");
    try {
      const { data, error } = await supabase.functions.invoke('strategy-engine', {
        body: { name: 'DyadInvoke' }
      });

      if (error) throw error;

      console.log('Function returned:', data);
      toast.success("Strategy engine invoked successfully! Please check your Supabase logs.");
    } catch (error: any) {
      console.error("Error invoking function:", error);
      toast.error(`Failed to invoke function: ${error.message}`);
    } finally {
      setIsInvoking(false);
    }
  };

  const toggleStrategy = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "stopped" : "running";
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Strategy ${newStatus === 'running' ? 'started' : 'stopped'}.`);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast.error("Failed to update strategy status:", error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "running": return "bg-green-500";
      case "stopped": return "bg-red-500";
      case "degraded": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case "running": return "Running";
      case "stopped": return "Stopped";
      case "degraded": return "Degraded";
      default: return "Unknown";
    }
  };

  if (authLoading || (loading && !strategies.length)) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full mb-8" />
        <Skeleton className="h-8 w-56 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to TradeRadar</h2>
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={handleInvokeFunction} 
            disabled={isInvoking}
            variant="destructive"
          >
            {isInvoking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Invoke Engine
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Strategies</p>
                <p className="text-2xl font-bold">{strategies.filter(s => s.status === 'running').length}/{strategies.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{winRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">P&L (All Time)</p>
                <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      <div className="mb-8">
        <PnLChart data={pnlData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strategy Cards */}
        <div className="mb-8 lg:mb-0">
          <h2 className="text-2xl font-bold mb-4">Trading Strategies</h2>
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <Badge className={`${getStatusColor(strategy.status)} text-white`}>
                      {getStatusText(strategy.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{strategy.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end items-center">
                    <Button 
                      size="sm" 
                      onClick={() => toggleStrategy(strategy.id, strategy.status)}
                      className={strategy.status === "running" ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                      {strategy.status === "running" ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" /> Start
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Alerts</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {alerts.length > 0 ? alerts.map((alert) => (
                  <div key={alert.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{alert.strategy_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {alert.symbol} • {format(parseISO(alert.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${alert.price}</div>
                        <div className="text-sm text-muted-foreground">{alert.type}</div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Chart
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-muted-foreground">No recent alerts.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;