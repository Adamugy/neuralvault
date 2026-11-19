export interface Folder {
  id: string;
  name: string;
}

export interface Resource {
  id: string;
  type: 'link' | 'file';
  title: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  file?: File; // Store the actual file object
  folderId?: string; // Organize into folders
  tags: string[];
  notes: string;
  dateAdded: number;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  /** Model that wrote the answer (AI Tutor). */
  modelLabel?: string;
  /** Library changes the AI Tutor proposed; applied only when the person approves. */
  proposals?: ResourceUpdateProposal[];
}

export interface ResourceUpdateProposal {
  resourceId: string;
  resourceTitle: string;
  changes: { folderId?: string | null; tags?: string[]; notes?: string; completed?: boolean };
  folderName?: string | null;
  reason: string;
  status?: 'pending' | 'applying' | 'applied' | 'dismissed' | 'error';
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CHAT = 'CHAT',
  IMAGE_ANALYSIS = 'IMAGE_ANALYSIS',
  ACADEMIC_HELPER = 'ACADEMIC_HELPER',
  SETTINGS = 'SETTINGS',
}

export const DL_TAGS = [
  'Neural Networks',
  'NLP',
  'Computer Vision',
  'Reinforcement Learning',
  'Generative AI',
  'Transformers',
  'Optimization',
  'Research Papers',
  'Datasets'
];

// --- New Types for Settings & Management ---

export type PlanTier = 'free';

export interface UserProfile {
  name: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
  role: string;
  plan: PlanTier;
  emailVerified?: boolean;
  hasPasskey?: boolean;
  twoFactorEnabled?: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light'; // Kept for future, currently app is dark-only
  resourceLayout: 'grid' | 'list';
  compactMode: boolean;
  notifications: boolean;
  twoFactorEnabled: boolean;
}