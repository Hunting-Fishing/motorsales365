import React from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Radio, Plus, ArrowDownLeft, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useVoyageCommunications } from '@/hooks/useVoyageLogs';
import { CommunicationCallType, CALL_TYPE_LABELS } from '@/types/voyage';
import { format } from 'date-fns';

interface CommunicationsLogProps {
  voyageId: string;
}

interface FormData {
  channel: string;
  contact_station: string;
  call_type: CommunicationCallType;
  direction: 'inbound' | 'outbound';
  message_summary: string;
}

const QUICK_CONTACTS = [
  { label: 'VTS', value: 'VTS' },
  { label: 'Coast Guard', value: 'Coast Guard' },
  { label: 'Traffic Control', value: 'Traffic Control' },
  { label: 'Port Authority', value: 'Port Authority' },
];

const COMMON_CHANNELS = ['16', '13', '14', '06', '68', '69', '71', '72'];

export function CommunicationsLog({ voyageId }: CommunicationsLogProps) {
  const { communications, isLoading, addCommunication, isAdding } = useVoyageCommunications(voyageId);
  const { register, handleSubmit, setValue, reset, watch } = useForm<FormData>({
    defaultValues: {
      direction: 'outbound',
      call_type: 'check_in'
    }
  });

  const selectedCallType = watch('call_type');

  const onSubmit = async (data: FormData) => {
    await addCommunication({
      voyage_id: voyageId,
      communication_time: new Date().toISOString(),
      ...data
    });
    reset({ direction: 'outbound', call_type: 'check_in' });
  };

  const getCallTypeBadgeVariant = (type: CommunicationCallType) => {
    switch (type) {
      case 'mayday': return 'destructive';
      case 'pan_pan': return 'destructive';
      case 'security_call': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Log Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Quick Contact Buttons */}
            <div className="flex flex-wrap gap-2">
              {QUICK_CONTACTS.map(contact => (
                <Button
                  key={contact.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('contact_station', contact.value)}
                >
                  {contact.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Channel</Label>
                <Select onValueChange={v => setValue('channel', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="VHF Ch" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CHANNELS.map(ch => (
                      <SelectItem key={ch} value={ch}>CH {ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contact Station</Label>
                <Input {...register('contact_station')} placeholder="VTS, Coast Guard..." />
              </div>
              <div>
                <Label>Call Type</Label>
                <Select onValueChange={v => setValue('call_type', v as CommunicationCallType)} defaultValue="check_in">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CALL_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direction</Label>
                <Select onValueChange={v => setValue('direction', v as 'inbound' | 'outbound')} defaultValue="outbound">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(selectedCallType === 'mayday' || selectedCallType === 'pan_pan') && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Emergency communication - ensure proper protocols are followed
                </span>
              </div>
            )}

            <div>
              <Label>Message Summary</Label>
              <Textarea {...register('message_summary')} placeholder="Brief summary of communication..." rows={2} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isAdding} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Log Communication
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Communications History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Communication Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : communications.length === 0 ? (
            <p className="text-muted-foreground text-sm">No communications logged yet</p>
          ) : (
            <div className="space-y-3">
              {communications.map(comm => (
                <div key={comm.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-0.5">
                    {comm.direction === 'inbound' ? (
                      <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{comm.contact_station || 'Unknown'}</span>
                      {comm.channel && (
                        <Badge variant="outline" className="text-xs">CH {comm.channel}</Badge>
                      )}
                      {comm.call_type && (
                        <Badge variant={getCallTypeBadgeVariant(comm.call_type as CommunicationCallType)} className="text-xs">
                          {CALL_TYPE_LABELS[comm.call_type as CommunicationCallType]}
                        </Badge>
                      )}
                    </div>
                    {comm.message_summary && (
                      <p className="text-sm text-muted-foreground mt-1">{comm.message_summary}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(comm.communication_time), 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
