import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Camera, Video, StickyNote, Printer, X } from 'lucide-react';
import { CompactSignaturePad } from '@/components/signature';

const ROW_COLORS = [
  'bg-pink-50 dark:bg-pink-950/20',
  'bg-yellow-50 dark:bg-yellow-950/20',
  'bg-blue-50 dark:bg-blue-950/20',
  'bg-green-50 dark:bg-green-950/20',
];

interface TemplateItem {
  id: string;
  item_name: string;
  is_required?: boolean;
  response_type?: string;
  unit?: string;
  allows_notes?: boolean;
  allows_photos?: boolean;
  allows_videos?: boolean;
}

interface TemplateSection {
  id: string;
  title: string;
  description?: string;
  items: TemplateItem[];
}

interface FormValues {
  [itemId: string]: {
    value: string | boolean | number | null;
    notes?: string;
    photos?: string[];
  };
}

interface HeaderValues {
  location: string;
  date: string;
  assignedTo: string;
  signedBy: string | null;
}

interface SepticInspectionFormTemplateProps {
  templateName: string;
  templateDescription?: string;
  sections: TemplateSection[];
  interactive?: boolean;
  values?: FormValues;
  headerValues?: HeaderValues;
  onValuesChange?: (values: FormValues) => void;
  onHeaderChange?: (header: HeaderValues) => void;
  onPrint?: () => void;
}

