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

export type PanelPersona = {
  session_id: string;
  persona_id: string;
  name?: string;
  type?: string;
  core_perspective?: string;
  profile?: string;
  position_summary?: string;
  round_1_response?: string;
  round_2_response?: string;
  round_3_response?: string;
  slack_slot?: number;
  rigidity?: number;
  imageReady?: boolean;
};

export type PanelSynthesis = {
  session_id: string;
  round_number: number;
  synthesis_text: string;
};

export type FileRow = {
  category?: string;
  id: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  summary: string | null;
  sizeBytes: number;
  createdAt: string | Date;
};
