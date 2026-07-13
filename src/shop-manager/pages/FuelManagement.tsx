import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useFuelManagement } from '@/hooks/useFuelManagement';
import { Fuel, CreditCard, MapPin, TrendingUp, Plus, DollarSign, Droplet, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function FuelManagement() {
  const {
    fuelEntries,
    fuelCards,
    fuelStations,
    fuelBudgets,
    fuelStats,
    isLoading,
    createFuelEntry,
    createFuelCard,
    createFuelStation
  } = useFuelManagement();

  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isStationDialogOpen, setIsStationDialogOpen] = useState(false);

  const [newEntry, setNewEntry] = useState({
    fuel_unit: 'gallons',
    fuel_amount: '',
    cost: '',
    odometer_reading: '',
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const [newCard, setNewCard] = useState({
    card_number: '',
    provider: '',
    credit_limit: '',
    expiry_date: ''
  });

  const [newStation, setNewStation] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: ''
  });

  const handleCreateEntry = () => {
    createFuelEntry.mutate({
      fuel_unit: newEntry.fuel_unit,
      fuel_amount: parseFloat(newEntry.fuel_amount),
      cost: parseFloat(newEntry.cost),
      odometer_reading: newEntry.odometer_reading ? parseInt(newEntry.odometer_reading) : null,
      entry_date: newEntry.entry_date,
      notes: newEntry.notes || null
    }, {
      onSuccess: () => {
        setIsEntryDialogOpen(false);
        setNewEntry({
          fuel_unit: 'gallons',
          fuel_amount: '',
          cost: '',
          odometer_reading: '',
          entry_date: format(new Date(), 'yyyy-MM-dd'),
          notes: ''
        });
      }
    });
  };

  const handleCreateCard = () => {
    createFuelCard.mutate({
      card_number: newCard.card_number,
      provider: newCard.provider,
      credit_limit: newCard.credit_limit ? parseFloat(newCard.credit_limit) : null,
      expiry_date: newCard.expiry_date || null,
      status: 'active'
    }, {
      onSuccess: () => {
        setIsCardDialogOpen(false);
        setNewCard({ card_number: '', provider: '', credit_limit: '', expiry_date: '' });
      }
    });
  };

  const handleCreateStation = () => {
    createFuelStation.mutate({
      name: newStation.name,
      address: newStation.address || null,
      city: newStation.city || null,
      province: newStation.state || null,
      phone: newStation.phone || null
    }, {
      onSuccess: () => {
        setIsStationDialogOpen(false);
        setNewStation({ name: '', address: '', city: '', state: '', phone: '' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fuel Management</h1>
          <p className="text-muted-foreground">Track fuel usage, costs, and manage fuel cards</p>
        </div>
        <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Fuel Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fuel Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fuel Type</Label>
                  <Select value={newEntry.fuel_unit} onValueChange={(v) => setNewEntry({ ...newEntry, fuel_unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gallons">Gallons (Diesel)</SelectItem>
                      <SelectItem value="gallons_gas">Gallons (Gasoline)</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="gallons_def">DEF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newEntry.entry_date}
                    onChange={(e) => setNewEntry({ ...newEntry, entry_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fuel Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newEntry.fuel_amount}
                    onChange={(e) => setNewEntry({ ...newEntry, fuel_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newEntry.cost}
                    onChange={(e) => setNewEntry({ ...newEntry, cost: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Odometer Reading (optional)</Label>
                <Input
                  type="number"
                  placeholder="Enter odometer reading"
                  value={newEntry.odometer_reading}
                  onChange={(e) => setNewEntry({ ...newEntry, odometer_reading: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Add notes..."
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                />
              </div>
              {newEntry.fuel_amount && newEntry.cost && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Price per Unit</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(parseFloat(newEntry.cost) / parseFloat(newEntry.fuel_amount)).toFixed(3)}
                  </p>
                </div>
              )}
              <Button onClick={handleCreateEntry} className="w-full" disabled={!newEntry.fuel_amount || !newEntry.cost}>
                Add Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Droplet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fuel</p>
                <p className="text-2xl font-bold">{fuelStats.totalGallons.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${fuelStats.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Cost/Unit</p>
                <p className="text-2xl font-bold">${(fuelStats.avgCostPerGallon || 0).toFixed(3)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <CreditCard className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Cards</p>
                <p className="text-2xl font-bold">{fuelStats.activeCards}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries">Fuel Entries</TabsTrigger>
          <TabsTrigger value="cards">Fuel Cards</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fuel Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {fuelEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fuel entries yet</p>
                  <p className="text-sm">Add your first fuel entry to start tracking</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fuelEntries.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full">
                          <Fuel className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{entry.fuel_amount} {entry.fuel_unit || 'gal'}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.entry_date ? format(new Date(entry.entry_date), 'MMM d, yyyy') : 'N/A'}
                            {entry.odometer_reading && ` • ${entry.odometer_reading.toLocaleString()} mi`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${(entry.cost || 0).toFixed(2)}</p>
                        {entry.fuel_amount && entry.cost && (
                          <p className="text-sm text-muted-foreground">${(entry.cost / entry.fuel_amount).toFixed(3)}/unit</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Fuel Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input
                      placeholder="Enter card number"
                      value={newCard.card_number}
                      onChange={(e) => setNewCard({ ...newCard, card_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Input
                      placeholder="e.g., Fleet One, WEX, Comdata"
                      value={newCard.provider}
                      onChange={(e) => setNewCard({ ...newCard, provider: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Credit Limit (optional)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={newCard.credit_limit}
                        onChange={(e) => setNewCard({ ...newCard, credit_limit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date (optional)</Label>
                      <Input
                        type="date"
                        value={newCard.expiry_date}
                        onChange={(e) => setNewCard({ ...newCard, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateCard} className="w-full" disabled={!newCard.card_number || !newCard.provider}>
                    Add Card
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Fuel Cards</CardTitle>
            </CardHeader>
            <CardContent>
              {fuelCards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fuel cards registered</p>
                  <p className="text-sm">Add fuel cards to track usage by card</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {fuelCards.map((card) => (
                    <div key={card.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">****{card.card_number.slice(-4)}</p>
                          <p className="text-sm text-muted-foreground">{card.provider}</p>
                        </div>
                        <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                          {card.status}
                        </Badge>
                      </div>
                      {card.credit_limit && (
                        <p className="text-sm text-muted-foreground">
                          Limit: ${card.credit_limit.toLocaleString()}
                        </p>
                      )}
                      {card.expiry_date && (
                        <p className="text-sm text-muted-foreground">
                          Expires: {format(new Date(card.expiry_date), 'MMM yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stations" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isStationDialogOpen} onOpenChange={setIsStationDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Station
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Fuel Station</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Station Name</Label>
                    <Input
                      placeholder="Enter station name"
                      value={newStation.name}
                      onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Street address"
                      value={newStation.address}
                      onChange={(e) => setNewStation({ ...newStation, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        placeholder="City"
                        value={newStation.city}
                        onChange={(e) => setNewStation({ ...newStation, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        placeholder="State"
                        value={newStation.state}
                        onChange={(e) => setNewStation({ ...newStation, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input
                      placeholder="Phone number"
                      value={newStation.phone}
                      onChange={(e) => setNewStation({ ...newStation, phone: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateStation} className="w-full" disabled={!newStation.name}>
                    Add Station
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Fuel Stations</CardTitle>
            </CardHeader>
            <CardContent>
              {fuelStations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fuel stations saved</p>
                  <p className="text-sm">Add preferred stations for quick selection</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fuelStations.map((station) => (
                    <div key={station.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{station.name}</p>
                          {station.address && (
                            <p className="text-sm text-muted-foreground">
                              {station.address}{station.city && `, ${station.city}`}{station.province && `, ${station.province}`}
                            </p>
                          )}
                        </div>
                      </div>
                      {station.is_preferred && <Badge>Preferred</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fuel Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              {fuelBudgets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fuel budgets set</p>
                  <p className="text-sm">Create budgets to track fuel spending</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fuelBudgets.map((budget) => (
                    <div key={budget.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{budget.budget_period}</Badge>
                        <p className="text-lg font-bold">${budget.budget_amount.toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Alert at {budget.alert_threshold_percent}% usage
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
