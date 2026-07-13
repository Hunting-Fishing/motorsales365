
import { EmailSequence, EmailSequenceAnalytics, EmailSequenceEnrollment } from "@/types/email";

export interface UseSequencesReturn {
  sequences: EmailSequence[];
  currentSequence: EmailSequence | null;
  analytics: EmailSequenceAnalytics | null;
  enrollments: EmailSequenceEnrollment[];
  loading: boolean;
  sequenceLoading: boolean;
  analyticsLoading: boolean;
  analyticsError?: Error | null;
  enrollmentsLoading: boolean;
  fetchSequences: () => Promise<EmailSequence[]>;
  fetchSequenceById: (id: string) => Promise<EmailSequence | null>;
  fetchSequenceAnalytics: (sequenceId?: string) => Promise<EmailSequenceAnalytics | null>;
  fetchCustomerEnrollments: (customerId: string) => Promise<EmailSequenceEnrollment[]>;
  createSequence: (sequence: Partial<EmailSequence>) => Promise<EmailSequence | null>;
  updateSequence: (id: string, sequence: Partial<EmailSequence>) => Promise<EmailSequence | null>;
  deleteSequence: (id: string) => Promise<boolean>;
  enrollCustomer: (sequenceId: string, customerId: string) => Promise<boolean>;
  pauseEnrollment: (enrollmentId: string) => Promise<boolean>;
  resumeEnrollment: (enrollmentId: string) => Promise<boolean>;
  cancelEnrollment: (enrollmentId: string) => Promise<boolean>;
  setCurrentSequence: React.Dispatch<React.SetStateAction<EmailSequence | null>>;
}
