import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, FileSpreadsheet, ArrowUpDown, BookOpen, Download, RefreshCw } from 'lucide-react';
import { useFinancialReports, AccountBalance } from '@/hooks/useFinancialReports';
import { useAccountingIntegration } from '@/hooks/useAccountingIntegration';
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

export function FinancialReportsPanel() {
  const { useTrialBalance, useIncomeStatement, useBalanceSheet, useGeneralLedger } = useFinancialReports();
  const { accounts } = useAccountingIntegration();

  const today = new Date();
  const [asOfDate, setAsOfDate] = useState(format(today, 'yyyy-MM-dd'));
  const [periodStart, setPeriodStart] = useState(format(startOfYear(today), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const trialBalance = useTrialBalance(asOfDate);
  const incomeStatement = useIncomeStatement(periodStart, periodEnd);
  const balanceSheet = useBalanceSheet(asOfDate);
  const generalLedger = useGeneralLedger(selectedAccount, periodStart, periodEnd);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const exportToCsv = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trial-balance">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trial-balance" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Income Statement
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="general-ledger" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            General Ledger
          </TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>Account balances as of a specific date</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>As of:</Label>
                    <Input
                      type="date"
                      value={asOfDate}
                      onChange={e => setAsOfDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => trialBalance.data && exportToCsv(trialBalance.data.accounts, 'trial-balance')}
                  >
                    <Download className="h-4 w-4 mr-2" />Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trialBalance.isLoading ? (
                <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.data?.accounts.filter(a => a.debit_total > 0 || a.credit_total > 0).map(account => (
                        <TableRow key={account.account_id}>
                          <TableCell className="font-mono">{account.account_code}</TableCell>
                          <TableCell>{account.account_name}</TableCell>
                          <TableCell><Badge variant="outline">{account.account_type}</Badge></TableCell>
                          <TableCell className="text-right font-mono">
                            {account.balance > 0 && account.normal_balance === 'debit' ? formatCurrency(account.balance) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {account.balance > 0 && account.normal_balance === 'credit' ? formatCurrency(account.balance) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={3}>Totals</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(trialBalance.data?.totalDebits || 0)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(trialBalance.data?.totalCredits || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  {trialBalance.data && Math.abs(trialBalance.data.totalDebits - trialBalance.data.totalCredits) > 0.01 && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
                      Trial balance is out of balance by {formatCurrency(Math.abs(trialBalance.data.totalDebits - trialBalance.data.totalCredits))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Income Statement */}
        <TabsContent value="income-statement" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>Revenue and expenses for a period</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>From:</Label>
                    <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>To:</Label>
                    <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-40" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => incomeStatement.data && exportToCsv([
                    ...incomeStatement.data.revenue,
                    ...incomeStatement.data.costOfGoodsSold,
                    ...incomeStatement.data.expenses
                  ], 'income-statement')}>
                    <Download className="h-4 w-4 mr-2" />Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {incomeStatement.isLoading ? (
                <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Revenue</h3>
                    <Table>
                      <TableBody>
                        {incomeStatement.data?.revenue.map(acc => (
                          <TableRow key={acc.account_id}>
                            <TableCell className="font-mono">{acc.account_code}</TableCell>
                            <TableCell>{acc.account_name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold">
                          <TableCell colSpan={2}>Total Revenue</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.data?.totalRevenue || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {(incomeStatement.data?.costOfGoodsSold.length || 0) > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Cost of Goods Sold</h3>
                      <Table>
                        <TableBody>
                          {incomeStatement.data?.costOfGoodsSold.map(acc => (
                            <TableRow key={acc.account_id}>
                              <TableCell className="font-mono">{acc.account_code}</TableCell>
                              <TableCell>{acc.account_name}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold">
                            <TableCell colSpan={2}>Total COGS</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.data?.totalCOGS || 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <div className="p-3 bg-muted rounded-lg mt-2">
                        <span className="font-semibold">Gross Profit: </span>
                        <span className="font-mono">{formatCurrency(incomeStatement.data?.grossProfit || 0)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Expenses</h3>
                    <Table>
                      <TableBody>
                        {incomeStatement.data?.expenses.map(acc => (
                          <TableRow key={acc.account_id}>
                            <TableCell className="font-mono">{acc.account_code}</TableCell>
                            <TableCell>{acc.account_name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold">
                          <TableCell colSpan={2}>Total Expenses</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(incomeStatement.data?.totalExpenses || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className={`p-4 rounded-lg ${(incomeStatement.data?.netIncome || 0) >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                    <span className="font-bold text-lg">Net Income: </span>
                    <span className={`font-mono text-lg ${(incomeStatement.data?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(incomeStatement.data?.netIncome || 0)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>Assets, liabilities, and equity as of a date</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>As of:</Label>
                    <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-40" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => balanceSheet.data && exportToCsv([
                    ...balanceSheet.data.assets,
                    ...balanceSheet.data.liabilities,
                    ...balanceSheet.data.equity
                  ], 'balance-sheet')}>
                    <Download className="h-4 w-4 mr-2" />Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {balanceSheet.isLoading ? (
                <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Assets</h3>
                    <Table>
                      <TableBody>
                        {balanceSheet.data?.assets.map(acc => (
                          <TableRow key={acc.account_id}>
                            <TableCell className="font-mono">{acc.account_code}</TableCell>
                            <TableCell>{acc.account_name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold border-t-2">
                          <TableCell colSpan={2}>Total Assets</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.data?.totalAssets || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Liabilities</h3>
                      <Table>
                        <TableBody>
                          {balanceSheet.data?.liabilities.map(acc => (
                            <TableRow key={acc.account_id}>
                              <TableCell className="font-mono">{acc.account_code}</TableCell>
                              <TableCell>{acc.account_name}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold">
                            <TableCell colSpan={2}>Total Liabilities</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.data?.totalLiabilities || 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Equity</h3>
                      <Table>
                        <TableBody>
                          {balanceSheet.data?.equity.map(acc => (
                            <TableRow key={acc.account_id}>
                              <TableCell className="font-mono">{acc.account_code}</TableCell>
                              <TableCell>{acc.account_name}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold">
                            <TableCell colSpan={2}>Total Equity</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(balanceSheet.data?.totalEquity || 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="p-3 bg-muted rounded-lg font-bold">
                      Total Liabilities + Equity: {formatCurrency((balanceSheet.data?.totalLiabilities || 0) + (balanceSheet.data?.totalEquity || 0))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger */}
        <TabsContent value="general-ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>General Ledger</CardTitle>
                  <CardDescription>Transaction history by account</CardDescription>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label>Account:</Label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>From:</Label>
                    <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>To:</Label>
                    <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-40" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => generalLedger.data && exportToCsv(generalLedger.data.entries, 'general-ledger')}>
                    <Download className="h-4 w-4 mr-2" />Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedAccount ? (
                <div className="text-center py-8 text-muted-foreground">Select an account to view its ledger</div>
              ) : generalLedger.isLoading ? (
                <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <span className="font-semibold">{generalLedger.data?.account.account_code} - {generalLedger.data?.account.account_name}</span>
                    <span className="ml-4">Opening Balance: <span className="font-mono">{formatCurrency(generalLedger.data?.openingBalance || 0)}</span></span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generalLedger.data?.entries.map((entry, idx) => (
                        <TableRow key={`${entry.id}-${idx}`}>
                          <TableCell>{format(new Date(entry.entry_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-mono">{entry.entry_number}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-right font-mono">{entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}</TableCell>
                          <TableCell className="text-right font-mono">{entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(entry.running_balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-3 bg-muted rounded-lg font-bold">
                    Closing Balance: <span className="font-mono">{formatCurrency(generalLedger.data?.closingBalance || 0)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
