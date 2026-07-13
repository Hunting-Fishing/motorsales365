import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Link, Plus, RefreshCw, Settings, BookOpen, FileSpreadsheet, 
  Calculator, CheckCircle, XCircle, Clock, AlertTriangle,
  ArrowUpDown, Trash2, Edit, Repeat, CalendarCheck
} from 'lucide-react';
import { useAccountingIntegration, ChartOfAccount, JournalEntry } from '@/hooks/useAccountingIntegration';
import { format } from 'date-fns';
import { FinancialReportsPanel } from '@/components/accounting/FinancialReportsPanel';
import { RecurringJournalTemplatesPanel } from '@/components/accounting/RecurringJournalTemplatesPanel';
import { FinancialPeriodsPanel } from '@/components/accounting/FinancialPeriodsPanel';

const INTEGRATION_TYPES = [
  { value: 'quickbooks_online', label: 'QuickBooks Online', icon: '📊' },
  { value: 'quickbooks_desktop', label: 'QuickBooks Desktop', icon: '💼' },
  { value: 'sage', label: 'Sage', icon: '📈' },
  { value: 'xero', label: 'Xero', icon: '🔷' },
  { value: 'wave', label: 'Wave', icon: '🌊' },
  { value: 'freshbooks', label: 'FreshBooks', icon: '📚' },
];

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
  { value: 'cost_of_goods_sold', label: 'Cost of Goods Sold' },
];

