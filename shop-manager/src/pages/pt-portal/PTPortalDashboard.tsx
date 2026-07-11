import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dumbbell, LogOut, Calendar, Activity, Loader2, ClipboardList, CheckCircle2,
  MessageSquare, Send, ClipboardCheck, Package, CreditCard, User, Utensils,
  Camera, Flame, X, Upload, Bell, HeartPulse
} from 'lucide-react';
import ClientPortalMedical from '@/components/pt-portal/ClientPortalMedical';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ClientData { id: string; first_name: string; last_name: string; email: string; fitness_level: string; goals: string | null; shop_id: string; [key: string]: any; }

export default function PTPortalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [workoutDays, setWorkoutDays] = useState<any[]>([]);
  const [dayExercises, setDayExercises] = useState<Record<string, any[]>>({});
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [loggingExercise, setLoggingExercise] = useState<string | null>(null);
  const [logWeight, setLogWeight] = useState('');
  const [trainers, setTrainers] = useState<any[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [cancellingSession, setCancellingSession] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check-in state
  const [checkInForm, setCheckInForm] = useState({ weight: '', mood: 'good', energy_level: [7], sleep_hours: '', notes: '', workout_compliance: [7], soreness_level: [3], pain_issues: '' });
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Booking state
  const [bookingForm, setBookingForm] = useState({ session_date: '', duration_minutes: 60, session_type: 'personal_training', trainer_id: '' });
  const [bookingSession, setBookingSession] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/pt-portal/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/pt-portal/login'); return; }
      setCurrentUserId(session.user.id);

      const { data: cl } = await (supabase as any)
        .from('pt_clients').select('*').eq('user_id', session.user.id).maybeSingle();
      if (!cl) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "No client account found.", variant: "destructive" });
        navigate('/pt-portal/login'); return;
      }
      setClient(cl);

      const [sessRes, metRes, progRes, pkgRes, msgRes, logRes, trainerRes, photosRes, streakRes, notifRes] = await Promise.all([
        (supabase as any).from('pt_sessions').select('id, session_date, duration_minutes, session_type, status, location')
          .eq('client_id', cl.id).order('session_date', { ascending: false }).limit(20),
        (supabase as any).from('pt_body_metrics').select('id, recorded_date, weight_kg, body_fat_percent, chest_cm, waist_cm')
          .eq('client_id', cl.id).order('recorded_date', { ascending: false }).limit(20),
        (supabase as any).from('pt_client_programs').select('*, pt_workout_programs(id, name, description, duration_weeks, difficulty, goal)')
          .eq('client_id', cl.id).eq('status', 'active'),
        (supabase as any).from('pt_client_packages').select('*, pt_packages(name, price, sessions_included)')
          .eq('client_id', cl.id).eq('status', 'active'),
        (supabase as any).from('pt_messages').select('*')
          .eq('client_id', cl.id).order('created_at', { ascending: true }).limit(100),
        (supabase as any).from('pt_workout_logs').select('exercise_id, workout_day_id')
          .eq('client_id', cl.id)
          .gte('completed_at', new Date().toISOString().split('T')[0] + 'T00:00:00')
          .lte('completed_at', new Date().toISOString().split('T')[0] + 'T23:59:59'),
        (supabase as any).from('pt_trainers').select('id, first_name, last_name')
          .eq('shop_id', cl.shop_id).eq('is_active', true),
        (supabase as any).from('pt_progress_photos').select('*')
          .eq('client_id', cl.id).order('photo_date', { ascending: false }).limit(20),
        (supabase as any).from('pt_workout_logs').select('completed_at')
          .eq('client_id', cl.id).order('completed_at', { ascending: false }).limit(100),
        (supabase as any).from('pt_notifications').select('*')
          .eq('client_id', cl.id).eq('is_read', false)
          .order('created_at', { ascending: false }).limit(10),
      ]);

      setSessions(sessRes.data || []);
      setMetrics(metRes.data || []);
      const progs = (progRes.data || []).map((p: any) => ({ ...p.pt_workout_programs, assignment_id: p.id })).filter(Boolean);
      setPrograms(progs);
      setPackages(pkgRes.data || []);
      setMessages(msgRes.data || []);
      setTrainers(trainerRes.data || []);
      setCompletedExercises(new Set((logRes.data || []).map((l: any) => `${l.workout_day_id}_${l.exercise_id}`)));
      setNotifications(notifRes.data || []);
      setProgressPhotos(photosRes.data || []);

      // Calculate workout streak (consecutive days with logs)
      const logDates = [...new Set((streakRes.data || []).map((l: any) => l.completed_at?.split('T')[0]))].sort().reverse();
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < logDates.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expected = expectedDate.toISOString().split('T')[0];
        if (logDates[i] === expected) streak++;
        else break;
      }
      setWorkoutStreak(streak);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!selectedProgramId || !client) return;
    const loadDays = async () => {
      const { data: days } = await (supabase as any).from('pt_workout_days')
        .select('*').eq('program_id', selectedProgramId).eq('shop_id', client.shop_id).order('sort_order').order('day_number');
      setWorkoutDays(days || []);
      if (days && days.length > 0) {
        const { data: exs } = await (supabase as any).from('pt_workout_day_exercises')
          .select('*, pt_exercises(name, muscle_group, equipment)')
          .eq('shop_id', client.shop_id).in('workout_day_id', days.map((d: any) => d.id)).order('sort_order');
        const grouped: Record<string, any[]> = {};
        (exs || []).forEach((e: any) => { if (!grouped[e.workout_day_id]) grouped[e.workout_day_id] = []; grouped[e.workout_day_id].push(e); });
        setDayExercises(grouped);
      }
    };
    loadDays();
  }, [selectedProgramId, client]);

  useEffect(() => {
    if (!client) return;
    const interval = setInterval(async () => {
      const { data } = await (supabase as any).from('pt_messages').select('*')
        .eq('client_id', client.id).order('created_at', { ascending: true }).limit(100);
      if (data) setMessages(data);
    }, 5000);
    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const logExerciseCompletion = async (dayId: string, exerciseId: string, programId: string) => {
    if (!client) return;
    const key = `${dayId}_${exerciseId}`;
    if (completedExercises.has(key)) return;
    try {
      const { error } = await (supabase as any).from('pt_workout_logs').insert({
        shop_id: client.shop_id, client_id: client.id, program_id: programId,
        workout_day_id: dayId, exercise_id: exerciseId,
        weight_used: logWeight ? parseFloat(logWeight) : null, completed_at: new Date().toISOString(),
      });
      if (error) throw error;
      setCompletedExercises(prev => new Set(prev).add(key));
      setLoggingExercise(null); setLogWeight('');
      toast({ title: 'Exercise completed! 💪' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const submitCheckIn = async () => {
    if (!client) return;
    setSubmittingCheckIn(true);
    try {
      const { error } = await (supabase as any).from('pt_check_ins').insert({
        client_id: client.id, shop_id: client.shop_id, check_in_date: new Date().toISOString().split('T')[0],
        weight: checkInForm.weight ? parseFloat(checkInForm.weight) : null,
        mood: checkInForm.mood, energy_level: checkInForm.energy_level[0],
        sleep_hours: checkInForm.sleep_hours ? parseFloat(checkInForm.sleep_hours) : null,
        workout_compliance: checkInForm.workout_compliance[0],
        soreness_level: checkInForm.soreness_level[0],
        pain_issues: checkInForm.pain_issues || null,
        notes: checkInForm.notes || null, status: 'submitted',
      });
      if (error) throw error;
      toast({ title: 'Check-in submitted! ✅' });
      setCheckInForm({ weight: '', mood: 'good', energy_level: [7], sleep_hours: '', notes: '', workout_compliance: [7], soreness_level: [3], pain_issues: '' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSubmittingCheckIn(false); }
  };

  const bookSession = async () => {
    if (!client || !bookingForm.session_date) return;
    setBookingSession(true);
    try {
      const { error } = await (supabase as any).from('pt_sessions').insert({
        client_id: client.id, shop_id: client.shop_id,
        session_date: bookingForm.session_date,
        duration_minutes: bookingForm.duration_minutes,
        session_type: bookingForm.session_type,
        trainer_id: bookingForm.trainer_id || null,
        status: 'scheduled',
      });
      if (error) throw error;
      toast({ title: 'Session booked! 📅' });
      setBookingForm({ session_date: '', duration_minutes: 60, session_type: 'personal_training', trainer_id: '' });
      // Refresh sessions
      const { data } = await (supabase as any).from('pt_sessions').select('id, session_date, duration_minutes, session_type, status, location')
        .eq('client_id', client.id).order('session_date', { ascending: false }).limit(20);
      if (data) setSessions(data);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setBookingSession(false); }
  };

  const sendMessage = async () => {
    if (!client || !currentUserId || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const { error } = await (supabase as any).from('pt_messages').insert({
        shop_id: client.shop_id, client_id: client.id, sender_id: currentUserId,
        content: messageText.trim(), message_type: 'text',
      });
      if (error) throw error;
      setMessageText('');
      const { data } = await (supabase as any).from('pt_messages').select('*')
        .eq('client_id', client.id).order('created_at', { ascending: true }).limit(100);
      if (data) setMessages(data);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSendingMessage(false); }
  };

  const cancelSession = async (sessionId: string) => {
    if (!client) return;
    setCancellingSession(sessionId);
    try {
      const { error } = await (supabase as any).from('pt_sessions').update({ status: 'canceled' }).eq('id', sessionId);
      if (error) throw error;
      toast({ title: 'Session cancelled' });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'canceled' } : s));
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setCancellingSession(null); }
  };

  const uploadProgressPhoto = async (file: File) => {
    if (!client) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${client.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('pt-progress-photos').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('pt-progress-photos').getPublicUrl(path);
      const { error: dbError } = await (supabase as any).from('pt_progress_photos').insert({
        client_id: client.id, shop_id: client.shop_id,
        photo_url: publicUrl, photo_date: new Date().toISOString().split('T')[0],
        category: 'progress',
      });
      if (dbError) throw dbError;
      toast({ title: 'Photo uploaded! 📸' });
      const { data } = await (supabase as any).from('pt_progress_photos').select('*')
        .eq('client_id', client.id).order('photo_date', { ascending: false }).limit(20);
      if (data) setProgressPhotos(data);
    } catch (e: any) { toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }); }
    finally { setUploadingPhoto(false); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/pt-portal/login'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

  const upcomingSessions = sessions.filter(s => new Date(s.session_date) >= new Date() && s.status === 'scheduled');
  const nextSession = upcomingSessions[0];
  const todayWorkout = programs.length > 0 ? programs[0] : null;
  const latestWeight = metrics.length > 0 ? metrics[0] : null;
  const trainerMessages = messages.filter((m: any) => m.sender_id !== currentUserId);
  const lastTrainerMsg = trainerMessages.length > 0 ? trainerMessages[trainerMessages.length - 1] : null;
  const chartData = [...metrics].reverse().map((m: any) => ({
    date: format(new Date(m.recorded_date), 'MMM d'),
    weight: m.weight_kg, bodyFat: m.body_fat_percent, waist: m.waist_cm,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">Fitness Portal</span>
              {client && <p className="text-xs text-muted-foreground">Welcome, {client.first_name}!</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)} className="relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
              {showNotifications && notifications.length > 0 && (
                <div className="absolute right-0 top-10 w-72 bg-background border rounded-lg shadow-xl z-50 p-2 space-y-1 max-h-60 overflow-auto">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer" onClick={async () => {
                      await (supabase as any).from('pt_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', n.id);
                      setNotifications(prev => prev.filter(p => p.id !== n.id));
                    }}>
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Client Dashboard Cards — spec: Today's Workout, Next Session, Progress Snapshot, Sessions Left, Weekly Check-In, Message From Trainer */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {/* scroll to workouts tab */}}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Dumbbell className="h-4 w-4 text-orange-500" /><p className="text-xs font-medium text-muted-foreground">Today's Workout</p></div>
              <p className="text-sm font-bold truncate">{todayWorkout ? todayWorkout.name : 'No program assigned'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-blue-500" /><p className="text-xs font-medium text-muted-foreground">Next Session</p></div>
              <p className="text-sm font-bold">{nextSession ? format(new Date(nextSession.session_date), 'MMM d, h:mm a') : 'None booked'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Activity className="h-4 w-4 text-emerald-500" /><p className="text-xs font-medium text-muted-foreground">Progress Snapshot</p></div>
              <p className="text-sm font-bold">{latestWeight ? `${latestWeight.weight_kg} kg` : 'No data'}</p>
              {latestWeight?.body_fat_percent && <p className="text-[10px] text-muted-foreground">{latestWeight.body_fat_percent}% body fat</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Package className="h-4 w-4 text-violet-500" /><p className="text-xs font-medium text-muted-foreground">Sessions Left</p></div>
              <p className="text-2xl font-bold">{packages.reduce((s: number, p: any) => s + (p.remaining_sessions || 0), 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><ClipboardCheck className="h-4 w-4 text-lime-500" /><p className="text-xs font-medium text-muted-foreground">Weekly Check-In</p></div>
              <p className="text-sm font-bold">{workoutStreak > 0 ? `${workoutStreak} day streak 🔥` : 'Submit today!'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><MessageSquare className="h-4 w-4 text-rose-500" /><p className="text-xs font-medium text-muted-foreground">Message From Trainer</p></div>
              <p className="text-xs truncate">{lastTrainerMsg ? lastTrainerMsg.content : 'No messages yet'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="workouts">
          <TabsList className="grid w-full grid-cols-5 sm:grid-cols-9">
            <TabsTrigger value="workouts" className="text-xs"><Dumbbell className="h-3 w-3 mr-1" />Workouts</TabsTrigger>
            <TabsTrigger value="health" className="text-xs"><HeartPulse className="h-3 w-3 mr-1" />Health</TabsTrigger>
            <TabsTrigger value="checkin" className="text-xs"><ClipboardCheck className="h-3 w-3 mr-1" />Check-In</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" />Messages</TabsTrigger>
            <TabsTrigger value="progress" className="text-xs"><Activity className="h-3 w-3 mr-1" />Progress</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Book</TabsTrigger>
            <TabsTrigger value="packages" className="text-xs"><Package className="h-3 w-3 mr-1" />Packages</TabsTrigger>
            <TabsTrigger value="nutrition" className="text-xs"><Utensils className="h-3 w-3 mr-1" />Nutrition</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs"><User className="h-3 w-3 mr-1" />Profile</TabsTrigger>
          </TabsList>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4 mt-4">
            {client && currentUserId && (
              <ClientPortalMedical clientId={client.id} shopId={client.shop_id} currentUserId={currentUserId} />
            )}
          </TabsContent>

          {/* Workouts Tab */}
          <TabsContent value="workouts" className="space-y-4 mt-4">
            {programs.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No active programs assigned yet.</CardContent></Card>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  {programs.map((p: any) => (
                    <Button key={p.id} size="sm" variant={selectedProgramId === p.id ? 'default' : 'outline'} onClick={() => setSelectedProgramId(p.id)}>{p.name}</Button>
                  ))}
                </div>
                {selectedProgramId && workoutDays.length > 0 && (
                  <div className="space-y-4">
                    {workoutDays.map((day: any) => {
                      const exercises = dayExercises[day.id] || [];
                      const completedCount = exercises.filter((ex: any) => completedExercises.has(`${day.id}_${ex.exercise_id}`)).length;
                      const allDone = exercises.length > 0 && completedCount === exercises.length;
                      return (
                        <Card key={day.id} className={allDone ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${allDone ? 'bg-green-500' : 'bg-gradient-to-br from-violet-500 to-purple-600'}`}>
                                  {allDone ? <CheckCircle2 className="h-4 w-4" /> : day.day_number}
                                </div>
                                <div><CardTitle className="text-sm">{day.name}</CardTitle>{day.focus_area && <p className="text-xs text-muted-foreground">{day.focus_area}</p>}</div>
                              </div>
                              <Badge variant={allDone ? 'default' : 'secondary'} className="text-xs">{completedCount}/{exercises.length}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {exercises.length === 0 ? <p className="text-xs text-muted-foreground py-2">No exercises</p> : (
                              <div className="space-y-2">
                                {exercises.map((ex: any) => {
                                  const isCompleted = completedExercises.has(`${day.id}_${ex.exercise_id}`);
                                  const isLogging = loggingExercise === `${day.id}_${ex.exercise_id}`;
                                  return (
                                    <div key={ex.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCompleted ? 'bg-green-100/50 dark:bg-green-950/30' : 'bg-muted/50'}`}>
                                      <Checkbox checked={isCompleted} disabled={isCompleted} onCheckedChange={() => { if (!isCompleted) setLoggingExercise(`${day.id}_${ex.exercise_id}`); }} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{ex.pt_exercises?.name}</p>
                                        <div className="flex gap-2 mt-0.5"><span className="text-xs text-muted-foreground">{ex.sets} × {ex.reps}</span>{ex.rest_seconds && <span className="text-xs text-muted-foreground">· {ex.rest_seconds}s rest</span>}</div>
                                      </div>
                                      {isLogging && (
                                        <div className="flex items-center gap-2">
                                          <Input type="number" placeholder="lbs" className="w-16 h-8 text-xs" value={logWeight} onChange={e => setLogWeight(e.target.value)} />
                                          <Button size="sm" className="h-8 text-xs" onClick={() => logExerciseCompletion(day.id, ex.exercise_id, selectedProgramId!)}>Done</Button>
                                        </div>
                                      )}
                                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {selectedProgramId && workoutDays.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No workout days set up yet.</CardContent></Card>}
                {!selectedProgramId && <Card><CardContent className="py-8 text-center text-muted-foreground">Select a program above</CardContent></Card>}
              </>
            )}
          </TabsContent>

          {/* Check-In Tab */}
          <TabsContent value="checkin" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-orange-500" />Weekly Check-In</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Weight (lbs)</Label><Input type="number" value={checkInForm.weight} onChange={e => setCheckInForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 175" /></div>
                  <div><Label>Sleep (hours)</Label><Input type="number" step="0.5" value={checkInForm.sleep_hours} onChange={e => setCheckInForm(f => ({ ...f, sleep_hours: e.target.value }))} placeholder="e.g. 7.5" /></div>
                </div>
                <div>
                  <Label>Mood</Label>
                  <Select value={checkInForm.mood} onValueChange={v => setCheckInForm(f => ({ ...f, mood: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="great">😄 Great</SelectItem>
                      <SelectItem value="good">🙂 Good</SelectItem>
                      <SelectItem value="okay">😐 Okay</SelectItem>
                      <SelectItem value="tired">😴 Tired</SelectItem>
                      <SelectItem value="stressed">😰 Stressed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Energy Level: {checkInForm.energy_level[0]}/10</Label><Slider value={checkInForm.energy_level} onValueChange={v => setCheckInForm(f => ({ ...f, energy_level: v }))} min={1} max={10} step={1} className="mt-2" /></div>
                <div><Label>Workout Compliance: {checkInForm.workout_compliance[0]}/10</Label><Slider value={checkInForm.workout_compliance} onValueChange={v => setCheckInForm(f => ({ ...f, workout_compliance: v }))} min={1} max={10} step={1} className="mt-2" /></div>
                <div><Label>Soreness Level: {checkInForm.soreness_level[0]}/10</Label><Slider value={checkInForm.soreness_level} onValueChange={v => setCheckInForm(f => ({ ...f, soreness_level: v }))} min={1} max={10} step={1} className="mt-2" /></div>
                <div><Label>Pain Issues</Label><Input value={checkInForm.pain_issues} onChange={e => setCheckInForm(f => ({ ...f, pain_issues: e.target.value }))} placeholder="Any pain or injuries?" /></div>
                <div><Label>Notes</Label><Textarea value={checkInForm.notes} onChange={e => setCheckInForm(f => ({ ...f, notes: e.target.value }))} placeholder="How was your week?" /></div>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white" disabled={submittingCheckIn} onClick={submitCheckIn}>
                  {submittingCheckIn ? 'Submitting...' : 'Submit Check-In'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-4">
            <Card className="flex flex-col h-[500px]">
              <CardHeader className="py-3 border-b"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Chat with Trainer</CardTitle></CardHeader>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello!</p>
                ) : messages.map((msg: any) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-2xl px-4 py-2', isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md')}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn('text-[10px] mt-1', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>{format(new Date(msg.created_at), 'h:mm a')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message..." className="flex-1" onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} />
                <Button size="icon" disabled={!messageText.trim() || sendingMessage} onClick={sendMessage} className="bg-gradient-to-r from-orange-500 to-red-600"><Send className="h-4 w-4" /></Button>
              </div>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4 mt-4">
            {/* Streak Card */}
            {workoutStreak > 0 && (
              <Card className="border-orange-500/30 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Flame className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workoutStreak} Day Streak! 🔥</p>
                    <p className="text-sm text-muted-foreground">Keep it up — consistency builds results!</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            {chartData.length >= 2 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Weight Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            {chartData.length >= 2 && chartData.some(d => d.bodyFat) && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Body Fat % Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="bodyFat" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={{ r: 4 }} name="Body Fat %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Progress Photos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4" />Progress Photos</CardTitle>
                  <Button size="sm" variant="outline" className="text-xs" disabled={uploadingPhoto} onClick={() => document.getElementById('photo-upload')?.click()}>
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                    Upload
                  </Button>
                  <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadProgressPhoto(e.target.files[0]); e.target.value = ''; }} />
                </div>
              </CardHeader>
              <CardContent>
                {progressPhotos.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No progress photos yet. Upload your first!</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {progressPhotos.map((photo: any) => (
                      <div key={photo.id} className="relative group">
                        <img src={photo.photo_url} alt="Progress" className="rounded-lg aspect-square object-cover w-full" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1.5 rounded-b-lg">
                          {format(new Date(photo.photo_date), 'MMM d, yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metrics History */}
            {metrics.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No metrics recorded yet.</CardContent></Card>
            ) : metrics.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <p className="font-medium mb-2">{format(new Date(m.recorded_date), 'MMM d, yyyy')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {m.weight_kg && <div><span className="text-muted-foreground text-xs">Weight</span><p className="font-medium">{m.weight_kg} kg</p></div>}
                    {m.body_fat_percent && <div><span className="text-muted-foreground text-xs">Body Fat</span><p className="font-medium">{m.body_fat_percent}%</p></div>}
                    {m.chest_cm && <div><span className="text-muted-foreground text-xs">Chest</span><p className="font-medium">{m.chest_cm} cm</p></div>}
                    {m.waist_cm && <div><span className="text-muted-foreground text-xs">Waist</span><p className="font-medium">{m.waist_cm} cm</p></div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Calendar / Booking Tab */}
          <TabsContent value="calendar" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-5 w-5 text-blue-500" />Book a Session</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Date & Time *</Label><Input type="datetime-local" value={bookingForm.session_date} onChange={e => setBookingForm(f => ({ ...f, session_date: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Duration (min)</Label><Input type="number" value={bookingForm.duration_minutes} onChange={e => setBookingForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={bookingForm.session_type} onValueChange={v => setBookingForm(f => ({ ...f, session_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal_training">Personal Training</SelectItem>
                        <SelectItem value="group_class">Group Class</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {trainers.length > 0 && (
                  <div>
                    <Label>Preferred Trainer</Label>
                    <Select value={bookingForm.trainer_id} onValueChange={v => setBookingForm(f => ({ ...f, trainer_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Any available" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any Available</SelectItem>
                        {trainers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white" disabled={!bookingForm.session_date || bookingSession} onClick={bookSession}>
                  {bookingSession ? 'Booking...' : 'Book Session'}
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming sessions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Your Sessions</h3>
              {sessions.length === 0 ? (
                <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">No sessions yet</CardContent></Card>
              ) : sessions.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{format(new Date(s.session_date), 'EEEE, MMM d')}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.session_date), 'h:mm a')} · {s.duration_minutes}min · {s.session_type?.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === 'scheduled' && new Date(s.session_date) > new Date() && (
                        <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" disabled={cancellingSession === s.id} onClick={() => cancelSession(s.id)}>
                          {cancellingSession === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}Cancel
                        </Button>
                      )}
                      <Badge variant={s.status === 'completed' ? 'default' : s.status === 'canceled' ? 'destructive' : 'secondary'}>{s.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-3 mt-4">
            {packages.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No active packages.</CardContent></Card>
            ) : packages.map((pkg: any) => (
              <Card key={pkg.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{pkg.pt_packages?.name}</h3>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">{pkg.remaining_sessions}</p><p className="text-xs text-muted-foreground">Sessions Left</p></div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">{pkg.pt_packages?.sessions_included || 0}</p><p className="text-xs text-muted-foreground">Total</p></div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center"><p className="text-lg font-bold">${pkg.pt_packages?.price || 0}</p><p className="text-xs text-muted-foreground">Price</p></div>
                  </div>
                  {pkg.end_date && <p className="text-xs text-muted-foreground mt-3">Expires: {format(new Date(pkg.end_date), 'MMM d, yyyy')}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Utensils className="h-5 w-5 text-green-500" />My Nutrition Plan</CardTitle></CardHeader>
              <CardContent>
                {(!client?.calorie_target && !client?.protein_target_g && !client?.meal_guidance) ? (
                  <p className="text-center text-muted-foreground py-8">Your trainer hasn't set up a nutrition plan yet. Check back soon!</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {client?.calorie_target && <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-2xl font-bold">{client.calorie_target}</p><p className="text-xs text-muted-foreground">Calories</p></div>}
                      {client?.protein_target_g && <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-2xl font-bold">{client.protein_target_g}g</p><p className="text-xs text-muted-foreground">Protein</p></div>}
                      {client?.carb_target_g && <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-2xl font-bold">{client.carb_target_g}g</p><p className="text-xs text-muted-foreground">Carbs</p></div>}
                      {client?.fat_target_g && <div className="p-3 rounded-lg bg-muted/50 text-center"><p className="text-2xl font-bold">{client.fat_target_g}g</p><p className="text-xs text-muted-foreground">Fat</p></div>}
                    </div>
                    {client?.hydration_target_ml && <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-center"><p className="text-lg font-bold">💧 {client.hydration_target_ml}ml</p><p className="text-xs text-muted-foreground">Daily Hydration Target</p></div>}
                    {client?.meal_guidance && <div><p className="text-xs font-medium text-muted-foreground mb-1">Meal Guidance</p><p className="text-sm bg-muted/30 p-3 rounded-lg">{client.meal_guidance}</p></div>}
                    {client?.supplement_notes && <div><p className="text-xs font-medium text-muted-foreground mb-1">Supplements</p><p className="text-sm bg-muted/30 p-3 rounded-lg">{client.supplement_notes}</p></div>}
                    {client?.food_habits && <div><p className="text-xs font-medium text-muted-foreground mb-1">Dietary Preferences</p><p className="text-sm bg-muted/30 p-3 rounded-lg">{client.food_habits}</p></div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-5 w-5 text-violet-500" />My Profile</CardTitle></CardHeader>
              <CardContent>
                {client && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{client.first_name} {client.last_name}</p></div>
                      <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{client.email}</p></div>
                      {client.phone && <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{client.phone}</p></div>}
                      {client.gender && <div><p className="text-xs text-muted-foreground">Sex</p><p className="font-medium capitalize">{client.gender}</p></div>}
                      {client.date_of_birth && <div><p className="text-xs text-muted-foreground">Date of Birth</p><p className="font-medium">{format(new Date(client.date_of_birth), 'MMM d, yyyy')}</p></div>}
                      {client.height_cm && <div><p className="text-xs text-muted-foreground">Height</p><p className="font-medium">{client.height_cm} cm</p></div>}
                      <div><p className="text-xs text-muted-foreground">Fitness Level</p><Badge variant="secondary">{client.fitness_level}</Badge></div>
                      <div><p className="text-xs text-muted-foreground">Membership</p><Badge variant={client.membership_status === 'active' ? 'default' : 'destructive'}>{client.membership_status}</Badge></div>
                    </div>
                    {client.goals && <div><p className="text-xs text-muted-foreground mb-1">Goals</p><p className="text-sm bg-muted/30 p-3 rounded-lg">{client.goals}</p></div>}
                    {client.injuries && <div><p className="text-xs text-muted-foreground mb-1">Injuries / Limitations</p><p className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-red-700 dark:text-red-400">{client.injuries}</p></div>}
                    {client.health_conditions && <div><p className="text-xs text-muted-foreground mb-1">Health Conditions</p><p className="text-sm bg-muted/30 p-3 rounded-lg">{client.health_conditions}</p></div>}
                    {client.emergency_contact && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                        <p className="text-xs font-medium text-amber-600 mb-1">Emergency Contact</p>
                        <p className="text-sm">{client.emergency_contact} {client.emergency_phone && `· ${client.emergency_phone}`}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
