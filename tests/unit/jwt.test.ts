import { signAdminToken, verifyToken } from "../../src/utils/jwt";
import { ApiError } from "../../src/utils/ApiError";

describe("JWT Utilities (unit)", () => {
  it("signs and successfully verifies a valid admin payload roundtrip", () => {
    const token = signAdminToken({ sub: "admin@crisisdesk.ai", role: "admin" });
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.sub).toBe("admin@crisisdesk.ai");
    expect(decoded.role).toBe("admin");
  });

  it("throws a 401 ApiError when attempting to verify an invalid or tampered token string", () => {
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";
    expect(() => verifyToken(fakeToken)).toThrow(ApiError);
    expect(() => verifyToken(fakeToken)).toThrow("Unauthorized");
  });
});
