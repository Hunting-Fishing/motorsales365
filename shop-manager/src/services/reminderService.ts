
// Re-export all reminder services from the centralized location
export * from './reminders/reminderQueries';
export * from './reminders/reminderMutations';
export * from './reminders/reminderNotifications';

// Additional helper functions if needed
export { 
  getAllReminders,
  getCustomerReminders,
  getVehicleReminders,
  getUpcomingReminders,
  getOverdueReminders,
  getTodaysReminders
} from './reminders/reminderQueries';

export {
  createReminder,
  updateReminder,
  completeReminder,
  deleteReminder
} from './reminders/reminderMutations';

export {
  sendReminderNotifications
} from './reminders/reminderNotifications';

// Helper function for updating reminder status
export const updateReminderStatus = async (
  reminderId: string, 
  status: 'pending' | 'completed' | 'overdue' | 'cancelled',
  notes?: string
) => {
  const { updateReminder } = await import('./reminders/reminderMutations');
  return updateReminder({ id: reminderId, status, notes });
};
