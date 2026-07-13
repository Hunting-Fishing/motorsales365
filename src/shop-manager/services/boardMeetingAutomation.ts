import { supabase } from "@/lib/supabase";
import { addDays, format, isAfter, isBefore } from "date-fns";

export interface BoardMeetingReminder {
  id: string;
  meetingId: string;
  memberEmail: string;
  reminderType: 'packet' | 'attendance' | 'followup';
  scheduledFor: string;
  sent: boolean;
}

export interface MeetingAction {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

// Board Meeting Automation Service
export class BoardMeetingAutomationService {
  
  // Schedule automatic reminders for upcoming board meetings
  static async scheduleAutomaticReminders() {
    try {
      const nextWeek = addDays(new Date(), 7);
      const twoWeeksOut = addDays(new Date(), 14);
      
      // Get upcoming board meetings
      const { data: meetings } = await supabase
        .from('board_meetings')
        .select(`
          *,
          board_members(email, first_name, last_name)
        `)
        .gte('meeting_date', new Date().toISOString())
        .lte('meeting_date', twoWeeksOut.toISOString());

      if (!meetings) return;

      for (const meeting of meetings) {
        const meetingDate = new Date(meeting.meeting_date);
        
        // Schedule packet reminder (1 week before)
        if (isAfter(meetingDate, nextWeek) && !meeting.meeting_packet_sent) {
          await this.scheduleReminder(meeting.id, 'packet', addDays(meetingDate, -7));
        }
        
        // Schedule attendance reminder (2 days before)
        await this.scheduleReminder(meeting.id, 'attendance', addDays(meetingDate, -2));
        
        // Schedule follow-up reminder (1 day after)
        await this.scheduleReminder(meeting.id, 'followup', addDays(meetingDate, 1));
      }
      
      console.log(`Scheduled reminders for ${meetings.length} board meetings`);
    } catch (error) {
      console.error("Error scheduling board meeting reminders:", error);
    }
  }

  // Schedule a specific reminder
  static async scheduleReminder(
    meetingId: string, 
    type: 'packet' | 'attendance' | 'followup', 
    scheduledFor: Date
  ) {
    // Get board members for this meeting
    const { data: meeting } = await supabase
      .from('board_meetings')
      .select(`
        *
      `)
      .eq('id', meetingId)
      .single();

    if (!meeting) return;

    // Get board members separately
    const { data: boardMembers } = await supabase
      .from('board_members')
      .select('id, email, first_name, last_name')
      .eq('shop_id', (meeting as any).shop_id);

    if (!boardMembers) return;

    // Create reminder records
    const reminders = boardMembers.map((member: any) => ({
      meeting_id: meetingId,
      member_email: member.email,
      reminder_type: type,
      scheduled_for: scheduledFor.toISOString(),
      sent: false
    }));

    await supabase
      .from('board_meeting_reminders')
      .insert(reminders);
  }

  // Process due reminders
  static async processDueReminders() {
    try {
      const now = new Date();
      
      // Get reminders that are due
      const { data: dueReminders } = await supabase
        .from('board_meeting_reminders')
        .select(`
          *,
          board_meetings(
            meeting_date,
            meeting_type,
            location,
            agenda_items
          )
        `)
        .lte('scheduled_for', now.toISOString())
        .eq('sent', false);

      if (!dueReminders) return;

      for (const reminder of dueReminders) {
        await this.sendReminder(reminder);
        
        // Mark as sent
        await supabase
          .from('board_meeting_reminders')
          .update({ sent: true, sent_at: now.toISOString() })
          .eq('id', reminder.id);
      }
      
      console.log(`Processed ${dueReminders.length} due reminders`);
    } catch (error) {
      console.error("Error processing due reminders:", error);
    }
  }

