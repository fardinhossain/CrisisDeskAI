import { cosine, jaccard, tokenize } from "../../src/utils/similarity";

describe("Similarity Utilities (unit)", () => {
  describe("cosine()", () => {
    it("returns 1 for identical embedding vectors", () => {
      const vec = [0.1, 0.5, -0.3, 0.8];
      expect(cosine(vec, vec)).toBeCloseTo(1, 4);
    });

    it("returns 0 for orthogonal vectors", () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      expect(cosine(v1, v2)).toBeCloseTo(0, 4);
    });

    it("returns 0 if either vector has length 0 or lengths differ", () => {
      expect(cosine([], [1, 2])).toBe(0);
      expect(cosine([1, 2], [1, 2, 3])).toBe(0);
    });
  });

  describe("tokenize()", () => {
    it("preserves Bangla characters correctly while normalizing case and punctuation", () => {
      const text = "মিরপুর ১০ নম্বরে আগুন লেগেছে! Fire in Mirpur 10 market.";
      const tokens = tokenize(text);
      expect(tokens).toContain("মিরপুর");
      expect(tokens).toContain("আগুন");
      expect(tokens).toContain("fire");
      expect(tokens).toContain("mirpur");
    });
  });

  describe("jaccard()", () => {
    it("calculates intersection over union score correctly for known overlapping tokens", () => {
      const s1 = "Large fire at Mirpur 10 market";
      const s2 = "Massive fire broken out in Mirpur 10 market";
      const score = jaccard(s1, s2);
      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it("returns 0 when two texts share no words", () => {
      expect(jaccard("hello world", "foo bar baz")).toBe(0);
    });
  });
});
