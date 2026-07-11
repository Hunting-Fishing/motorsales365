import React from "react";

import { VehicleBodyStyle } from "@/types/vehicleBodyStyles";

interface VehicleDiagramProps {
  view: 'side' | 'top' | 'front' | 'rear';
  vehicleType: VehicleBodyStyle;
  className?: string;
}

export const ProfessionalVehicleDiagram: React.FC<VehicleDiagramProps> = ({
  view,
  vehicleType = 'suv',
  className
}) => {
  // Map vehicle body styles to our supported types
  const mappedVehicleType = ['sedan', 'suv', 'truck', 'coupe', 'hatchback'].includes(vehicleType) 
    ? vehicleType as 'sedan' | 'suv' | 'truck' | 'coupe' | 'hatchback'
    : 'suv';
  const getSideViewSVG = () => (
    <svg viewBox="0 0 1200 600" className={className}>
      {/* Professional SUV Side View */}
      <defs>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="windowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Grid overlay for precision */}
      <defs>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Vehicle Body - Main Structure */}
      <g id="vehicle-body" filter="url(#shadow)">
        {/* Lower Body */}
        <path
          id="lower-body"
          d="M150,450 L1050,450 C1070,450 1080,440 1080,430 L1080,380 L1100,380 L1100,350 L1080,350 L1080,300 L1050,300 L1050,280 L150,280 L150,300 L120,300 L120,350 L100,350 L100,380 L120,380 L120,430 C120,440 130,450 150,450 Z"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* Upper Body/Cabin */}
        <path
          id="upper-body"
          d="M200,280 L1000,280 L980,200 L950,150 L850,120 L350,120 L250,150 L220,200 L200,280 Z"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* Hood */}
        <path
          id="hood"
          d="M850,280 L1050,280 L1080,300 L1080,350 L1100,350 L1100,380 L1080,380 L1080,430 C1080,440 1070,450 1050,450 L1050,400 L1020,350 L950,320 L850,300 Z"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Front Door */}
        <rect
          id="front-door"
          x="550" y="280" width="200" height="170"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Rear Door */}
        <rect
          id="rear-door"
          x="350" y="280" width="200" height="170"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Trunk/Tailgate */}
        <path
          id="tailgate"
          d="M150,280 L350,280 L350,450 L150,450 C130,450 120,440 120,430 L120,300 L150,280 Z"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />
      </g>

      {/* Windows */}
      <g id="windows">
        {/* Windshield */}
        <path
          id="windshield"
          d="M850,150 L950,120 L980,200 L850,220 Z"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Front Window */}
        <rect
          id="front-window"
          x="570" y="200" width="160" height="80"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Rear Window */}
        <rect
          id="rear-window"
          x="370" y="200" width="160" height="80"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Rear Windshield */}
        <path
          id="rear-windshield"
          d="M350,150 L250,120 L220,200 L350,220 Z"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />
      </g>

      {/* Wheels and Tires */}
      <g id="wheels">
        {/* Front Wheel */}
        <circle
          id="front-wheel"
          cx="850" cy="450" r="60"
          fill="#374151"
          stroke="#1e293b"
          strokeWidth="3"
        />
        <circle cx="850" cy="450" r="40" fill="#6b7280" />
        <circle cx="850" cy="450" r="25" fill="#9ca3af" />

        {/* Rear Wheel */}
        <circle
          id="rear-wheel"
          cx="350" cy="450" r="60"
          fill="#374151"
          stroke="#1e293b"
          strokeWidth="3"
        />
        <circle cx="350" cy="450" r="40" fill="#6b7280" />
        <circle cx="350" cy="450" r="25" fill="#9ca3af" />
      </g>

      {/* Lights */}
      <g id="lights">
        {/* Headlights */}
        <ellipse
          id="headlight-main"
          cx="1080" cy="350" rx="20" ry="30"
          fill="#fef3c7"
          stroke="#1e293b"
          strokeWidth="2"
        />
        <ellipse
          id="headlight-fog"
          cx="1060" cy="400" rx="15" ry="20"
          fill="#fef3c7"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Taillights */}
        <ellipse
          id="taillight-main"
          cx="120" cy="350" rx="15" ry="25"
          fill="#fee2e2"
          stroke="#1e293b"
          strokeWidth="2"
        />
        <ellipse
          id="taillight-brake"
          cx="120" cy="400" rx="12" ry="20"
          fill="#fecaca"
          stroke="#1e293b"
          strokeWidth="2"
        />
      </g>

      {/* Body Panel Labels (hidden by default, shown on hover) */}
      <g id="panel-labels" opacity="0" className="transition-opacity duration-200 hover:opacity-100">
        <text x="950" y="365" textAnchor="middle" fontSize="12" fill="#1e293b">Hood</text>
        <text x="650" y="365" textAnchor="middle" fontSize="12" fill="#1e293b">Front Door</text>
        <text x="450" y="365" textAnchor="middle" fontSize="12" fill="#1e293b">Rear Door</text>
        <text x="250" y="365" textAnchor="middle" fontSize="12" fill="#1e293b">Tailgate</text>
        <text x="600" y="240" textAnchor="middle" fontSize="12" fill="#1e293b">Roof</text>
        <text x="850" y="500" textAnchor="middle" fontSize="12" fill="#1e293b">Front Wheel</text>
        <text x="350" y="500" textAnchor="middle" fontSize="12" fill="#1e293b">Rear Wheel</text>
      </g>

      {/* Measurement References */}
      <g id="measurements" opacity="0.5">
        <line x1="100" y1="520" x2="1100" y2="520" stroke="#6b7280" strokeWidth="1" strokeDasharray="5,5"/>
        <text x="600" y="540" textAnchor="middle" fontSize="10" fill="#6b7280">Length Reference</text>
      </g>
    </svg>
  );

  const getTopViewSVG = () => (
    <svg viewBox="0 0 800 1200" className={className}>
      <defs>
        <pattern id="topGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#topGrid)" />

      {/* Vehicle Top View */}
      <g id="top-view-body">
        {/* Main Body */}
        <rect
          id="main-body-top"
          x="250" y="150" width="300" height="900"
          rx="20" ry="20"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* Hood */}
        <rect
          id="hood-top"
          x="270" y="150" width="260" height="300"
          rx="10" ry="10"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Windshield */}
        <rect
          id="windshield-top"
          x="290" y="470" width="220" height="80"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Roof */}
        <rect
          id="roof-top"
          x="280" y="570" width="240" height="300"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Trunk */}
        <rect
          id="trunk-top"
          x="270" y="890" width="260" height="160"
          rx="10" ry="10"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Side Mirrors */}
        <ellipse cx="540" cy="520" rx="15" ry="10" fill="#374151" stroke="#1e293b" strokeWidth="1"/>
        <ellipse cx="260" cy="520" rx="15" ry="10" fill="#374151" stroke="#1e293b" strokeWidth="1"/>

        {/* Wheels */}
        <rect x="200" y="300" width="50" height="120" rx="25" fill="#374151" stroke="#1e293b" strokeWidth="2"/>
        <rect x="550" y="300" width="50" height="120" rx="25" fill="#374151" stroke="#1e293b" strokeWidth="2"/>
        <rect x="200" y="780" width="50" height="120" rx="25" fill="#374151" stroke="#1e293b" strokeWidth="2"/>
        <rect x="550" y="780" width="50" height="120" rx="25" fill="#374151" stroke="#1e293b" strokeWidth="2"/>
      </g>
    </svg>
  );

  const getFrontViewSVG = () => (
    <svg viewBox="0 0 1000 600" className={className}>
      <defs>
        <pattern id="frontGrid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#frontGrid)" />

      {/* Front View */}
      <g id="front-view-body">
        {/* Main Body */}
        <path
          d="M200,500 L800,500 C820,500 830,480 830,460 L830,200 C830,180 820,160 800,160 L650,160 L650,120 L580,80 L420,80 L350,120 L350,160 L200,160 C180,160 170,180 170,200 L170,460 C170,480 180,500 200,500 Z"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* Windshield */}
        <path
          d="M350,160 L650,160 L580,80 L420,80 Z"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Hood */}
        <rect
          x="300" y="400" width="400" height="100"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Grille */}
        <rect
          x="380" y="420" width="240" height="60"
          fill="#374151"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Headlights */}
        <ellipse cx="320" cy="440" rx="30" ry="20" fill="#fef3c7" stroke="#1e293b" strokeWidth="2"/>
        <ellipse cx="680" cy="440" rx="30" ry="20" fill="#fef3c7" stroke="#1e293b" strokeWidth="2"/>

        {/* Wheels */}
        <circle cx="280" cy="500" r="60" fill="#374151" stroke="#1e293b" strokeWidth="3"/>
        <circle cx="280" cy="500" r="40" fill="#6b7280"/>
        <circle cx="720" cy="500" r="60" fill="#374151" stroke="#1e293b" strokeWidth="3"/>
        <circle cx="720" cy="500" r="40" fill="#6b7280"/>
      </g>
    </svg>
  );

  const getRearViewSVG = () => (
    <svg viewBox="0 0 1000 600" className={className}>
      <defs>
        <pattern id="rearGrid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#rearGrid)" />

      {/* Rear View */}
      <g id="rear-view-body">
        {/* Main Body */}
        <path
          d="M200,500 L800,500 C820,500 830,480 830,460 L830,200 C830,180 820,160 800,160 L650,160 L650,120 L580,80 L420,80 L350,120 L350,160 L200,160 C180,160 170,180 170,200 L170,460 C170,480 180,500 200,500 Z"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="3"
        />

        {/* Rear Windshield */}
        <path
          d="M350,160 L650,160 L580,80 L420,80 Z"
          fill="url(#windowGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Tailgate */}
        <rect
          x="300" y="400" width="400" height="100"
          fill="url(#bodyGradient)"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Taillights */}
        <ellipse cx="320" cy="440" rx="25" ry="30" fill="#fee2e2" stroke="#1e293b" strokeWidth="2"/>
        <ellipse cx="680" cy="440" rx="25" ry="30" fill="#fee2e2" stroke="#1e293b" strokeWidth="2"/>

        {/* License Plate Area */}
        <rect
          x="450" y="450" width="100" height="30"
          fill="#f3f4f6"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Wheels */}
        <circle cx="280" cy="500" r="60" fill="#374151" stroke="#1e293b" strokeWidth="3"/>
        <circle cx="280" cy="500" r="40" fill="#6b7280"/>
        <circle cx="720" cy="500" r="60" fill="#374151" stroke="#1e293b" strokeWidth="3"/>
        <circle cx="720" cy="500" r="40" fill="#6b7280"/>
      </g>
    </svg>
  );

  const renderDiagram = () => {
    switch (view) {
      case 'side':
        return getSideViewSVG();
      case 'top':
        return getTopViewSVG();
      case 'front':
        return getFrontViewSVG();
      case 'rear':
        return getRearViewSVG();
      default:
        return getSideViewSVG();
    }
  };

  return renderDiagram();
};