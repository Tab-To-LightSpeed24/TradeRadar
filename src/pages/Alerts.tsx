"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell,
  BellOff,
  Check,
  Filter,
  Download,
  Eye,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from 'date-fns';
import Papa from "papaparse";

// Define the type for an alert
interface Alert {
  id: string;
  user_id: string;
  strategy_name: string;
  symbol: string;
  price: number | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
  data_timestamp: string | null;
}

const Alerts = () => {
  const { user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data as Alert[]);
    } catch (error: any) {
      toast.error("Failed to fetch alerts:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchAlerts();
    }
  }, [authLoading, fetchAlerts]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);
      
      if (error) throw error;
      setAlerts(alerts.map(alert => 
        alert.id === id ? { ...alert, is_read: true } : alert
      ));
      toast.success("Alert marked as read.");
    } catch (error: any) {
      toast.error("Failed to update alert:", error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadAlertIds = alerts.filter(a => !a.is_read).map(a => a.id);
      if (unreadAlertIds.length === 0) {
        toast.info("All alerts are already read.");
        return;
      }
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .in('id', unreadAlertIds);

      if (error) throw error;
      setAlerts(alerts.map(alert => ({ ...alert, is_read: true })));
      toast.success("All alerts marked as read.");
    } catch (error: any)
{
      toast.error("Failed to mark all alerts as read:", error.message);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === "all" || 
      (filter === "unread" && !alert.is_read) || 
      (filter === "read" && alert.is_read);
    
    const matchesSearch = searchTerm === "" || 
      alert.strategy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.type && alert.type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    if (filteredAlerts.length === 0) {
      toast.info("No alerts to export.");
      return;
    }

    const dataToExport = filteredAlerts.map(alert => ({
      'Strategy Name': alert.strategy_name,
      Symbol: alert.symbol,
      Price: alert.price,
      Type: alert.type,
      'Is Read': alert.is_read,
      'Alert Time': alert.created_at ? new Date(alert.created_at).toLocaleString() : '',
      'Data Timestamp': alert.data_timestamp ? new Date(alert.data_timestamp).toLocaleString() : '',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `traderadar_alerts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Alerts exported successfully!");
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-muted-foreground">You need to be logged in to view your alerts.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Alert Center</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search alerts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread Alerts</p>
                <p className="text-2xl font-bold">{alerts.filter(a => !a.is_read).length}</p>
              </div>
              <BellOff className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))
            ) : filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 flex items-center justify-between ${!alert.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                  <div className="flex items-center gap-4">
                    {!alert.is_read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    )}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {alert.strategy_name}
                        <Badge variant="secondary">{alert.symbol}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })} • ${alert.price}
                        {alert.data_timestamp && (
                          <span className="italic"> (Data: {format(new Date(alert.data_timestamp), 'MMM d, h:mm:ss a')})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={alert.type?.includes("Buy") ? "default" : "destructive"}>
                      {alert.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => markAsRead(alert.id)}
                        disabled={alert.is_read}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No alerts found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Alerts;