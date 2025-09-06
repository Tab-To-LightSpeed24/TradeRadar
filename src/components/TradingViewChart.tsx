"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, ColorType } from 'lightweight-charts';
import { cn } from '@/lib/utils';

interface TradingViewChartProps {
  data: (CandlestickData<UTCTimestamp>)[];
  timeframe: string;
  symbol: string;
  className?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ data, timeframe, symbol, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions = {
      layout: {
        textColor: 'hsl(var(--foreground))',
        background: { type: ColorType.Solid, color: 'hsl(var(--background))' },
      },
      grid: {
        vertLines: { color: 'hsl(var(--border))' },
        horzLines: { color: 'hsl(var(--border))' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'hsl(var(--border))',
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: 'hsl(142.1 76.2% 36.3%)',
      downColor: 'hsl(0 84.2% 60.2%)',
      borderVisible: false,
      wickUpColor: 'hsl(142.1 76.2% 36.3%)',
      wickDownColor: 'hsl(0 84.2% 60.2%)',
    });
    candlestickSeriesRef.current = candlestickSeries;

    if (data && data.length > 0) {
      candlestickSeries.setData(data);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (candlestickSeriesRef.current && data) {
      candlestickSeriesRef.current.setData(data);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  useEffect(() => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    }
  }, [className]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full h-full", className)}
      title={`${symbol} - ${timeframe} Chart`}
    />
  );
};

export default TradingViewChart;