export default function AccountingIntegration() {
  const { 
    integrations, 
    accounts, 
    journalEntries, 
    isLoading,
    createIntegration,
    createAccount,
    createJournalEntry,
    postJournalEntry,
  } = useAccountingIntegration();

  const [activeTab, setActiveTab] = useState('integrations');
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);

  // Account form state
  const [newAccount, setNewAccount] = useState({
    account_code: '',
    account_name: '',
    account_type: '',
    account_subtype: '',
    description: '',
    normal_balance: 'debit',
  });

  // Journal entry form state
  const [newEntry, setNewEntry] = useState({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    entry_type: 'standard',
    description: '',
  });
  const [entryLines, setEntryLines] = useState([
    { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
    { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
  ]);

  // Integration form state
  const [newIntegration, setNewIntegration] = useState({
    integration_type: '',
    auto_sync_enabled: false,
    sync_frequency: 'daily',
  });

  const handleCreateAccount = () => {
    createAccount.mutate(newAccount);
    setShowAccountDialog(false);
    setNewAccount({
      account_code: '',
      account_name: '',
      account_type: '',
      account_subtype: '',
      description: '',
      normal_balance: 'debit',
    });
  };

  const handleCreateEntry = () => {
    const totalDebits = entryLines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
    const totalCredits = entryLines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);

    createJournalEntry.mutate({
      entry: { ...newEntry, total_debits: totalDebits, total_credits: totalCredits },
      lines: entryLines.filter(l => l.account_id),
    });
    setShowEntryDialog(false);
  };

  const handleCreateIntegration = () => {
    createIntegration.mutate(newIntegration);
    setShowIntegrationDialog(false);
  };

  const addEntryLine = () => {
    setEntryLines([...entryLines, { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]);
  };

  const updateEntryLine = (index: number, field: string, value: any) => {
    const updated = [...entryLines];
    updated[index] = { ...updated[index], [field]: value };
    setEntryLines(updated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounting Integration</h1>
          <p className="text-muted-foreground">Connect to accounting software and manage your chart of accounts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Journal Entries
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring
          </TabsTrigger>
          <TabsTrigger value="periods" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Periods
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Connected Software</h2>
            <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Integration</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Accounting Software</DialogTitle>
                  <DialogDescription>Choose your accounting software to connect</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Software</Label>
                    <Select value={newIntegration.integration_type} onValueChange={v => setNewIntegration({ ...newIntegration, integration_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select software" /></SelectTrigger>
                      <SelectContent>
                        {INTEGRATION_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sync Frequency</Label>
                    <Select value={newIntegration.sync_frequency} onValueChange={v => setNewIntegration({ ...newIntegration, sync_frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={newIntegration.auto_sync_enabled} 
                      onCheckedChange={v => setNewIntegration({ ...newIntegration, auto_sync_enabled: v })} 
                    />
                    <Label>Enable Auto-Sync</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowIntegrationDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateIntegration} disabled={!newIntegration.integration_type}>Connect</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map(integration => (
              <Card key={integration.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {INTEGRATION_TYPES.find(t => t.value === integration.integration_type)?.label || integration.integration_type}
                  </CardTitle>
                  {getStatusBadge(integration.connection_status)}
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Sync: {integration.sync_frequency}</p>
                    {integration.last_sync_at && (
                      <p>Last synced: {format(new Date(integration.last_sync_at), 'PPp')}</p>
                    )}
                    {integration.auto_sync_enabled && <Badge variant="outline" className="mt-2">Auto-sync enabled</Badge>}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline"><RefreshCw className="h-3 w-3 mr-1" />Sync Now</Button>
                    <Button size="sm" variant="outline"><Settings className="h-3 w-3 mr-1" />Settings</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {integrations.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Link className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No integrations connected yet</p>
                  <Button className="mt-4" onClick={() => setShowIntegrationDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />Connect Accounting Software
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chart of Accounts</h2>
            <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Account</DialogTitle>
                  <DialogDescription>Add a new account to your chart of accounts</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Account Code</Label>
                      <Input 
                        value={newAccount.account_code} 
                        onChange={e => setNewAccount({ ...newAccount, account_code: e.target.value })}
                        placeholder="1000"
                      />
                    </div>
                    <div>
                      <Label>Account Type</Label>
                      <Select value={newAccount.account_type} onValueChange={v => setNewAccount({ ...newAccount, account_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Account Name</Label>
                    <Input 
                      value={newAccount.account_name} 
                      onChange={e => setNewAccount({ ...newAccount, account_name: e.target.value })}
                      placeholder="Cash"
                    />
                  </div>
                  <div>
                    <Label>Normal Balance</Label>
                    <Select value={newAccount.normal_balance} onValueChange={v => setNewAccount({ ...newAccount, normal_balance: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={newAccount.description} 
                      onChange={e => setNewAccount({ ...newAccount, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAccountDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateAccount} disabled={!newAccount.account_code || !newAccount.account_name || !newAccount.account_type}>
                    Create Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map(account => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.account_code}</TableCell>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.account_type}</Badge>
                    </TableCell>
                    <TableCell>{account.normal_balance}</TableCell>
                    <TableCell>
                      {account.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {accounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No accounts created yet. Click "Add Account" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Journal Entries</h2>
            <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Entry</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create Journal Entry</DialogTitle>
                  <DialogDescription>Record a new journal entry with debits and credits</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={newEntry.entry_date}
                        onChange={e => setNewEntry({ ...newEntry, entry_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newEntry.entry_type} onValueChange={v => setNewEntry({ ...newEntry, entry_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="adjusting">Adjusting</SelectItem>
                          <SelectItem value="closing">Closing</SelectItem>
                          <SelectItem value="reversing">Reversing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input 
                        value={newEntry.description}
                        onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
                        placeholder="Entry description"
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                      <div className="col-span-4">Account</div>
                      <div className="col-span-2">Debit</div>
                      <div className="col-span-2">Credit</div>
                      <div className="col-span-3">Description</div>
                      <div className="col-span-1"></div>
                    </div>
                    {entryLines.map((line, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2">
                        <div className="col-span-4">
                          <Select value={line.account_id} onValueChange={v => updateEntryLine(index, 'account_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.account_code} - {acc.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input 
                            type="number" 
                            value={line.debit_amount || ''} 
                            onChange={e => updateEntryLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input 
                            type="number" 
                            value={line.credit_amount || ''} 
                            onChange={e => updateEntryLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input 
                            value={line.description || ''} 
                            onChange={e => updateEntryLine(index, 'description', e.target.value)}
                            placeholder="Line memo"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setEntryLines(entryLines.filter((_, i) => i !== index))}
                            disabled={entryLines.length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addEntryLine}>
                      <Plus className="h-4 w-4 mr-1" />Add Line
                    </Button>
                  </div>

                  <div className="flex justify-between text-sm bg-muted p-3 rounded-lg">
                    <span>Total Debits: ${entryLines.reduce((s, l) => s + (l.debit_amount || 0), 0).toFixed(2)}</span>
                    <span>Total Credits: ${entryLines.reduce((s, l) => s + (l.credit_amount || 0), 0).toFixed(2)}</span>
                    <span className={entryLines.reduce((s, l) => s + (l.debit_amount || 0), 0) === entryLines.reduce((s, l) => s + (l.credit_amount || 0), 0) ? 'text-green-600' : 'text-destructive'}>
                      {entryLines.reduce((s, l) => s + (l.debit_amount || 0), 0) === entryLines.reduce((s, l) => s + (l.credit_amount || 0), 0) ? '✓ Balanced' : '⚠ Unbalanced'}
                    </span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEntryDialog(false)}>Cancel</Button>
                  <Button 
                    onClick={handleCreateEntry}
                    disabled={
                      entryLines.reduce((s, l) => s + (l.debit_amount || 0), 0) !== 
                      entryLines.reduce((s, l) => s + (l.credit_amount || 0), 0) ||
                      entryLines.reduce((s, l) => s + (l.debit_amount || 0), 0) === 0
                    }
                  >
                    Save Entry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debits</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.entry_number}</TableCell>
                    <TableCell>{format(new Date(entry.entry_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant="outline">{entry.entry_type}</Badge></TableCell>
                    <TableCell>{entry.description || '-'}</TableCell>
                    <TableCell className="text-right font-mono">${Number(entry.total_debits).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${Number(entry.total_credits).toFixed(2)}</TableCell>
                    <TableCell>
                      {entry.is_posted ? (
                        <Badge className="bg-green-500">Posted</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!entry.is_posted && (
                        <Button size="sm" variant="outline" onClick={() => postJournalEntry.mutate(entry.id)}>
                          Post
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {journalEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No journal entries yet. Click "New Entry" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Recurring Templates Tab */}
        <TabsContent value="recurring" className="space-y-4">
          <RecurringJournalTemplatesPanel />
        </TabsContent>

        {/* Financial Periods Tab */}
        <TabsContent value="periods" className="space-y-4">
          <FinancialPeriodsPanel />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <FinancialReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
