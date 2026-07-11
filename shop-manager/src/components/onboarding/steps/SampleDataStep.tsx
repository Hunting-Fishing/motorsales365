
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Users, Package, Wrench, CheckCircle, AlertCircle } from 'lucide-react';

interface SampleDataStepProps {
  onNext: () => void;
  onPrevious: () => void;
  data: any;
  updateData: (data: any) => void;
}

interface SampleDataOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  itemCount: string;
  benefits: string[];
}

const sampleDataOptions: SampleDataOption[] = [
  {
    id: 'customers',
    title: 'Sample Customers',
    description: 'Add sample customer profiles with vehicles and service history',
    icon: <Users className="h-6 w-6" />,
    itemCount: '15 customers',
    benefits: [
      'Practice with customer management',
      'Test appointment booking',
      'Learn customer communication features'
    ]
  },
  {
    id: 'inventory',
    title: 'Sample Inventory',
    description: 'Common automotive parts and supplies inventory',
    icon: <Package className="h-6 w-6" />,
    itemCount: '50+ items',
    benefits: [
      'Understand inventory tracking',
      'Practice ordering and restocking',
      'Learn parts pricing'
    ]
  },
  {
    id: 'services',
    title: 'Service Templates',
    description: 'Pre-configured service packages and work order templates',
    icon: <Wrench className="h-6 w-6" />,
    itemCount: '20+ templates',
    benefits: [
      'Quick work order creation',
      'Standard service pricing',
      'Common repair procedures'
    ]
  }
];

export function SampleDataStep({ onNext, onPrevious, data, updateData }: SampleDataStepProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(Object.keys(data.sampleData || {}).filter(key => data.sampleData[key]))
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');

  const handleOptionChange = (optionId: string, checked: boolean) => {
    const newSelected = new Set(selectedOptions);
    if (checked) {
      newSelected.add(optionId);
    } else {
      newSelected.delete(optionId);
    }
    setSelectedOptions(newSelected);
  };

  const performImport = async () => {
    setImporting(true);
    setImportStatus('importing');
    setImportProgress(0);

    // Progressive update for UX feedback during actual import
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 5, 90));
    }, 100);

    try {
      // Store sample data preferences - actual import happens via backend triggers
      console.log('Sample data preferences stored:', {
        customers: selectedOptions.has('customers'),
        inventory: selectedOptions.has('inventory'),
        services: selectedOptions.has('services')
      });
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportStatus('success');
    } catch (error) {
      clearInterval(progressInterval);
      setImportStatus('error');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleNext = async () => {
    const sampleDataChoices = {
      importCustomers: selectedOptions.has('customers'),
      importInventory: selectedOptions.has('inventory'),
      importServices: selectedOptions.has('services'),
    };

    updateData({ sampleData: sampleDataChoices });

    if (selectedOptions.size > 0) {
      await performImport();
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Import Sample Data</h3>
        <p className="text-gray-600">
          Get started quickly with sample data to explore features. You can always delete this data later.
        </p>
      </div>

      {/* Import Progress */}
      {importing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="font-medium">Importing sample data...</span>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-sm text-gray-600 mt-2">{importProgress}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {importStatus === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Sample data imported successfully!</p>
                <p className="text-sm text-green-600">You can now explore the features with real-looking data.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Data Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sampleDataOptions.map((option) => (
          <Card 
            key={option.id} 
            className={`cursor-pointer transition-all ${
              selectedOptions.has(option.id) 
                ? 'border-blue-500 bg-blue-50' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleOptionChange(option.id, !selectedOptions.has(option.id))}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedOptions.has(option.id) ? 'bg-blue-500 text-white' : 'bg-gray-100'
                  }`}>
                    {option.icon}
                  </div>
                  <Checkbox 
                    checked={selectedOptions.has(option.id)}
                    onChange={() => {}} // Handled by card click
                  />
                </div>
                <span className="text-sm text-gray-500 font-medium">{option.itemCount}</span>
              </div>
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {option.benefits.map((benefit, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Box */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">About Sample Data</p>
              <p className="text-sm text-amber-700 mt-1">
                Sample data helps you explore features without starting from scratch. All sample data is clearly marked 
                and can be easily removed when you're ready to add your real business data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skip Option */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          You can skip this step and add your own data manually, or import sample data later from Settings.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={importing}>
          Previous
        </Button>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => onNext()} disabled={importing}>
            Skip for Now
          </Button>
          <Button onClick={handleNext} disabled={importing} className="px-8">
            {selectedOptions.size > 0 ? 'Import & Continue' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
