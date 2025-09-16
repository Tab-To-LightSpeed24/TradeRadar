"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Strategy, StrategyCondition } from "@/pages/Strategies";
import { toast } from "sonner";
import { Separator } from "./ui/separator";
import { PlusCircle, XCircle } from "lucide-react";

interface StrategyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategyData: any) => void;
  strategy: Strategy | null;
}

const initialCondition: StrategyCondition = { indicator: 'RSI', operator: '<', value: '30' };

export const StrategyEditor = ({ isOpen, onClose, onSave, strategy }: StrategyEditorProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeframe, setTimeframe] = useState("15m");
  const [symbols, setSymbols] = useState("");
  const [status, setStatus] = useState<'running' | 'stopped'>('stopped');
  const [conditions, setConditions] = useState<StrategyCondition[]>([initialCondition]);

  useEffect(() => {
    if (isOpen) {
      if (strategy) {
        setName(strategy.name);
        setDescription(strategy.description || "");
        setTimeframe(strategy.timeframe);
        setSymbols(Array.isArray(strategy.symbols) ? strategy.symbols.join(", ") : "");
        setStatus(strategy.status === 'running' ? 'running' : 'stopped');
        setConditions(strategy.conditions && strategy.conditions.length > 0 ? [...strategy.conditions] : [initialCondition]);
      } else {
        // Reset form for new strategy
        setName("");
        setDescription("");
        setTimeframe("15m");
        setSymbols("");
        setStatus('stopped');
        setConditions([initialCondition]);
      }
    }
  }, [strategy, isOpen]);

  const handleSaveClick = () => {
    if (!name) {
      toast.warning("Please fill in the strategy name.");
      return;
    }
    onSave({
      name,
      description,
      timeframe,
      symbols: symbols.split(",").map(s => s.trim()).filter(s => s),
      status,
      conditions,
    });
  };

  const handleConditionChange = (index: number, field: keyof StrategyCondition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const addCondition = () => {
    setConditions([...conditions, { indicator: 'Price', operator: '>', value: '' }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      const newConditions = conditions.filter((_, i) => i !== index);
      setConditions(newConditions);
    } else {
      toast.info("A strategy must have at least one condition.");
    }
  };

  const renderValueInput = (condition: StrategyCondition, index: number) => {
    const valueIsIndicator = ['crosses_above', 'crosses_below'].includes(condition.operator);
    
    if (valueIsIndicator) {
      return (
        <Select value={condition.value} onValueChange={(val) => handleConditionChange(index, 'value', val)}>
          <SelectTrigger><SelectValue placeholder="Select Indicator" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SMA50">SMA (50)</SelectItem>
            <SelectItem value="SMA200">SMA (200)</SelectItem>
            <SelectItem value="EMA20">EMA (20)</SelectItem>
            <SelectItem value="EMA50">EMA (50)</SelectItem>
            <SelectItem value="Upper Bollinger Band">Upper Bollinger Band</SelectItem>
            <SelectItem value="Middle Bollinger Band">Middle Bollinger Band</SelectItem>
            <SelectItem value="Lower Bollinger Band">Lower Bollinger Band</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Input 
        placeholder="Value" 
        value={condition.value}
        onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strategy ? "Edit Strategy" : "Create New Strategy"}</DialogTitle>
          <DialogDescription>
            Define your trading strategy using technical parameters. All conditions must be met to trigger an alert.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-2">
            <Label htmlFor="strategy-name">Strategy Name</Label>
            <Input 
              id="strategy-name" 
              placeholder="e.g., Bullish Breakout" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strategy-description">Description</Label>
            <Textarea 
              id="strategy-description" 
              placeholder="Describe your strategy..." 
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols</Label>
              <Input 
                id="symbols" 
                placeholder="e.g., AAPL, MSFT" 
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
              />
            </div>
          </div>
          <Separator className="my-2" />
          <div className="space-y-2">
            <Label>Conditions</Label>
            <div className="p-4 border rounded-md space-y-4">
              {conditions.map((condition, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-3 gap-2 flex-grow">
                      <Select value={condition.indicator} onValueChange={(val) => handleConditionChange(index, 'indicator', val)}>
                        <SelectTrigger><SelectValue placeholder="Indicator" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Price">Price</SelectItem>
                          <SelectItem value="RSI">RSI</SelectItem>
                          <SelectItem value="SMA50">SMA (50)</SelectItem>
                          <SelectItem value="SMA200">SMA (200)</SelectItem>
                          <SelectItem value="EMA20">EMA (20)</SelectItem>
                          <SelectItem value="EMA50">EMA (50)</SelectItem>
                          <SelectItem value="MACD">MACD</SelectItem>
                          <SelectItem value="STOCH">Stochastic (%K)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={condition.operator} onValueChange={(val) => handleConditionChange(index, 'operator', val)}>
                        <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">{'>'} (Greater than)</SelectItem>
                          <SelectItem value="<">{'<'} (Less than)</SelectItem>
                          <SelectItem value="crosses_above">Crosses Above</SelectItem>
                          <SelectItem value="crosses_below">Crosses Below</SelectItem>
                        </SelectContent>
                      </Select>
                      {renderValueInput(condition, index)}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCondition(index)}>
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  {index < conditions.length - 1 && <div className="text-center text-sm font-bold text-muted-foreground">AND</div>}
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={addCondition}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Condition
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveClick}>Save Strategy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};