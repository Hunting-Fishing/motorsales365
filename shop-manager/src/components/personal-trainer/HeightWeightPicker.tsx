import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INCH_TO_CM = 2.54;
const LB_TO_KG = 0.453592;

const STORAGE_KEY_HEIGHT = 'pt-height-unit';
const STORAGE_KEY_WEIGHT = 'pt-weight-unit';

type HeightUnit = 'cm' | 'ft';
type WeightUnit = 'kg' | 'lbs';

function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = Math.round(cm / INCH_TO_CM);
  return { ft: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * INCH_TO_CM);
}

function kgToLbs(kg: number): number {
  return Math.round(kg / LB_TO_KG);
}

function lbsToKg(lbs: number): number {
  return parseFloat((lbs * LB_TO_KG).toFixed(1));
}

// Generate height options
function getHeightOptionsCm() {
  const opts: { value: string; label: string }[] = [];
  for (let cm = 90; cm <= 245; cm++) {
    opts.push({ value: String(cm), label: `${cm} cm` });
  }
  return opts;
}

function getHeightOptionsFt() {
  const opts: { value: string; label: string }[] = [];
  for (let ft = 3; ft <= 8; ft++) {
    const maxIn = ft === 8 ? 0 : 11;
    for (let inches = 0; inches <= maxIn; inches++) {
      const cm = ftInToCm(ft, inches);
      opts.push({ value: String(cm), label: `${ft}'${inches}"` });
    }
  }
  return opts;
}

function getWeightOptionsKg() {
  const opts: { value: string; label: string }[] = [];
  for (let kg = 14; kg <= 318; kg++) {
    opts.push({ value: String(kg), label: `${kg} kg` });
  }
  return opts;
}

function getWeightOptionsLbs() {
  const opts: { value: string; label: string }[] = [];
  for (let lbs = 30; lbs <= 700; lbs++) {
    const kg = lbsToKg(lbs);
    opts.push({ value: String(kg), label: `${lbs} lbs` });
  }
  return opts;
}

interface HeightPickerProps {
  value: string | number | null;
  onChange: (cmValue: string) => void;
}

export function HeightPicker({ value, onChange }: HeightPickerProps) {
  const [unit, setUnit] = useState<HeightUnit>(() =>
    (localStorage.getItem(STORAGE_KEY_HEIGHT) as HeightUnit) || 'cm'
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HEIGHT, unit);
  }, [unit]);

  const options = useMemo(() => unit === 'cm' ? getHeightOptionsCm() : getHeightOptionsFt(), [unit]);

  const currentValue = value ? String(Math.round(Number(value))) : '';

  // Find closest option for ft/in mode
  const selectValue = useMemo(() => {
    if (!currentValue) return '';
    const numVal = Number(currentValue);
    if (unit === 'cm') return currentValue;
    // Find the closest ft/in option
    let closest = options[0]?.value || '';
    let minDiff = Infinity;
    for (const opt of options) {
      const diff = Math.abs(Number(opt.value) - numVal);
      if (diff < minDiff) { minDiff = diff; closest = opt.value; }
    }
    return closest;
  }, [currentValue, unit, options]);

  const displayLabel = useMemo(() => {
    if (!currentValue) return '';
    const cm = Number(currentValue);
    if (unit === 'ft') {
      const { ft, inches } = cmToFtIn(cm);
      return `${ft}'${inches}"`;
    }
    return `${cm} cm`;
  }, [currentValue, unit]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>Height</Label>
        <div className="flex rounded-md overflow-hidden border border-border">
          <button
            type="button"
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${unit === 'cm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            onClick={() => setUnit('cm')}
          >cm</button>
          <button
            type="button"
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${unit === 'ft' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            onClick={() => setUnit('ft')}
          >ft</button>
        </div>
      </div>
      <Select value={selectValue} onValueChange={v => onChange(v)}>
        <SelectTrigger>
          <SelectValue placeholder={unit === 'cm' ? 'Select height' : "Select height"}>
            {displayLabel || (unit === 'cm' ? 'Select height' : 'Select height')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface WeightPickerProps {
  value: string | number | null;
  onChange: (kgValue: string) => void;
}

export function WeightPicker({ value, onChange }: WeightPickerProps) {
  const [unit, setUnit] = useState<WeightUnit>(() =>
    (localStorage.getItem(STORAGE_KEY_WEIGHT) as WeightUnit) || 'kg'
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WEIGHT, unit);
  }, [unit]);

  const options = useMemo(() => unit === 'kg' ? getWeightOptionsKg() : getWeightOptionsLbs(), [unit]);

  const currentValue = value ? String(Number(value)) : '';

  const selectValue = useMemo(() => {
    if (!currentValue) return '';
    const numVal = Number(currentValue);
    let closest = options[0]?.value || '';
    let minDiff = Infinity;
    for (const opt of options) {
      const diff = Math.abs(Number(opt.value) - numVal);
      if (diff < minDiff) { minDiff = diff; closest = opt.value; }
    }
    return closest;
  }, [currentValue, unit, options]);

  const displayLabel = useMemo(() => {
    if (!currentValue) return '';
    const kg = Number(currentValue);
    if (unit === 'lbs') {
      return `${kgToLbs(kg)} lbs`;
    }
    return `${Math.round(kg)} kg`;
  }, [currentValue, unit]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>Weight</Label>
        <div className="flex rounded-md overflow-hidden border border-border">
          <button
            type="button"
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${unit === 'kg' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            onClick={() => setUnit('kg')}
          >kg</button>
          <button
            type="button"
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${unit === 'lbs' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            onClick={() => setUnit('lbs')}
          >lbs</button>
        </div>
      </div>
      <Select value={selectValue} onValueChange={v => onChange(v)}>
        <SelectTrigger>
          <SelectValue placeholder="Select weight">
            {displayLabel || 'Select weight'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
