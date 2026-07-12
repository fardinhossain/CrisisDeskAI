import {
  createReportSchema,
  updateStatusSchema,
  listReportsQuerySchema,
} from "../../src/validators/report.validator";

describe("Validators (unit)", () => {
  describe("createReportSchema", () => {
    it("successfully validates when description and location are provided", () => {
      const input = {
        description: "Fire incident in market",
        location: "Mirpur 10, Dhaka",
        contact: "+8801712345678",
      };
      const res = createReportSchema.safeParse(input);
      expect(res.success).toBe(true);
    });

    it("rejects when description is empty or missing", () => {
      const input = { description: "", location: "Mirpur 10" };
      const res = createReportSchema.safeParse(input);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message.toLowerCase()).toContain("required");
      }
    });

    it("rejects when location is missing", () => {
      const input = { description: "Valid description of incident" };
      const res = createReportSchema.safeParse(input);
      expect(res.success).toBe(false);
    });
  });

  describe("updateStatusSchema", () => {
    it("accepts valid domain status enum values", () => {
      const res = updateStatusSchema.safeParse({ status: "assigned" });
      expect(res.success).toBe(true);
    });

    it("rejects invalid status values outside the domain enum", () => {
      const res = updateStatusSchema.safeParse({ status: "super_urgent_invalid" });
      expect(res.success).toBe(false);
    });
  });

  describe("listReportsQuerySchema", () => {
    it("coerces string page and limit parameters to integers with correct defaults", () => {
      const res = listReportsQuerySchema.safeParse({ page: "2", limit: "15" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.page).toBe(2);
        expect(res.data.limit).toBe(15);
      }
    });

    it("defaults to page=1 and limit=20 if query params are omitted", () => {
      const res = listReportsQuerySchema.safeParse({});
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.page).toBe(1);
        expect(res.data.limit).toBe(20);
      }
    });
  });
});
