export interface Character {
  id: string;
  name: string;
  aliases: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  description: string;
  personality: string;
  background: string;
  mbtiPrimary?: string;
  mbtiSecondary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterTimeline {
  id: string;
  characterId: string;
  chapterNumber: number;
  chapterTitle?: string;
  changes: CharacterChange[];
  notes?: string;
  createdAt: string;
}

export interface CharacterChange {
  type: 'title' | 'identity' | 'ability' | 'personality' | 'status' | 'other';
  field: string;
  oldValue: string;
  newValue: string;
  description?: string;
}

export interface CharacterRelationship {
  id: string;
  characterId1: string;
  characterId2: string;
  relationshipType: 'friend' | 'enemy' | 'family' | 'mentor' | 'lover' | 'rival' | 'subordinate' | 'ally' | 'neutral' | 'other';
  relationshipLabel: string;
  strength: number;
  status: 'active' | 'inactive' | 'ended';
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterHistory {
  id: string;
  characterId: string;
  version: number;
  snapshot: Character;
  changeReason: string;
  chapterNumber?: number;
  createdAt: string;
}

export interface CharacterAttribute {
  id: string;
  characterId: string;
  name: string;
  value: string;
  category: 'title' | 'identity' | 'ability' | 'status' | 'custom';
  displayOrder: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}