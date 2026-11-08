import { createContext, useContext } from 'react';
import type { Accent, EslBandId, SupportLang } from '@shared/esl';
import type { Guest } from './store';

/** Where the learner is in the English course, so cards in Zuva's chat can start games in place. */
export interface EslPlace { week: number; band: EslBandId; accent: Accent; signedIn: boolean; guest: Guest | null; sessionId: string | null; support?: SupportLang }
export const EslPlaceContext = createContext<EslPlace | null>(null);
export const useEslPlace = () => useContext(EslPlaceContext);
