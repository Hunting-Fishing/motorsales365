
import React, { createContext } from 'react';
import { NotificationsContextProps } from './types';

export const NotificationsContext = createContext<NotificationsContextProps | undefined>(undefined);
