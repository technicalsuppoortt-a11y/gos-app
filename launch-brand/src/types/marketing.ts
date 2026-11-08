export interface MarketingQuestion {
  key: string;
  q: string;
  type: 'chips' | 'text';
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export interface MarketingTaskItem {
  id: string;
  text: string;
  done: boolean;
  section?: string;
  note?: string;
}

export interface StageProposalItem {
  title: string;
  desc: string;
}

export interface TaskRule {
  id: string;
  text: string;
  section: string;
  conditionType: 'always' | 'equals';
  questionKey?: string;
  expectedAnswer?: string;
  note?: string;
  disabled?: boolean;
}

export interface StageConfig {
  stageNumber: number;
  title: string;
  subtitle: string;
  expertTitle: string;
  expertRole: string;
  questions: MarketingQuestion[];
  taskRules?: TaskRule[];
}

export interface StagesConfigDoc {
  stages: Record<number, StageConfig>;
}

export interface UserMarketingProgress {
  currentUnlockedStage: number; // 1, 2, 3
  stage1Answers: Record<string, string>;
  stage1Tasks: MarketingTaskItem[];
  stage2Answers: Record<string, string>;
  stage2Tasks: MarketingTaskItem[];
  stage3Answers?: Record<string, string>;
  stage3Tasks?: MarketingTaskItem[];
  stage3Metrics?: {
    cpl?: number;
    ctr?: number;
    freq?: number;
    analysis?: string[];
  };
  updatedAt?: unknown;
}
