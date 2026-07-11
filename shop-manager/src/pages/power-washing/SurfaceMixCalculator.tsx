import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowLeft, 
  Beaker, 
  Copy,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Home,
  Building2,
  TreePine,
  Waves
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Surface presets with recommended mix ratios
const SURFACE_PRESETS = [
  {
    id: 'vinyl_siding',
    name: 'Vinyl Siding',
    icon: Home,
    category: 'Residential',
    shConcentration: 0.5,
    surfactantOzPerGal: 1,
    dwellTimeMinutes: 5,
    rinseRequired: true,
    notes: 'Light to medium algae/mold. Apply bottom-up, rinse top-down.',
    soilLevels: { light: 0.3, medium: 0.5, heavy: 0.8 },
  },
  {
    id: 'vinyl_heavy',
    name: 'Vinyl (Heavy Mold)',
    icon: Home,
    category: 'Residential',
    shConcentration: 1.0,
    surfactantOzPerGal: 1.5,
    dwellTimeMinutes: 8,
    rinseRequired: true,
    notes: 'Heavily soiled vinyl. May need 2nd application. Watch for plant damage.',
    soilLevels: { light: 0.5, medium: 1.0, heavy: 1.5 },
  },
  {
    id: 'brick',
    name: 'Brick/Masonry',
    icon: Building2,
    category: 'Residential',
    shConcentration: 1.5,
    surfactantOzPerGal: 1,
    dwellTimeMinutes: 10,
    rinseRequired: true,
    notes: 'Pre-wet surface. Avoid mortar joints if weak. Test in hidden area.',
    soilLevels: { light: 1.0, medium: 1.5, heavy: 2.0 },
  },
  {
    id: 'concrete_driveway',
    name: 'Concrete Driveway',
    icon: Building2,
    category: 'Flatwork',
    shConcentration: 2.0,
    surfactantOzPerGal: 2,
    dwellTimeMinutes: 10,
    rinseRequired: true,
    notes: 'Pre-treat oil stains separately. Use surface cleaner for best results.',
    soilLevels: { light: 1.0, medium: 2.0, heavy: 3.0 },
  },
  {
    id: 'concrete_heavy',
    name: 'Concrete (Black Mold)',
    icon: Building2,
    category: 'Flatwork',
    shConcentration: 3.0,
    surfactantOzPerGal: 2,
    dwellTimeMinutes: 15,
    rinseRequired: true,
    notes: 'May need multiple applications. Keep wet, reapply if drying.',
    soilLevels: { light: 2.0, medium: 3.0, heavy: 4.0 },
  },
  {
    id: 'wood_deck',
    name: 'Wood Deck',
    icon: TreePine,
    category: 'Wood',
    shConcentration: 0.5,
    surfactantOzPerGal: 1,
    dwellTimeMinutes: 5,
    rinseRequired: true,
    notes: 'Low pressure only (< 1500 PSI). Neutralize after cleaning. May need brightener.',
    soilLevels: { light: 0.3, medium: 0.5, heavy: 0.75 },
  },
  {
    id: 'wood_fence',
    name: 'Wood Fence',
    icon: TreePine,
    category: 'Wood',
    shConcentration: 0.75,
    surfactantOzPerGal: 1,
    dwellTimeMinutes: 7,
    rinseRequired: true,
    notes: 'Work in sections. Keep wet to prevent streaking.',
    soilLevels: { light: 0.5, medium: 0.75, heavy: 1.0 },
  },
  {
    id: 'roof_asphalt',
    name: 'Asphalt Shingles',
    icon: Home,
    category: 'Roof',
    shConcentration: 3.0,
    surfactantOzPerGal: 2,
    dwellTimeMinutes: 15,
    rinseRequired: false,
    notes: 'NO PRESSURE. Apply with 12V pump, let rain rinse. Protect plants heavily.',
    soilLevels: { light: 2.0, medium: 3.0, heavy: 4.0 },
  },
  {
    id: 'roof_tile',
    name: 'Tile Roof',
    icon: Home,
    category: 'Roof',
    shConcentration: 2.5,
    surfactantOzPerGal: 2,
    dwellTimeMinutes: 20,
    rinseRequired: false,
    notes: 'Walk carefully. Multiple applications may be needed. No pressure.',
    soilLevels: { light: 1.5, medium: 2.5, heavy: 3.5 },
  },
  {
    id: 'stucco',
    name: 'Stucco',
    icon: Building2,
    category: 'Residential',
    shConcentration: 1.0,
    surfactantOzPerGal: 1.5,
    dwellTimeMinutes: 8,
    rinseRequired: true,
    notes: 'Low pressure rinse. Avoid chipped/damaged areas. Test first.',
    soilLevels: { light: 0.5, medium: 1.0, heavy: 1.5 },
  },
  {
    id: 'pool_deck',
    name: 'Pool Deck',
    icon: Waves,
    category: 'Flatwork',
    shConcentration: 2.0,
    surfactantOzPerGal: 1.5,
    dwellTimeMinutes: 10,
    rinseRequired: true,
    notes: 'Protect pool water. Rinse thoroughly. Great upsell with pool service.',
    soilLevels: { light: 1.0, medium: 2.0, heavy: 3.0 },
  },
];

