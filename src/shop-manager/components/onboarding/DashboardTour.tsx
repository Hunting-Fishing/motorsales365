import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export const DashboardTour: React.FC = () => {
  const [run, setRun] = useState(false);

  const steps: Step[] = [
    {
      target: '[data-tour="dashboard-stats"]',
      content: 'Live KPIs for your shop. These update automatically with your data.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-recent-work-orders"]',
      content: 'Quick access to your most recent work orders. Click to open details.',
    },
    {
      target: '[data-tour="dashboard-upcoming-appointments"]',
      content: 'See what appointments are coming up next.',
    },
    {
      target: '[data-tour="dashboard-today-schedule"]',
      content: "Today's schedule at a glance.",
    },
  ];

  useEffect(() => {
    const handler = () => setRun(true);
    window.addEventListener('start-dashboard-tour', handler as EventListener);
    return () => window.removeEventListener('start-dashboard-tour', handler as EventListener);
  }, []);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
      }}
      callback={handleCallback}
    />
  );
};
