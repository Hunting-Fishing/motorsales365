
import React from 'react';

export const ChatLoading: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-[calc(100vh-200px)]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};
