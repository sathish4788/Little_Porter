export type TaskStage = 'godown' | 'station' | 'forklift' | 'harbor';

export interface CargoItem {
  name: string;
  emoji: string;
  color: number; // Hex color for 3D boxes
  colorCss: string;
}

export interface MathProblem {
  id: string;
  stage: TaskStage;
  title: string;
  stageBadge: string;
  storyPrompt: string;
  cargo: CargoItem;
  operation: 'multiplication' | 'division' | 'table';
  factorA: number;
  factorB: number;
  targetAnswer: number;
  equationDisplay: string;
  questionText: string;
  options: number[];
  hint: string;
  arrayRows: number;
  arrayCols: number;
}

export interface PlayerProgress {
  stars: number;
  completedTasks: number;
  streak: number;
  totalBoxesShipped: number;
  level: number;
}
