import { createContext, useContext } from 'react';
import type { MathsStage } from '@shared/maths';
import type { SupportLang } from '@shared/esl';

/** Where the learner is in Cambridge Maths, so games and Zuva's cards know the unit and help language. */
export interface MathsPlace { stage: MathsStage; unitId: string; signedIn: boolean; support: SupportLang }
export const MathsPlaceContext = createContext<MathsPlace | null>(null);
export const useMathsPlace = () => useContext(MathsPlaceContext);
