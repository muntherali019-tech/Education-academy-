import { describe, expect, it } from "vitest";
import { ALL_STAGES, isStageId, stageForAge, STAGE_IDS, STAGES } from "./stages";

describe("stages", () => {
  it("covers the four UK stages in order", () => {
    expect(STAGE_IDS).toEqual(["ks1", "ks2", "ks3", "he"]);
    expect(ALL_STAGES.map((stage) => stage.name)).toEqual([
      "Key Stage 1",
      "Key Stage 2",
      "Key Stage 3",
      "Higher Education",
    ]);
  });

  it("keys every stage by its own id", () => {
    for (const id of STAGE_IDS) {
      expect(STAGES[id].id).toBe(id);
    }
  });

  it("recognises valid stage ids", () => {
    expect(isStageId("ks2")).toBe(true);
    expect(isStageId("ks9")).toBe(false);
    expect(isStageId("")).toBe(false);
  });

  describe("stageForAge", () => {
    it("maps typical ages to stages", () => {
      expect(stageForAge(6)?.id).toBe("ks1");
      expect(stageForAge(9)?.id).toBe("ks2");
      expect(stageForAge(13)?.id).toBe("ks3");
      expect(stageForAge(20)?.id).toBe("he");
    });

    it("prefers the earlier stage where ranges overlap", () => {
      expect(stageForAge(7)?.id).toBe("ks1");
      expect(stageForAge(11)?.id).toBe("ks2");
    });

    it("leaves Higher Education open ended", () => {
      expect(stageForAge(65)?.id).toBe("he");
    });

    it("returns undefined for ages outside every range", () => {
      expect(stageForAge(3)).toBeUndefined();
      expect(stageForAge(15)).toBeUndefined();
    });
  });
});
