import React from 'react';
export const LocalGameContext=React.createContext<any>(null);
export const useApp=()=>React.useContext(LocalGameContext);
