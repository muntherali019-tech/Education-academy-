export const STAGE_IDS = ["ks1", "ks2", "ks3", "he"] as const;

export type StageId = (typeof STAGE_IDS)[number];

export interface Stage {
  id: StageId;
  name: string;
  /** Inclusive lower bound of the typical age range for this stage. */
  minAge: number;
  /** Inclusive upper bound, or null for Higher Education which is open ended. */
  maxAge: number | null;
}

export const STAGES: Record<StageId, Stage> = {
  ks1: { id: "ks1", name: "Key Stage 1", minAge: 5, maxAge: 7 },
  ks2: { id: "ks2", name: "Key Stage 2", minAge: 7, maxAge: 11 },
  ks3: { id: "ks3", name: "Key Stage 3", minAge: 11, maxAge: 14 },
  he: { id: "he", name: "Higher Education", minAge: 16, maxAge: null },
};

export const ALL_STAGES: Stage[] = STAGE_IDS.map((id) => STAGES[id]);

export function isStageId(value: string): value is StageId {
  return (STAGE_IDS as readonly string[]).includes(value);
}

/**
 * Suggest a stage for a learner's age. Ranges overlap at the boundaries (a
 * 7 year old sits in both KS1 and KS2), so the earliest matching stage wins.
 */
export function stageForAge(age: number): Stage | undefined {
  return ALL_STAGES.find(
    (stage) => age >= stage.minAge && (stage.maxAge === null || age <= stage.maxAge),
  );
}
