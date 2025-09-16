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
  ArrowRight,
  Percent
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { PnLChart } from "@/components/PnLChart";
import { Link } from "react-router-dom";
import { StatCard } from "@/components/StatCard";

interface Strategy {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'degraded';
}

interface Alert {
  id: string;
  strategy_name: string;
  symbol: string;
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
  const [totalTrades, setTotalTrades] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [strategiesRes, alertsRes, tradesRes] = await Promise.all([
        supabase.from('strategies').select('id, name, status').eq('user_id', user.id).limit(5),
        supabase.from('alerts').select('id, strategy_name, symbol, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
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
      setTotalTrades(trades.length);

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

  const toggleStrategy = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "stopped" : "running";
    try {
      const { error } = await supabase
        .from('strategies')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Strategy ${newStatus === 'running' ? 'started' : 'stopped'}.`);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update strategy status:", error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "running": return "bg-green-500";
      case "stopped": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  if (authLoading || (loading && !strategies.length)) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96 w-full mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
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
        <div>
          <h1 className="text-3xl font-bold">Welcome Back!</h1>
          <p className="text-muted-foreground">Here's a snapshot of your trading activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total P&L"
          value={`$${totalPnl.toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName={totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}
          description="All time profit and loss"
        />
        <StatCard 
          title="Win Rate"
          value={`${winRate}%`}
          icon={<Percent className="h-5 w-5" />}
          description={`${totalTrades} total trades logged`}
        />
        <StatCard 
          title="Active Strategies"
          value={`${strategies.filter(s => s.status === 'running').length} / ${strategies.length}`}
          icon={<BarChart3 className="h-5 w-5" />}
          description="Strategies currently running"
        />
        <StatCard 
          title="Recent Alerts"
          value={alerts.length}
          icon={<Bell className="h-5 w-5" />}
          description="Alerts in the last 24 hours"
        />
      </div>

      <div className="mb-8">
        <PnLChart data={pnlData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Strategies</CardTitle>
            <Link to="/strategies">
              <Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategies.length > 0 ? strategies.map((strategy) => (
                <div key={strategy.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${getStatusColor(strategy.status)}`}></span>
                    <p className="font-medium">{strategy.name}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => toggleStrategy(strategy.id, strategy.status)}
                  >
                    {strategy.status === "running" ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {strategy.status === "running" ? "Pause" : "Start"}
                  </Button>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No strategies created yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Alerts</CardTitle>
            <Link to="/alerts">
              <Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.length > 0 ? alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alert.strategy_name}</p>
                    <p className="text-sm text-muted-foreground">{alert.symbol}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true })}</p>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-8">No recent alerts.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;