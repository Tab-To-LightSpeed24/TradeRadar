"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Copy, 
  Edit, 
  Trash2,
  Plus,
  Loader2,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { StrategyEditor } from "@/components/StrategyEditor";

// Define the type for a strategy
export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'degraded';
  timeframe: string;
  symbols: string[];
  created_at: string;
}

const strategyTemplates = [
  {
    name: "RSI Oversold Bounce",
    description: "Buy when the 14-period RSI on the 1-hour chart drops below 30 for AAPL or GOOGL.",
    timeframe: "1h",
    symbols: "AAPL, GOOGL",
  },
  {
    name: "Moving Average Crossover",
    description: "Generate a buy signal when the 50-day moving average crosses above the 200-day moving average for SPY.",
    timeframe: "1d",
    symbols: "SPY",
  },
  {
    name: "Volatility Breakout",
    description: "Enter a long position when the price of BTC/USD breaks above the upper Bollinger Band on the 4-hour chart.",
    timeframe: "4h",
    symbols: "BTC/USD",
  },
];

const Strategies = () => {
  const { user, loading: authLoading } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);

  const fetchStrategies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data as Strategy[]);
    } catch (error: any) {
      toast.error("Failed to fetch strategies:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchStrategies();
    }
  }, [authLoading, fetchStrategies]);

  const handleNewStrategy = () => {
    setEditingStrategy(null);
    setIsEditorOpen(true);
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setIsEditorOpen(true);
  };
  
  const handleUseTemplate = (template: typeof strategyTemplates[0]) => {
    setEditingStrategy({
      ...template,
      id: '', // Not a real strategy yet
      user_id: '',
      status: 'stopped',
      symbols: template.symbols.split(',').map(s => s.trim()),
      created_at: new Date().toISOString(),
    });
    setIsEditorOpen(true);
  };

  const handleSaveStrategy = async (strategyData: Omit<Strategy, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }

    try {
      if (editingStrategy && editingStrategy.id) {
        // Update existing strategy
        const { error } = await supabase
          .from('strategies')
          .update({ ...strategyData, symbols: strategyData.symbols })
          .eq('id', editingStrategy.id);
        if (error) throw error;
        toast.success("Strategy updated successfully!");
      } else {
        // Create new strategy
        const { error } = await supabase.from('strategies').insert([{ 
          ...strategyData, 
          user_id: user.id,
          symbols: strategyData.symbols,
        }]);
        if (error) throw error;
        toast.success("Strategy created successfully!");
      }
      fetchStrategies();
      setIsEditorOpen(false);
      setEditingStrategy(null);
    } catch (error: any) {
      toast.error(`Failed to save strategy: ${error.message}`);
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
      fetchStrategies();
    } catch (error: any) {
      toast.error("Failed to update strategy status:", error.message);
    }
  };

  const cloneStrategy = async (strategyToClone: Strategy) => {
    try {
      const { name, description, timeframe, symbols } = strategyToClone;
      const newStrategyData = {
        user_id: user!.id,
        name: `${name} (Copy)`,
        description,
        timeframe,
        symbols,
        status: 'stopped'
      };

      const { error } = await supabase.from('strategies').insert([newStrategyData]);
      if (error) throw error;

      toast.success("Strategy cloned successfully.");
      fetchStrategies();
    } catch (error: any) {
      toast.error("Failed to clone strategy:", error.message);
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      const { error } = await supabase.from('strategies').delete().eq('id', id);
      if (error) throw error;
      toast.success("Strategy deleted.");
      setStrategies(strategies.filter(strategy => strategy.id !== id));
    } catch (error: any) {
      toast.error("Failed to delete strategy:", error.message);
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
        <p className="text-muted-foreground">You need to be logged in to manage your trading strategies.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <StrategyEditor 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveStrategy}
        strategy={editingStrategy}
      />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Trading Strategies</h1>
        <Button onClick={handleNewStrategy} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Strategy
        </Button>
      </div>

      {/* Strategy Templates */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Start with a Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategyTemplates.map((template, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="text-sm">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <Button variant="outline" size="sm" onClick={() => handleUseTemplate(template)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Your Strategies</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : strategies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                  <Badge className={`${getStatusColor(strategy.status)} text-white`}>
                    {getStatusText(strategy.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground h-10 overflow-hidden">{strategy.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4 h-6 overflow-hidden">
                  {strategy.symbols.map((symbol, index) => (
                    <Badge key={index} variant="secondary">{symbol}</Badge>
                  ))}
                </div>
                
                <div className="text-sm mb-4">
                  <span className="font-medium">Timeframe:</span> {strategy.timeframe}
                </div>
                
                <div className="flex justify-end items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => toggleStrategy(strategy.id, strategy.status)}
                  >
                    {strategy.status === "running" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => cloneStrategy(strategy)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleEditStrategy(strategy)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    onClick={() => deleteStrategy(strategy.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">No Strategies Found</h3>
          <p className="text-muted-foreground mt-2">Create a strategy or start with a template.</p>
        </div>
      )}
    </div>
  );
};

export default Strategies;