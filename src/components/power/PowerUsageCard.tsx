import { Card, CardContent } from "@/components/ui/card";
import { Zap, Activity, AlertTriangle, AlertCircle } from "lucide-react";

interface PowerUsageCardProps {
  title: string;
  currentWatts: number;
  capacityWatts: number;
  usagePercent: number;
  status: 'normal' | 'warning' | 'critical';
  showIcon?: boolean;
  className?: string;
  // New power breakdown properties
  idlePowerWatts?: number;
  averagePowerWatts?: number;
  maxPowerWatts?: number;
  showPowerBreakdown?: boolean;
}

export const PowerUsageCard = ({ 
  title, 
  currentWatts, 
  capacityWatts, 
  usagePercent, 
  status,
  showIcon = true,
  className = "",
  idlePowerWatts,
  averagePowerWatts,
  maxPowerWatts,
  showPowerBreakdown = false
}: PowerUsageCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-green-600" />;
    }
  };

  const formatPower = (watts: number): string => {
    if (watts >= 1000000) return `${(watts / 1000000).toFixed(1)}MW`;
    if (watts >= 1000) return `${(watts / 1000).toFixed(0)}kW`;
    return `${watts}W`;
  };

  // Calculate percentages for power breakdown bars
  const calculatePercentage = (watts: number) => {
    return Math.min((watts / capacityWatts) * 100, 100);
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          {showIcon && <Zap className="h-5 w-5 text-purple-600" />}
          <div className="flex-1">
            <p className="text-sm text-slate-600">{title}</p>
            <p className="text-2xl font-bold">
              {formatPower(currentWatts)}
            </p>
            <p className="text-xs text-slate-500">
              {usagePercent.toFixed(1)}% of {formatPower(capacityWatts)}
            </p>
          </div>
          {getStatusIcon()}
        </div>
        
        {showPowerBreakdown && idlePowerWatts && averagePowerWatts && maxPowerWatts ? (
          // Compact power breakdown view
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {/* Power breakdown in compact format */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-blue-600 font-medium">{formatPower(idlePowerWatts)}</div>
                <div className="text-slate-500">Idle</div>
              </div>
              <div className="text-center">
                <div className="text-green-600 font-medium">{formatPower(averagePowerWatts)}</div>
                <div className="text-slate-500">Average</div>
              </div>
              <div className="text-center">
                <div className="text-red-600 font-medium">{formatPower(maxPowerWatts)}</div>
                <div className="text-slate-500">Peak</div>
              </div>
            </div>
            
            {/* Current status */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
              <span className="text-slate-600">Current:</span>
              <span className="font-semibold">{formatPower(currentWatts)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Available: {formatPower(capacityWatts - currentWatts)}</span>
              <span className={`font-medium ${status === 'normal' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                {status.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          // Original single bar view
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Usage:</span>
              <span className="font-medium">{formatPower(currentWatts)} / {formatPower(capacityWatts)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${getStatusColor()}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Available:</span>
              <span className="font-medium text-slate-700">
                {formatPower(Math.max(0, capacityWatts - currentWatts))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Compact version for rack cards - now with power breakdown option
export const PowerBar = ({ 
  current,
  max,
  label,
  size = "md",
  idleWatts,
  averageWatts,
  maxWatts,
  showBreakdown = false
}: {
  current: number;
  max: number;
  label?: string;
  size?: "sm" | "md";
  idleWatts?: number;
  averageWatts?: number;
  maxWatts?: number;
  showBreakdown?: boolean;
}) => {
  const percentage = Math.min((current / max) * 100, 100);
  
  const getStatusColor = () => {
    if (percentage >= 95) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatus = () => {
    if (percentage >= 95) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'normal';
  };

  const formatPower = (watts: number): string => {
    if (watts >= 1000) return `${(watts / 1000).toFixed(1)}kW`;
    return `${watts}W`;
  };

  const barHeight = size === "sm" ? "h-2" : "h-3";

  if (showBreakdown && idleWatts && averageWatts && maxWatts) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-slate-600 font-medium">Power Breakdown:</div>
        
        {/* Idle Power */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Idle:</span>
            <span className="font-medium">{formatPower(idleWatts)}</span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full ${size === "sm" ? "h-1" : "h-2"}`}>
            <div 
              className="h-full rounded-full bg-blue-400 transition-all duration-300"
              style={{ width: `${Math.min((idleWatts / max) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Average Power */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Average:</span>
            <span className="font-medium">{formatPower(averageWatts)}</span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full ${size === "sm" ? "h-1" : "h-2"}`}>
            <div 
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${Math.min((averageWatts / max) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Peak Power */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Peak:</span>
            <span className="font-medium">{formatPower(maxWatts)}</span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full ${size === "sm" ? "h-1" : "h-2"}`}>
            <div 
              className="h-full rounded-full bg-red-500 transition-all duration-300"
              style={{ width: `${Math.min((maxWatts / max) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Current Usage */}
        <div className="pt-1 border-t border-gray-100">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-medium">Current:</span>
            <span className="font-bold">{label || `${formatPower(current)}`}</span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full ${barHeight} mt-1`}>
            <div 
              className={`${barHeight} rounded-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{percentage.toFixed(1)}%</span>
            <span className={getStatus() === 'normal' ? 'text-green-600' : getStatus() === 'warning' ? 'text-yellow-600' : 'text-red-600'}>
              {getStatus().toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Original simple bar
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Power:</span>
        <span className="font-medium">
          {label || `${formatPower(current)} / ${formatPower(max)}`}
        </span>
      </div>
      
      <div className={`w-full bg-gray-200 rounded-full ${barHeight}`}>
        <div 
          className={`${barHeight} rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-slate-500">
        <span>{percentage.toFixed(1)}%</span>
        <span className={getStatus() === 'normal' ? 'text-green-600' : getStatus() === 'warning' ? 'text-yellow-600' : 'text-red-600'}>
          {getStatus().toUpperCase()}
        </span>
      </div>
    </div>
  );
};
