import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  MapPin,
  User,
  FileText,
  Shield
} from 'lucide-react';
import { useSafetyIncidents } from '@/hooks/useSafetyIncidents';
import { 
  IncidentType, 
  IncidentSeverity, 
  InjuredPersonType,
  INCIDENT_TYPE_LABELS, 
  SEVERITY_LABELS,
  INJURED_PERSON_TYPE_LABELS 
} from '@/types/safety';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: FileText },
  { id: 2, title: 'Location & Type', icon: MapPin },
  { id: 3, title: 'Injury Details', icon: User },
  { id: 4, title: 'Review & Submit', icon: Shield }
];

const LOCATIONS = [
  'Service Bay 1',
  'Service Bay 2', 
  'Service Bay 3',
  'Service Bay 4',
  'Parts Room',
  'Office Area',
  'Parking Lot',
  'Customer Waiting Area',
  'Break Room',
  'Restroom',
  'Outside Shop',
  'Other'
];

interface FormData {
  incident_date: string;
  incident_time: string;
  incident_type: IncidentType | '';
  severity: IncidentSeverity | '';
  location: string;
  title: string;
  description: string;
  injured_person_name: string;
  injured_person_type: InjuredPersonType | '';
  injury_details: string;
  medical_treatment_required: boolean;
  medical_treatment_description: string;
  osha_reportable: boolean;
}

export function IncidentReportForm() {
  const navigate = useNavigate();
  const { createIncident } = useSafetyIncidents();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    incident_type: '',
    severity: '',
    location: '',
    title: '',
    description: '',
    injured_person_name: '',
    injured_person_type: '',
    injury_details: '',
    medical_treatment_required: false,
    medical_treatment_description: '',
    osha_reportable: false
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.incident_date && formData.title && formData.description;
      case 2:
        return formData.incident_type && formData.severity && formData.location;
      case 3:
        return true; // Injury details are optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!formData.incident_type || !formData.severity) return;
    
    setSubmitting(true);
    try {
      const result = await createIncident({
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || undefined,
        incident_type: formData.incident_type,
        severity: formData.severity,
        location: formData.location,
        title: formData.title,
        description: formData.description,
        injured_person_name: formData.injured_person_name || undefined,
        injured_person_type: formData.injured_person_type || undefined,
        injury_details: formData.injury_details || undefined,
        medical_treatment_required: formData.medical_treatment_required,
        medical_treatment_description: formData.medical_treatment_description || undefined,
        osha_reportable: formData.osha_reportable
      });
      
      if (result) {
        navigate('/safety/incidents');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${currentStep >= step.id 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground/30 text-muted-foreground'}
                  `}>
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Provide basic information about the incident'}
            {currentStep === 2 && 'Specify where and what type of incident occurred'}
            {currentStep === 3 && 'Add injury details if applicable'}
            {currentStep === 4 && 'Review and submit the incident report'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incident_date">Incident Date *</Label>
                  <Input
                    id="incident_date"
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => updateField('incident_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incident_time">Incident Time</Label>
                  <Input
                    id="incident_time"
                    type="time"
                    value={formData.incident_time}
                    onChange={(e) => updateField('incident_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Incident Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief title describing the incident"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what happened in detail..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={5}
                />
              </div>
            </>
          )}

          {/* Step 2: Location & Type */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label>Incident Type *</Label>
                <Select 
                  value={formData.incident_type} 
                  onValueChange={(v) => updateField('incident_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={formData.severity === value ? 'default' : 'outline'}
                      className={`
                        ${formData.severity === value ? '' : ''}
                        ${value === 'minor' && formData.severity === value ? 'bg-blue-500 hover:bg-blue-600' : ''}
                        ${value === 'moderate' && formData.severity === value ? 'bg-amber-500 hover:bg-amber-600' : ''}
                        ${value === 'serious' && formData.severity === value ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        ${value === 'critical' && formData.severity === value ? 'bg-destructive hover:bg-destructive/90' : ''}
                      `}
                      onClick={() => updateField('severity', value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Select 
                  value={formData.location} 
                  onValueChange={(v) => updateField('location', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Step 3: Injury Details */}
          {currentStep === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="injured_person_name">Injured Person Name</Label>
                <Input
                  id="injured_person_name"
                  placeholder="Name of injured person (if any)"
                  value={formData.injured_person_name}
                  onChange={(e) => updateField('injured_person_name', e.target.value)}
                />
              </div>

              {formData.injured_person_name && (
                <>
                  <div className="space-y-2">
                    <Label>Person Type</Label>
                    <Select 
                      value={formData.injured_person_type} 
                      onValueChange={(v) => updateField('injured_person_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select person type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INJURED_PERSON_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="injury_details">Injury Details</Label>
                    <Textarea
                      id="injury_details"
                      placeholder="Describe the injury..."
                      value={formData.injury_details}
                      onChange={(e) => updateField('injury_details', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="medical_treatment"
                      checked={formData.medical_treatment_required}
                      onCheckedChange={(c) => updateField('medical_treatment_required', c)}
                    />
                    <Label htmlFor="medical_treatment">Medical treatment required</Label>
                  </div>

                  {formData.medical_treatment_required && (
                    <div className="space-y-2">
                      <Label htmlFor="treatment_desc">Treatment Description</Label>
                      <Textarea
                        id="treatment_desc"
                        placeholder="Describe medical treatment provided..."
                        value={formData.medical_treatment_description}
                        onChange={(e) => updateField('medical_treatment_description', e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center space-x-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <Checkbox
                  id="osha"
                  checked={formData.osha_reportable}
                  onCheckedChange={(c) => updateField('osha_reportable', c)}
                />
                <div>
                  <Label htmlFor="osha" className="font-medium">OSHA Reportable</Label>
                  <p className="text-sm text-muted-foreground">
                    Check if this incident requires OSHA reporting
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{formData.incident_date} {formData.incident_time}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{formData.location}</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{formData.title}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{formData.description}</p>
              </div>

              <div className="flex gap-2">
                {formData.incident_type && (
                  <Badge variant="outline">
                    {INCIDENT_TYPE_LABELS[formData.incident_type]}
                  </Badge>
                )}
                {formData.severity && (
                  <Badge className={`
                    ${formData.severity === 'minor' ? 'bg-blue-500' : ''}
                    ${formData.severity === 'moderate' ? 'bg-amber-500' : ''}
                    ${formData.severity === 'serious' ? 'bg-orange-500' : ''}
                    ${formData.severity === 'critical' ? 'bg-destructive' : ''}
                  `}>
                    {SEVERITY_LABELS[formData.severity]}
                  </Badge>
                )}
                {formData.osha_reportable && (
                  <Badge variant="destructive">OSHA Reportable</Badge>
                )}
              </div>

              {formData.injured_person_name && (
                <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
                  <p className="text-sm font-medium">Injured Person</p>
                  <p>{formData.injured_person_name}</p>
                  {formData.injury_details && (
                    <p className="text-sm text-muted-foreground mt-1">{formData.injury_details}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => currentStep === 1 ? navigate('/safety/incidents') : setCurrentStep(currentStep - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
            {submitting ? 'Submitting...' : 'Submit Report'}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
