
import { useState } from 'react';

export const useChatDialogState = () => {
  const [chatName, setChatName] = useState('');
  const [chatType, setChatType] = useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Shift chat specific state
  const [isShiftChat, setIsShiftChat] = useState(false);
  const [shiftDate, setShiftDate] = useState<Date | undefined>(undefined);
  const [shiftName, setShiftName] = useState('');
  const [shiftTimeStart, setShiftTimeStart] = useState('08:00');
  const [shiftTimeEnd, setShiftTimeEnd] = useState('17:00');

  const addParticipant = (userId: string) => {
    if (!selectedParticipants.includes(userId)) {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const removeParticipant = (userId: string) => {
    setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
  };

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      removeParticipant(userId);
    } else {
      addParticipant(userId);
    }
  };

  const resetState = () => {
    setChatName('');
    setChatType("direct");
    setSearchQuery('');
    setSelectedParticipants([]);
    setIsShiftChat(false);
    setShiftDate(undefined);
    setShiftName('');
    setShiftTimeStart('08:00');
    setShiftTimeEnd('17:00');
  };

  return {
    chatName,
    setChatName,
    chatType,
    setChatType,
    searchQuery,
    setSearchQuery,
    selectedParticipants,
    addParticipant,
    removeParticipant,
    toggleParticipant,
    isShiftChat,
    setIsShiftChat,
    shiftDate,
    setShiftDate,
    shiftName,
    setShiftName,
    shiftTimeStart,
    setShiftTimeStart,
    shiftTimeEnd,
    setShiftTimeEnd,
    resetState
  };
};
