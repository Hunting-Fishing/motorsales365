import React from "react";
import { cn } from "@/lib/utils";
import { DamageArea } from "./InteractiveVehicleDamageSelector";

interface VehicleDamageMarkerProps {
  damage: DamageArea;
  isSelected: boolean;
  onClick: () => void;
}

const damageTypeStyles = {
  dent: {
    color: '#f59e0b',
    icon: '⚫',
    label: 'Dent'
  },
  scratch: {
    color: '#ef4444',
    icon: '📋',
    label: 'Scratch'
  },
  rust: {
    color: '#dc2626',
    icon: '🟤',
    label: 'Rust'
  },
  paint_damage: {
    color: '#8b5cf6',
    icon: '🎨',
    label: 'Paint'
  },
  collision: {
    color: '#dc2626',
    icon: '💥',
    label: 'Collision'
  },
  wear: {
    color: '#6b7280',
    icon: '⚪',
    label: 'Wear'
  },
  other: {
    color: '#64748b',
    icon: '❓',
    label: 'Other'
  }
};

const severityStyles = {
  minor: {
    size: 8,
    ringWidth: 2,
    opacity: 0.8
  },
  moderate: {
    size: 12,
    ringWidth: 3,
    opacity: 0.9
  },
  severe: {
    size: 16,
    ringWidth: 4,
    opacity: 1
  }
};

export const VehicleDamageMarker: React.FC<VehicleDamageMarkerProps> = ({
  damage,
  isSelected,
  onClick
}) => {
  const typeStyle = damageTypeStyles[damage.type];
  const severityStyle = severityStyles[damage.severity];

  return (
    <g onClick={onClick} className="cursor-pointer">
      {/* Selection Ring */}
      {isSelected && (
        <circle
          cx={damage.x}
          cy={damage.y}
          r={severityStyle.size + 8}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.8"
          className="animate-pulse"
        />
      )}
      
      {/* Damage Area Circle */}
      <circle
        cx={damage.x}
        cy={damage.y}
        r={severityStyle.size}
        fill={typeStyle.color}
        stroke="#ffffff"
        strokeWidth={severityStyle.ringWidth}
        opacity={severityStyle.opacity}
        className={cn(
          "transition-all duration-200",
          "hover:scale-110 hover:opacity-100",
          isSelected && "scale-110"
        )}
      />
      
      {/* Damage Type Icon */}
      <text
        x={damage.x}
        y={damage.y + 2}
        textAnchor="middle"
        fontSize={severityStyle.size - 2}
        fill="#ffffff"
        className="pointer-events-none select-none"
      >
        {typeStyle.icon}
      </text>
      
      {/* Damage Label (on hover) */}
      <g className="opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <rect
          x={damage.x + severityStyle.size + 4}
          y={damage.y - 10}
          width={damage.description.length * 6 + 8}
          height="20"
          fill="#1f2937"
          rx="4"
          opacity="0.9"
        />
        <text
          x={damage.x + severityStyle.size + 8}
          y={damage.y + 3}
          fill="#ffffff"
          fontSize="10"
          className="select-none"
        >
          {damage.description}
        </text>
      </g>
    </g>
  );
};