const SOIL_LEVELS = [
  { value: 'light', label: 'Light', description: 'Minor dust/light algae' },
  { value: 'medium', label: 'Medium', description: 'Visible green/black growth' },
  { value: 'heavy', label: 'Heavy', description: 'Thick buildup, years of neglect' },
];

const SURFACTANT_OPTIONS = [
  { name: 'Elemonator', ozPerGal: 1, description: 'Lemon scent, great cling' },
  { name: 'Simple Cherry', ozPerGal: 1, description: 'Cherry scent, budget-friendly' },
  { name: 'Gain/Dawn', ozPerGal: 2, description: 'Household option, less cling' },
  { name: 'No Surfactant', ozPerGal: 0, description: 'Pure SH mix' },
];

export default function SurfaceMixCalculator() {
  const navigate = useNavigate();
  
  const [selectedPreset, setSelectedPreset] = useState<string>('vinyl_siding');
  const [soilLevel, setSoilLevel] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [tankSize, setTankSize] = useState(5);
  const [shSourceStrength, setShSourceStrength] = useState(12.5);
  const [selectedSurfactant, setSelectedSurfactant] = useState('Elemonator');

  const preset = SURFACE_PRESETS.find(p => p.id === selectedPreset) || SURFACE_PRESETS[0];
  const surfactant = SURFACTANT_OPTIONS.find(s => s.name === selectedSurfactant) || SURFACTANT_OPTIONS[0];

  const calculations = useMemo(() => {
    const targetSH = preset.soilLevels[soilLevel];
    
    // V1 = (C2 * V2) / C1
    const shNeededGallons = (targetSH * tankSize) / shSourceStrength;
    const waterNeededGallons = tankSize - shNeededGallons;
    const surfactantOz = surfactant.ozPerGal * tankSize;
    
    return {
      targetConcentration: targetSH,
      shGallons: shNeededGallons,
      shOunces: shNeededGallons * 128,
      waterGallons: waterNeededGallons,
      waterOunces: waterNeededGallons * 128,
      surfactantOz,
      dilutionRatio: shSourceStrength / targetSH,
    };
  }, [selectedPreset, soilLevel, tankSize, shSourceStrength, selectedSurfactant, preset, surfactant]);

  const copyRecipe = () => {
    const text = `Surface Mix Recipe - ${preset.name}
Soil Level: ${soilLevel.charAt(0).toUpperCase() + soilLevel.slice(1)}
Tank Size: ${tankSize} gallons
Target SH: ${calculations.targetConcentration}%

RECIPE:
• SH (${shSourceStrength}%): ${calculations.shGallons.toFixed(2)} gal (${calculations.shOunces.toFixed(0)} oz)
• Water: ${calculations.waterGallons.toFixed(2)} gal
• ${selectedSurfactant}: ${calculations.surfactantOz.toFixed(1)} oz

Dwell Time: ${preset.dwellTimeMinutes} minutes
${preset.rinseRequired ? 'Rinse: Required' : 'Rinse: Let rain clean (roof)'}

Notes: ${preset.notes}`;
    
    navigator.clipboard.writeText(text);
    toast.success('Recipe copied to clipboard');
  };

  const groupedPresets = SURFACE_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.category]) acc[preset.category] = [];
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, typeof SURFACE_PRESETS>);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing/formulas')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Formulas
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Beaker className="h-6 w-6 text-primary" />
              Surface Mix Calculator
            </h1>
            <p className="text-muted-foreground">Pre-built recipes for different surfaces</p>
          </div>
          <Button variant="outline" onClick={() => {
            setSelectedPreset('vinyl_siding');
            setSoilLevel('medium');
            setTankSize(5);
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Surface Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Surface Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(groupedPresets).map(([category, presets]) => (
                  <div key={category}>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {presets.map(p => {
                        const Icon = p.icon;
                        const isSelected = selectedPreset === p.id;
                        return (
                          <Button
                            key={p.id}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`h-auto py-3 justify-start ${isSelected ? '' : 'hover:border-primary/50'}`}
                            onClick={() => setSelectedPreset(p.id)}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            <span className="text-sm">{p.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Soil Level & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adjust for Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Soil Level */}
              <div className="space-y-3">
                <Label>Soil Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SOIL_LEVELS.map(level => (
                    <Button
                      key={level.value}
                      variant={soilLevel === level.value ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col"
                      onClick={() => setSoilLevel(level.value as typeof soilLevel)}
                    >
                      <span className="font-medium">{level.label}</span>
                      <span className="text-xs opacity-80">{level.description}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tank Size */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Tank Size</Label>
                  <span className="font-bold text-primary">{tankSize} gallons</span>
                </div>
                <Slider
                  value={[tankSize]}
                  onValueChange={([v]) => setTankSize(v)}
                  min={1}
                  max={30}
                  step={1}
                />
                <div className="flex gap-2 mt-2">
                  {[5, 10, 15, 20, 25].map(v => (
                    <Button
                      key={v}
                      variant={tankSize === v ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTankSize(v)}
                    >
                      {v}g
                    </Button>
                  ))}
                </div>
              </div>

              {/* SH Source Strength */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Source SH Strength</Label>
                  <span className="font-bold text-primary">{shSourceStrength}%</span>
                </div>
                <div className="flex gap-2">
                  {[12.5, 10, 8.25, 6].map(v => (
                    <Button
                      key={v}
                      variant={shSourceStrength === v ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShSourceStrength(v)}
                    >
                      {v}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Surfactant */}
              <div className="space-y-3">
                <Label>Surfactant</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SURFACTANT_OPTIONS.map(s => (
                    <Button
                      key={s.name}
                      variant={selectedSurfactant === s.name ? 'default' : 'outline'}
                      className="h-auto py-2 justify-start"
                      onClick={() => setSelectedSurfactant(s.name)}
                    >
                      <div className="text-left">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs opacity-80">{s.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipe Output */}
        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{preset.name} Recipe</CardTitle>
                <Button variant="outline" size="sm" onClick={copyRecipe}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Badge variant="outline" className="w-fit">
                Target: {calculations.targetConcentration}% SH
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SH Amount */}
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Beaker className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium">Sodium Hypochlorite</p>
                    <p className="text-xs text-muted-foreground">{shSourceStrength}% source</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{calculations.shGallons.toFixed(2)} gal</p>
                  <p className="text-xs text-muted-foreground">{calculations.shOunces.toFixed(0)} oz</p>
                </div>
              </div>

              {/* Water Amount */}
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Droplets className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="font-medium">Water</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{calculations.waterGallons.toFixed(2)} gal</p>
                </div>
              </div>

              {/* Surfactant Amount */}
              {calculations.surfactantOz > 0 && (
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Beaker className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="font-medium">{selectedSurfactant}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{calculations.surfactantOz.toFixed(1)} oz</p>
                  </div>
                </div>
              )}

              {/* Dilution Ratio */}
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Dilution Ratio (SH:Water)</p>
                <p className="text-2xl font-bold">1 : {(calculations.dilutionRatio - 1).toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Application Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Application Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dwell Time</span>
                <Badge variant="secondary">{preset.dwellTimeMinutes} minutes</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rinse Required</span>
                {preset.rinseRequired ? (
                  <Badge className="bg-blue-500/10 text-blue-600">Yes</Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-600">No (let rain clean)</Badge>
                )}
              </div>
              
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-amber-600">Pro Tips</p>
                    <p className="text-sm text-muted-foreground">{preset.notes}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/power-washing/bleach-calculator')}
              >
                <Beaker className="h-4 w-4 mr-2" />
                SH / Bleach Calculator
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/power-washing/formulas')}
              >
                <Beaker className="h-4 w-4 mr-2" />
                My Saved Formulas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
