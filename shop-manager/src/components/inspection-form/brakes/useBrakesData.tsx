
import { useState } from 'react';
import { getBrakeStatus } from './BrakeStatusIndicator';

type RotorStatus = 'good' | 'warped' | 'scored' | 'replace';

export interface BrakeItem {
  name: string;
  status: 'good' | 'fair' | 'replace';
  thicknessMM: number;
  originalThicknessMM: number;
}

interface BrakesData {
  frontBrakes: BrakeItem;
  rearBrakes: BrakeItem;
  rotors: {
    frontLeft: RotorStatus;
    frontRight: RotorStatus;
    rearLeft: RotorStatus;
    rearRight: RotorStatus;
  };
  brakeFluid: {
    level: 'full' | 'low' | 'critical';
    condition: 'clear' | 'dirty' | 'contaminated';
    lastChanged: string;
  };
  notes: string;
}

export const useBrakesData = () => {
  const [frontBrakes, setFrontBrakes] = useState<BrakeItem>({
    name: "Front Brake Pads",
    status: 'good',
    thicknessMM: 8,
    originalThicknessMM: 12,
  });

  const [rearBrakes, setRearBrakes] = useState<BrakeItem>({
    name: "Rear Brake Pads",
    status: 'good',
    thicknessMM: 9,
    originalThicknessMM: 12,
  });

  const [rotors, setRotors] = useState<{
    frontLeft: RotorStatus;
    frontRight: RotorStatus;
    rearLeft: RotorStatus;
    rearRight: RotorStatus;
  }>({
    frontLeft: 'good',
    frontRight: 'good',
    rearLeft: 'good',
    rearRight: 'good',
  });

  const [brakeFluid, setBrakeFluid] = useState<{
    level: 'full' | 'low' | 'critical';
    condition: 'clear' | 'dirty' | 'contaminated';
    lastChanged: string;
  }>({
    level: 'full',
    condition: 'clear',
    lastChanged: '',
  });

  const [notes, setNotes] = useState('');

  const handleFrontBrakeChange = (values: number[]) => {
    const thicknessMM = values[0];
    const status = getBrakeStatus(thicknessMM).status;
    setFrontBrakes({ ...frontBrakes, thicknessMM, status: status as 'good' | 'fair' | 'replace' });
  };

  const handleRearBrakeChange = (values: number[]) => {
    const thicknessMM = values[0];
    const status = getBrakeStatus(thicknessMM).status;
    setRearBrakes({ ...rearBrakes, thicknessMM, status: status as 'good' | 'fair' | 'replace' });
  };

  const handleOriginalThicknessChange = (type: 'front' | 'rear', value: string) => {
    const thickness = parseInt(value) || 0;
    if (type === 'front') {
      setFrontBrakes({ ...frontBrakes, originalThicknessMM: thickness });
    } else {
      setRearBrakes({ ...rearBrakes, originalThicknessMM: thickness });
    }
  };

  const handleRotorChange = (position: keyof typeof rotors, value: RotorStatus) => {
    setRotors({...rotors, [position]: value});
  };

  const handleBrakeFluidChange = (key: keyof typeof brakeFluid, value: string) => {
    setBrakeFluid({...brakeFluid, [key]: value});
  };

  return {
    frontBrakes,
    rearBrakes,
    rotors,
    brakeFluid,
    notes,
    setNotes,
    handleFrontBrakeChange,
    handleRearBrakeChange,
    handleOriginalThicknessChange,
    handleRotorChange,
    handleBrakeFluidChange,
    data: {
      frontBrakes,
      rearBrakes,
      rotors,
      brakeFluid,
      notes
    } as BrakesData
  };
};