  // Send individual reminder
  static async sendReminder(reminder: any) {
    const meeting = reminder.board_meetings;
    const meetingDate = format(new Date(meeting.meeting_date), 'PPP');
    
    let subject: string;
    let content: string;

    switch (reminder.reminder_type) {
      case 'packet':
        subject = `Board Meeting Packet - ${meetingDate}`;
        content = `
          Dear Board Member,
          
          The board meeting packet for our upcoming meeting on ${meetingDate} is now available.
          Please review all materials prior to the meeting.
          
          Meeting Details:
          - Date: ${meetingDate}
          - Location: ${meeting.location || 'TBD'}
          - Type: ${meeting.meeting_type}
          
          Best regards,
          Board Administration
        `;
        break;
        
      case 'attendance':
        subject = `Reminder: Board Meeting Tomorrow - ${meetingDate}`;
        content = `
          Dear Board Member,
          
          This is a friendly reminder about our board meeting tomorrow, ${meetingDate}.
          
          Please confirm your attendance and let us know if you cannot make it.
          
          Meeting Details:
          - Date: ${meetingDate}
          - Location: ${meeting.location || 'TBD'}
          - Type: ${meeting.meeting_type}
          
          See you there!
          Board Administration
        `;
        break;
        
      case 'followup':
        subject = `Board Meeting Follow-up - Action Items`;
        content = `
          Dear Board Member,
          
          Thank you for attending our board meeting yesterday. Please find below any action items assigned to you.
          
          If you have any questions about your assignments, please don't hesitate to reach out.
          
          Best regards,
          Board Administration
        `;
        break;
    }

    // Call the notification email edge function
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        to: reminder.member_email,
        subject,
        content,
        type: 'board_meeting'
      }
    });

    if (error) {
      console.error("Error sending reminder email:", error);
    }
  }

  // Auto-generate meeting agenda based on previous meetings and pending items
  static async generateAgenda(meetingId: string) {
    try {
      // Get previous meeting for reference
      const { data: previousMeeting } = await supabase
        .from('board_meetings')
        .select('*')
        .lt('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: false })
        .limit(1)
        .single();

      // Get pending action items
      const { data: pendingActions } = await supabase
        .from('board_meeting_actions')
        .select('*')
        .neq('status', 'completed');

      // Standard agenda template
      const standardAgenda = [
        { item: "Call to Order", duration: 5 },
        { item: "Roll Call", duration: 5 },
        { item: "Approval of Previous Minutes", duration: 10 },
        { item: "Executive Director Report", duration: 20 },
        { item: "Financial Report", duration: 15 },
        { item: "Committee Reports", duration: 30 },
        { item: "Old Business", duration: 20 },
        { item: "New Business", duration: 30 },
        { item: "Action Items Review", duration: 10 },
        { item: "Next Meeting Date", duration: 5 },
        { item: "Adjournment", duration: 5 }
      ];

      // Add pending action items to old business
      if (pendingActions && pendingActions.length > 0) {
        const actionItemsAgenda = pendingActions.map(action => ({
          item: `Follow-up: ${action.description}`,
          duration: 10,
          assignee: action.assigned_to
        }));

        // Insert after "Old Business"
        const oldBusinessIndex = standardAgenda.findIndex(item => item.item === "Old Business");
        standardAgenda.splice(oldBusinessIndex + 1, 0, ...actionItemsAgenda);
      }

      // Update meeting with generated agenda
      await supabase
        .from('board_meetings')
        .update({ 
          agenda_items: standardAgenda,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      return standardAgenda;
    } catch (error) {
      console.error("Error generating agenda:", error);
      return [];
    }
  }

  // Track action items from meetings
  static async createActionItems(meetingId: string, actionItems: MeetingAction[]) {
    try {
      const formattedActions = actionItems.map(action => ({
        assigned_to: action.assignedTo,
        due_date: action.dueDate,
        description: action.description,
        status: action.status as any,
        priority: action.priority as any,
        meeting_id: meetingId,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('board_meeting_actions')
        .insert(formattedActions as any);

      if (error) {
        console.error("Error creating action items:", error);
      }
    } catch (error) {
      console.error("Error creating action items:", error);
    }
  }

  // Generate post-meeting summary
  static async generateMeetingSummary(meetingId: string) {
    try {
      const { data: meeting } = await supabase
        .from('board_meetings')
        .select(`
          *,
          board_meeting_actions(*)
        `)
        .eq('id', meetingId)
        .single();

      if (!meeting) return null;

      const summary = {
        meetingDate: format(new Date(meeting.meeting_date), 'PPP'),
        attendees: Array.isArray(meeting.attendees) ? meeting.attendees.length : 0,
        absentees: Array.isArray(meeting.absent_members) ? meeting.absent_members.length : 0,
        quorumMet: meeting.quorum_met,
        actionItems: Array.isArray(meeting.board_meeting_actions) ? meeting.board_meeting_actions.length : 0,
        votesTaken: Array.isArray(meeting.votes_taken) ? meeting.votes_taken.length : 0,
        nextMeetingDate: meeting.next_meeting_date ? 
          format(new Date(meeting.next_meeting_date), 'PPP') : 'TBD'
      };

      return summary;
    } catch (error) {
      console.error("Error generating meeting summary:", error);
      return null;
    }
  }

  // Check for overdue action items
  static async checkOverdueActions() {
    try {
      const { data: overdueActions } = await supabase
        .from('board_meeting_actions')
        .select('*')
        .lt('due_date', new Date().toISOString())
        .neq('status', 'completed');

      if (!overdueActions || overdueActions.length === 0) return;

      // Send reminders for overdue actions
      for (const action of overdueActions) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: action.assigned_to,
            subject: `Overdue Action Item: ${action.description}`,
            content: `
              Dear Board Member,
              
              You have an overdue action item from a recent board meeting:
              
              Action: ${action.description}
              Due Date: ${format(new Date(action.due_date), 'PPP')}
              Priority: ${action.priority}
              
              Please update the status or reach out if you need assistance.
              
              Best regards,
              Board Administration
            `,
            type: 'action_item_reminder'
          }
        });
      }

      console.log(`Sent reminders for ${overdueActions.length} overdue action items`);
    } catch (error) {
      console.error("Error checking overdue actions:", error);
    }
  }
}

// Export helper functions
export const scheduleAutomaticReminders = BoardMeetingAutomationService.scheduleAutomaticReminders;
export const processDueReminders = BoardMeetingAutomationService.processDueReminders;
export const generateAgenda = BoardMeetingAutomationService.generateAgenda;
export const createActionItems = BoardMeetingAutomationService.createActionItems;
export const generateMeetingSummary = BoardMeetingAutomationService.generateMeetingSummary;
export const checkOverdueActions = BoardMeetingAutomationService.checkOverdueActions;