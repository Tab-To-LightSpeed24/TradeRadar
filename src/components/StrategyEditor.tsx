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

interface StrategyEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (strategyData: any) => void;
  strategy: Strategy | null;
}

const initialCondition: StrategyCondition = { indicator: 'RSI', operator: '>', value: '' };

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
        setDescription(strategy.description);
        setTimeframe(strategy.timeframe);
        setSymbols(Array.isArray(strategy.symbols) ? strategy.symbols.join(", ") : "");
        setStatus(strategy.status === 'running' ? 'running' : 'stopped');
        setConditions(strategy.conditions && strategy.conditions.length > 0 ? strategy.conditions : [initialCondition]);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strategy ? "Edit Strategy" : "Create New Strategy"}</DialogTitle>
          <DialogDescription>
            Define your trading strategy using technical parameters.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
              {/* For now, only handling the first condition */}
              <div className="grid grid-cols-3 gap-2">
                <Select value={conditions[0].indicator} onValueChange={(val) => handleConditionChange(0, 'indicator', val)}>
                  <SelectTrigger><SelectValue placeholder="Indicator" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Price">Price</SelectItem>
                    <SelectItem value="RSI">RSI</SelectItem>
                    <SelectItem value="SMA50">SMA (50)</SelectItem>
                    <SelectItem value="SMA200">SMA (200)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={conditions[0].operator} onValueChange={(val) => handleConditionChange(0, 'operator', val)}>
                  <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">{'>'} (Greater than)</SelectItem>
                    <SelectItem value="<">{'<'} (Less than)</SelectItem>
                    <SelectItem value="crosses_above">Crosses Above</SelectItem>
                    <SelectItem value="crosses_below">Crosses Below</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="Value" 
                  value={conditions[0].value}
                  onChange={(e) => handleConditionChange(0, 'value', e.target.value)}
                />
              </div>
              {/* In a future version, a button to add more conditions would go here */}
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