import { CargoItem, MathProblem, TaskStage } from '../types/game';

export const CARGO_TYPES: CargoItem[] = [
  { name: 'Teddy Bears', emoji: '🧸', color: 0xf59e0b, colorCss: 'bg-amber-400' },
  { name: 'Sweet Apples', emoji: '🍎', color: 0xef4444, colorCss: 'bg-red-500' },
  { name: 'Toy Robots', emoji: '🤖', color: 0x3b82f6, colorCss: 'bg-blue-500' },
  { name: 'Bicycles', emoji: '🚲', color: 0x10b981, colorCss: 'bg-emerald-500' },
  { name: 'Solar Panels', emoji: '☀️', color: 0xfbbf24, colorCss: 'bg-yellow-400' },
  { name: 'Tropical Pineapples', emoji: '🍍', color: 0xa855f7, colorCss: 'bg-purple-500' },
  { name: 'Paint Buckets', emoji: '🎨', color: 0xec4899, colorCss: 'bg-pink-500' },
  { name: 'Soccer Balls', emoji: '⚽', color: 0x14b8a6, colorCss: 'bg-teal-500' },
];

function generateOptions(target: number, altGuesses: number[]): number[] {
  const options = new Set<number>([target]);
  altGuesses.forEach((g) => {
    if (g > 0 && g !== target && options.size < 4) {
      options.add(g);
    }
  });

  const offsets = [1, -1, 2, -2, 3, -3, 5, -5];
  for (const off of offsets) {
    if (options.size >= 4) break;
    const val = target + off;
    if (val > 0 && val !== target) {
      options.add(val);
    }
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
}

export function generateProblem(stage: TaskStage, round: number = 1): MathProblem {
  const cargo = CARGO_TYPES[(round - 1) % CARGO_TYPES.length];

  if (stage === 'godown') {
    // Stage 1: Godown to Truck (Multiplication Arrays)
    const multipliers = [
      { a: 3, b: 4 }, { a: 4, b: 3 }, { a: 2, b: 5 },
      { a: 5, b: 3 }, { a: 4, b: 4 }, { a: 3, b: 6 },
      { a: 6, b: 2 }, { a: 5, b: 4 }, { a: 2, b: 8 }
    ];
    const pair = multipliers[(round - 1) % multipliers.length];
    const total = pair.a * pair.b;

    return {
      id: `godown-${round}-${Date.now()}`,
      stage: 'godown',
      stageBadge: 'Step 1: Godown ➔ Truck',
      title: 'Godown Warehouse: Load the Truck',
      storyPrompt: `Pack the ${cargo.name} from the godown warehouse onto the cargo truck!`,
      cargo,
      operation: 'multiplication',
      factorA: pair.a,
      factorB: pair.b,
      targetAnswer: total,
      equationDisplay: `${pair.a} × ${pair.b} = ?`,
      questionText: `The godown has ${pair.a} pallets. Each pallet has ${pair.b} boxes of ${cargo.name}. How many boxes in total to load onto the truck?`,
      options: generateOptions(total, [pair.a + pair.b, total - pair.b, total + pair.a]),
      hint: `Count ${pair.a} groups of ${pair.b}: ${Array.from({ length: pair.a }, (_, i) => (i + 1) * pair.b).join(', ')} boxes!`,
      arrayRows: pair.a,
      arrayCols: pair.b,
    };
  }

  if (stage === 'station') {
    // Stage 2: Railway Station - Truck to Train (Equal Sharing / Division)
    const divisionProblems = [
      { total: 12, groups: 3, perGroup: 4 },
      { total: 15, groups: 3, perGroup: 5 },
      { total: 16, groups: 4, perGroup: 4 },
      { total: 18, groups: 3, perGroup: 6 },
      { total: 20, groups: 4, perGroup: 5 },
      { total: 24, groups: 4, perGroup: 6 },
      { total: 20, groups: 5, perGroup: 4 },
    ];
    const p = divisionProblems[(round - 1) % divisionProblems.length];

    return {
      id: `station-${round}-${Date.now()}`,
      stage: 'station',
      stageBadge: 'Step 2: Truck ➔ Train',
      title: 'Railway Station: Truck to Train',
      storyPrompt: `The truck arrived at the railway station! Move the items from the truck into the train wagons.`,
      cargo,
      operation: 'division',
      factorA: p.total,
      factorB: p.groups,
      targetAnswer: p.perGroup,
      equationDisplay: `${p.total} ÷ ${p.groups} = ?`,
      questionText: `We have ${p.total} crates on the truck to move equally into ${p.groups} train wagons. How many crates in each wagon?`,
      options: generateOptions(p.perGroup, [p.perGroup + 1, p.perGroup - 1, p.groups, p.total - p.groups]),
      hint: `Share ${p.total} equally into ${p.groups} wagons. What number times ${p.groups} equals ${p.total}?`,
      arrayRows: p.groups,
      arrayCols: p.perGroup,
    };
  }

  if (stage === 'forklift') {
    // Stage 3: Freight Yard - Train to Container via Forklift
    const forkliftTrips = [
      { total: 24, perTrip: 4, trips: 6 },
      { total: 20, perTrip: 4, trips: 5 },
      { total: 18, perTrip: 3, trips: 6 },
      { total: 30, perTrip: 5, trips: 6 },
      { total: 28, perTrip: 4, trips: 7 },
      { total: 35, perTrip: 5, trips: 7 },
    ];
    const f = forkliftTrips[(round - 1) % forkliftTrips.length];

    return {
      id: `forklift-${round}-${Date.now()}`,
      stage: 'forklift',
      stageBadge: 'Step 3: Train ➔ Container (Forklift)',
      title: 'Freight Yard: Train to Container',
      storyPrompt: `The train arrived! The forklift needs to unload the train and pack the big shipping container.`,
      cargo,
      operation: 'division',
      factorA: f.total,
      factorB: f.perTrip,
      targetAnswer: f.trips,
      equationDisplay: `${f.total} ÷ ${f.perTrip} = ?`,
      questionText: `We have ${f.total} boxes in the train. The forklift carries ${f.perTrip} boxes on each trip into the shipping container. How many trips will it take?`,
      options: generateOptions(f.trips, [f.trips + 1, f.trips - 1, f.perTrip, f.trips + 2]),
      hint: `Count by ${f.perTrip}s up to ${f.total}: ${Array.from({ length: f.trips }, (_, i) => (i + 1) * f.perTrip).join(', ')} trips!`,
      arrayRows: f.trips,
      arrayCols: f.perTrip,
    };
  }

  // Stage 4: Harbor Crane - Container to Ship
  const harborProblems = [
    { rows: 4, cols: 6, total: 24 },
    { rows: 5, cols: 5, total: 25 },
    { rows: 3, cols: 8, total: 24 },
    { rows: 6, cols: 4, total: 24 },
    { rows: 4, cols: 7, total: 28 },
    { rows: 5, cols: 6, total: 30 },
  ];
  const hp = harborProblems[(round - 1) % harborProblems.length];

  return {
    id: `harbor-${round}-${Date.now()}`,
    stage: 'harbor',
    stageBadge: 'Step 4: Container ➔ Cargo Ship',
    title: 'Harbor Quay: Container to Ship',
    storyPrompt: `The container is ready! Operate the giant crane to hoist and load it into the overseas cargo vessel.`,
    cargo,
    operation: 'multiplication',
    factorA: hp.rows,
    factorB: hp.cols,
    targetAnswer: hp.total,
    equationDisplay: `${hp.rows} × ${hp.cols} = ?`,
    questionText: `The ship's hold has ${hp.rows} container bays. Each bay holds ${hp.cols} large shipping containers. How many containers fit in total?`,
    options: generateOptions(hp.total, [hp.rows + hp.cols, hp.total - hp.cols, hp.total + hp.rows]),
    hint: `Multiply ${hp.rows} bays × ${hp.cols} containers = ${hp.total} total containers!`,
    arrayRows: hp.rows,
    arrayCols: hp.cols,
  };
}
