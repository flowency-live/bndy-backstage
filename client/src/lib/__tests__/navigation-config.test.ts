import { describe, it, expect } from "vitest";
import { navigationItems, builderNavigationItems, getNavigationItems } from "../navigation-config";

describe("navigation-config", () => {
  describe("navigationItems", () => {
    it("contains required artist navigation items", () => {
      const hrefs = navigationItems.map((item) => item.href);

      expect(hrefs).toContain("/dashboard");
      expect(hrefs).toContain("/calendar");
      expect(hrefs).toContain("/songs");
      expect(hrefs).toContain("/admin");
    });

    it("each item has required properties", () => {
      navigationItems.forEach((item) => {
        expect(item).toHaveProperty("icon");
        expect(item).toHaveProperty("label");
        expect(item).toHaveProperty("href");
        expect(item).toHaveProperty("color");
      });
    });
  });

  describe("builderNavigationItems", () => {
    it("contains builder dashboard item", () => {
      const hrefs = builderNavigationItems.map((item) => item.href);

      expect(hrefs).toContain("/builder");
    });

    it("builder dashboard has correct properties", () => {
      const builderDashboard = builderNavigationItems.find((item) => item.href === "/builder");

      expect(builderDashboard).toBeDefined();
      expect(builderDashboard?.label).toBe("Builder Dashboard");
      expect(builderDashboard?.icon).toBeDefined();
    });
  });

  describe("getNavigationItems", () => {
    it("returns only artist items when no builder context", () => {
      const items = getNavigationItems({ hasBuilders: false, isBuilderContext: false });

      const hrefs = items.map((item) => item.href);
      expect(hrefs).not.toContain("/builder");
      expect(hrefs).toContain("/dashboard");
    });

    it("returns artist items plus builder link when user has builders", () => {
      const items = getNavigationItems({ hasBuilders: true, isBuilderContext: false });

      const hrefs = items.map((item) => item.href);
      expect(hrefs).toContain("/builder");
      expect(hrefs).toContain("/dashboard");
    });

    it("returns builder items when in builder context", () => {
      const items = getNavigationItems({ hasBuilders: true, isBuilderContext: true });

      const hrefs = items.map((item) => item.href);
      expect(hrefs).toContain("/builder");
      // In builder context, artist-specific items should still be available for switching back
    });

    it("places builder item after artist dashboard when user has both", () => {
      const items = getNavigationItems({ hasBuilders: true, isBuilderContext: false });

      const dashboardIndex = items.findIndex((item) => item.href === "/dashboard");
      const builderIndex = items.findIndex((item) => item.href === "/builder");

      // Builder item should come after dashboard in the list
      expect(builderIndex).toBeGreaterThan(dashboardIndex);
    });
  });
});
