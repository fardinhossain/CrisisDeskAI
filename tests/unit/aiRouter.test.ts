import { aiRouter } from "../../src/services/ai/ai-router.service";
import { CATEGORIES, URGENCIES } from "../../src/constants/enums";

describe("AI Router & Output Guard (unit)", () => {
  it("returns triaged category and clamped confidence when MOCK_AI=true", async () => {
    const result = await aiRouter.classify({
      text: "Large fire reported at Mirpur 10 market circle",
      language: "en",
    });
    expect(result.provider).toBeDefined();
    expect(CATEGORIES).toContain(result.category);
    expect(URGENCIES).toContain(result.urgency);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.summary).toBe("string");
  });

  it("returns null for embedding array when MOCK_AI=true", async () => {
    const embedding = await aiRouter.embed("Test incident description");
    expect(embedding).toBeNull();
  });
});