export default function SepticInspectionFormTemplate({
  templateName,
  templateDescription,
  sections,
  interactive = false,
  values: externalValues,
  headerValues: externalHeader,
  onValuesChange,
  onHeaderChange,
  onPrint,
}: SepticInspectionFormTemplateProps) {
  const [internalValues, setInternalValues] = useState<FormValues>({});
  const [internalHeader, setInternalHeader] = useState<HeaderValues>({
    location: '',
    date: new Date().toISOString().split('T')[0],
    assignedTo: '',
    signedBy: null,
  });
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [openPhotos, setOpenPhotos] = useState<Set<string>>(new Set());

  const values = externalValues ?? internalValues;
  const header = externalHeader ?? internalHeader;

  const updateValue = (itemId: string, field: 'value' | 'notes' | 'photos', val: any) => {
    const next = {
      ...values,
      [itemId]: { ...values[itemId], [field]: val },
    };
    if (onValuesChange) onValuesChange(next);
    else setInternalValues(next);
  };

  const updateHeader = (field: keyof HeaderValues, val: string | null) => {
    const next = { ...header, [field]: val };
    if (onHeaderChange) onHeaderChange(next);
    else setInternalHeader(next);
  };

  const toggleNotes = (itemId: string) => {
    setOpenNotes(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const togglePhotos = (itemId: string) => {
    setOpenPhotos(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handlePhotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const existing = values[itemId]?.photos || [];
        updateValue(itemId, 'photos', [...existing, ev.target.result as string]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (itemId: string, index: number) => {
    const existing = values[itemId]?.photos || [];
    const next = [...existing];
    next.splice(index, 1);
    updateValue(itemId, 'photos', next);
  };

  // Calculate checklist score
  const totalCheckable = sections.flatMap(s => s.items).filter(i => {
    const rt = i.response_type || 'pass_fail_na';
    return rt === 'pass_fail_na' || rt === 'checkbox' || rt === 'gyr_status';
  }).length;

  const completedCount = sections.flatMap(s => s.items).filter(i => {
    const rt = i.response_type || 'pass_fail_na';
    if (rt !== 'pass_fail_na' && rt !== 'checkbox' && rt !== 'gyr_status') return false;
    const v = values[i.id]?.value;
    return v !== undefined && v !== null && v !== '';
  }).length;

  const scoreText = totalCheckable > 0 ? `${completedCount} / ${totalCheckable}` : 'N/A';

  const renderSectionHeader = (section: TemplateSection) => {
    const firstItemType = section.items[0]?.response_type || 'pass_fail_na';
    const isPFN = firstItemType === 'pass_fail_na';
    const isGYR = firstItemType === 'gyr_status';

    return (
      <div className="bg-purple-800 dark:bg-purple-900 text-white px-4 py-2.5 flex items-center print:bg-purple-800 print:text-white">
        <span className="font-bold text-sm flex-1">{section.title}</span>
        {isPFN && (
          <div className="flex gap-0 text-xs font-semibold">
            <span className="w-12 text-center">✓</span>
            <span className="w-12 text-center">✗</span>
            <span className="w-12 text-center">N/A</span>
          </div>
        )}
        {isGYR && (
          <div className="flex gap-0 text-xs font-semibold">
            <span className="w-12 text-center">🟢</span>
            <span className="w-12 text-center">🟡</span>
            <span className="w-12 text-center">🔴</span>
          </div>
        )}
        {firstItemType === 'checkbox' && (
          <span className="w-12 text-center text-xs font-semibold">✓</span>
        )}
      </div>
    );
  };

  const renderItem = (item: TemplateItem, index: number) => {
    const rt = item.response_type || 'pass_fail_na';
    const colorClass = ROW_COLORS[index % ROW_COLORS.length];
    const currentValue = values[item.id]?.value;
    const currentNotes = values[item.id]?.notes || '';
    const currentPhotos = values[item.id]?.photos || [];
    const notesOpen = openNotes.has(item.id) || !!currentNotes;
    const photosOpen = openPhotos.has(item.id) || currentPhotos.length > 0;

    return (
      <div key={item.id} className={`${colorClass} border-b border-border/40 print:border-gray-300`}>
        <div className="px-4 py-2 flex items-center gap-2">
          <span className="flex-1 text-sm">
            {item.item_name}
            {item.is_required && <span className="text-destructive ml-1">*</span>}
          </span>

          {/* Response controls */}
          {rt === 'pass_fail_na' && (
            <div className="flex gap-0">
              {['pass', 'fail', 'na'].map(v => (
                <button
                  key={v}
                  type="button"
                  disabled={!interactive}
                  onClick={() => updateValue(item.id, 'value', v)}
                  className={`w-12 h-8 text-center text-xs font-medium border transition-colors
                    ${currentValue === v
                      ? v === 'pass' ? 'bg-green-500 text-white border-green-600'
                        : v === 'fail' ? 'bg-red-500 text-white border-red-600'
                        : 'bg-gray-500 text-white border-gray-600'
                      : 'bg-white dark:bg-card border-border hover:bg-muted'
                    }`}
                >
                  {v === 'pass' ? '✓' : v === 'fail' ? '✗' : 'N/A'}
                </button>
              ))}
            </div>
          )}

          {rt === 'gyr_status' && (
            <div className="flex gap-0">
              {['green', 'yellow', 'red'].map(v => (
                <button
                  key={v}
                  type="button"
                  disabled={!interactive}
                  onClick={() => updateValue(item.id, 'value', v)}
                  className={`w-12 h-8 text-center text-xs border transition-colors
                    ${currentValue === v
                      ? v === 'green' ? 'bg-green-500 text-white border-green-600'
                        : v === 'yellow' ? 'bg-yellow-400 text-black border-yellow-500'
                        : 'bg-red-500 text-white border-red-600'
                      : 'bg-white dark:bg-card border-border hover:bg-muted'
                    }`}
                >
                  {v === 'green' ? '🟢' : v === 'yellow' ? '🟡' : '🔴'}
                </button>
              ))}
            </div>
          )}

          {rt === 'checkbox' && (
            <div className="w-12 flex justify-center">
              <Checkbox
                checked={currentValue === true}
                onCheckedChange={(checked) => interactive && updateValue(item.id, 'value', !!checked)}
                disabled={!interactive}
              />
            </div>
          )}

          {rt === 'number' && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={currentValue as string || ''}
                onChange={e => updateValue(item.id, 'value', e.target.value)}
                disabled={!interactive}
                className="w-24 h-8 text-sm"
                placeholder="0"
              />
              {item.unit && <span className="text-xs text-muted-foreground">{item.unit}</span>}
            </div>
          )}

          {rt === 'text' && (
            <div className="flex-1 max-w-xs">
              <Input
                value={currentValue as string || ''}
                onChange={e => updateValue(item.id, 'value', e.target.value)}
                disabled={!interactive}
                className="h-8 text-sm"
                placeholder="Enter value..."
              />
            </div>
          )}

          {/* Interactive action buttons */}
          <div className="flex gap-1 ml-1 print:hidden">
            {item.allows_notes && interactive && (
              <button
                type="button"
                onClick={() => toggleNotes(item.id)}
                className={`p-1 rounded transition-colors ${notesOpen ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted'}`}
                title="Add notes"
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
            )}
            {item.allows_notes && !interactive && (
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {item.allows_photos && interactive && (
              <button
                type="button"
                onClick={() => togglePhotos(item.id)}
                className={`p-1 rounded transition-colors ${photosOpen ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted'}`}
                title="Add photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
            {item.allows_photos && !interactive && (
              <Camera className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {item.allows_videos && (
              <Video className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </div>
        </div>

        {/* Expandable notes row */}
        {item.allows_notes && notesOpen && (
          <div className="px-4 pb-2">
            <Input
              value={currentNotes}
              onChange={e => updateValue(item.id, 'notes', e.target.value)}
              placeholder="Add notes..."
              disabled={!interactive}
              className="h-7 text-xs bg-white/60 dark:bg-card/60"
            />
          </div>
        )}

        {/* Expandable photos row */}
        {item.allows_photos && photosOpen && (
          <div className="px-4 pb-2 space-y-2">
            {currentPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentPhotos.map((photo: string, idx: number) => (
                  <div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-border">
                    <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {interactive && (
                      <button
                        type="button"
                        onClick={() => removePhoto(item.id, idx)}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {interactive && (
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <label className="cursor-pointer">
                  <Camera className="h-3 w-3 mr-1" />
                  {currentPhotos.length > 0 ? 'Add another photo' : 'Take / upload photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => handlePhotoUpload(item.id, e)}
                  />
                </label>
              </Button>
            )}
          </div>
        )}

        {/* Show saved notes in read-only mode */}
        {!interactive && currentNotes && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground italic">📝 {currentNotes}</p>
          </div>
        )}
        {/* Show saved photos in read-only mode */}
        {!interactive && currentPhotos.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {currentPhotos.map((photo: string, idx: number) => (
              <div key={idx} className="w-16 h-16 rounded overflow-hidden border border-border">
                <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto print:max-w-none">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .inspection-form-printable, .inspection-form-printable * { visibility: visible; }
          .inspection-form-printable { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="inspection-form-printable">
        {/* Header */}
        <div className="border-2 border-purple-800 dark:border-purple-700 rounded-t-xl overflow-hidden">
          <div className="bg-purple-800 dark:bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{templateName}</h1>
              {templateDescription && (
                <p className="text-purple-200 text-sm mt-0.5">{templateDescription}</p>
              )}
            </div>
            {onPrint && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrint}
                className="text-white hover:bg-purple-700 print:hidden"
              >
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            )}
          </div>

          {/* Header fields */}
          <div className="bg-purple-50 dark:bg-purple-950/30 px-6 py-3 grid grid-cols-2 gap-3 border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-purple-900 dark:text-purple-200 whitespace-nowrap">Location:</label>
              <Input
                value={header.location}
                onChange={e => updateHeader('location', e.target.value)}
                disabled={!interactive}
                className="h-8 text-sm bg-white dark:bg-card"
                placeholder="Enter location..."
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-purple-900 dark:text-purple-200 whitespace-nowrap">Date:</label>
              <Input
                type="date"
                value={header.date}
                onChange={e => updateHeader('date', e.target.value)}
                disabled={!interactive}
                className="h-8 text-sm bg-white dark:bg-card"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-purple-900 dark:text-purple-200 whitespace-nowrap">Assigned To:</label>
              <Input
                value={header.assignedTo}
                onChange={e => updateHeader('assignedTo', e.target.value)}
                disabled={!interactive}
                className="h-8 text-sm bg-white dark:bg-card"
                placeholder="Inspector name..."
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-purple-900 dark:text-purple-200 whitespace-nowrap">Score:</label>
              <div className="h-8 px-3 flex items-center rounded-md border bg-white dark:bg-card text-sm font-mono font-bold text-purple-800 dark:text-purple-200">
                {scoreText}
              </div>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="border-x-2 border-purple-800 dark:border-purple-700">
          {sections.map(section => (
            <div key={section.id}>
              {renderSectionHeader(section)}
              {section.items.map((item, idx) => renderItem(item, idx))}
            </div>
          ))}
        </div>

        {/* Signature */}
        <div className="border-2 border-t-0 border-purple-800 dark:border-purple-700 rounded-b-xl overflow-hidden">
          <div className="bg-purple-50 dark:bg-purple-950/30 px-6 py-4">
            <label className="text-sm font-semibold text-purple-900 dark:text-purple-200 block mb-2">
              Signed By:
            </label>
            {interactive ? (
              <CompactSignaturePad
                value={header.signedBy || undefined}
                onChange={sig => updateHeader('signedBy', sig)}
                height={100}
                width={350}
              />
            ) : (
              <div className="border-b-2 border-purple-300 dark:border-purple-700 h-16 flex items-end">
                {header.signedBy && (
                  <img src={header.signedBy} alt="Signature" className="h-14" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
