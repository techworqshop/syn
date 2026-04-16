export type Message = {
  id: string;
  sessionId: string;
  role: string;
  personaSlot: number | null;
  personaName: string | null;
  content: string;
  roundNumber: number | null;
  metadata: unknown;
  createdAt: string | Date;
};

export type SessionRow = {
  id: string;
  userId: string;
  title: string;
  problemBrief: string | null;
  status: string;
  rigidityScore: number;
  personaCount: number;
  currentRound: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type AudienceMessage = {
  id: string;
  sessionId: string;
  personaSlot: number;
  role: string;
  content: string;
  createdAt: string | Date;
};

export const PERSONA_NAMES = ["", "Alpha", "Beta", "Gamma", "Sigma", "Omega"];
