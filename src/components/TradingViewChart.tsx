"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

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
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Resolve CSS variables to actual colors
    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = `hsl(${computedStyle.getPropertyValue('--foreground').trim()})`;
    const backgroundColor = `hsl(${computedStyle.getPropertyValue('--background').trim()})`;
    const borderColor = `hsl(${computedStyle.getPropertyValue('--border').trim()})`;

    // Cleanup previous chart instance if it exists
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chartOptions = {
      layout: {
        textColor,
        background: { type: ColorType.Solid, color: backgroundColor },
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderColor,
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

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
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
  }, [theme]); // Re-create the chart when the theme changes

  useEffect(() => {
    if (candlestickSeriesRef.current && data) {
      candlestickSeriesRef.current.setData(data);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full h-full", className)}
      title={`${symbol} - ${timeframe} Chart`}
    />
  );
};

export default TradingViewChart;