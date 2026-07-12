import { detectLanguage } from "../../src/utils/language";

describe("Language Detection Utility (unit)", () => {
  it("detects Bangla ('bn') when text contains Bengali script", () => {
    const text = "মিরপুর ১০ নম্বরে আগুন লেগেছে, দ্রুত ফায়ার সার্ভিস দরকার।";
    expect(detectLanguage(text)).toBe("bn");
  });

  it("detects English ('en') for standard English sentences", () => {
    const text = "Large fire breaking out at Mirpur 10 market circle right now.";
    expect(detectLanguage(text)).toBe("en");
  });

  it("returns 'unknown' for numeric or symbol-only inputs without recognizable letters", () => {
    const text = "12345 67890 +880 !@#$%";
    expect(detectLanguage(text)).toBe("unknown");
  });
});
