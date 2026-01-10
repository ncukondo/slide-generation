import { describe, it, expect, beforeEach } from "vitest";
import { TemplateLoader } from "../../src/templates/loader";
import { TemplateEngine } from "../../src/templates/engine";
import * as path from "node:path";

describe("Diagram Templates", () => {
  let loader: TemplateLoader;
  let engine: TemplateEngine;

  beforeEach(async () => {
    loader = new TemplateLoader();
    engine = new TemplateEngine();
    const fixturesDir = path.resolve(__dirname, "../fixtures/templates");
    await loader.loadBuiltIn(fixturesDir);
  });

  describe("cycle-diagram", () => {
    it("should be loaded", () => {
      const template = loader.get("cycle-diagram");
      expect(template).toBeDefined();
      expect(template?.category).toBe("diagrams");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "PDCA Cycle",
        nodes: [
          { label: "Plan" },
          { label: "Do" },
          { label: "Check" },
          { label: "Act" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject too few nodes", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "Incomplete",
        nodes: [{ label: "Only one" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject too many nodes", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "Too many",
        nodes: [
          { label: "1" },
          { label: "2" },
          { label: "3" },
          { label: "4" },
          { label: "5" },
          { label: "6" },
          { label: "7" },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should validate node color pattern", () => {
      const result = loader.validateContent("cycle-diagram", {
        title: "With colors",
        nodes: [
          { label: "A", color: "#FF0000" },
          { label: "B", color: "invalid" },
          { label: "C" },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should render correctly", async () => {
      const template = loader.get("cycle-diagram")!;
      const content = {
        title: "Test Cycle",
        nodes: [
          { label: "A", color: "#FF0000" },
          { label: "B" },
          { label: "C" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Test Cycle");
      expect(result).toContain("cycle-container");
      expect(result).toContain("cycle-3");
      expect(result).toContain("--node-color: #FF0000");
      expect(result).toContain("A");
      expect(result).toContain("B");
      expect(result).toContain("C");
    });
  });

  describe("flow-chart", () => {
    it("should be loaded", () => {
      const template = loader.get("flow-chart");
      expect(template).toBeDefined();
      expect(template?.category).toBe("diagrams");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("flow-chart", {
        title: "Approval Flow",
        steps: [
          { label: "Start", type: "start" },
          { label: "Process", type: "process" },
          { label: "End", type: "end" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject too few steps", () => {
      const result = loader.validateContent("flow-chart", {
        title: "One step",
        steps: [{ label: "Only" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should validate step type enum", () => {
      const result = loader.validateContent("flow-chart", {
        title: "Invalid type",
        steps: [
          { label: "A", type: "invalid-type" },
          { label: "B" },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should render with direction", async () => {
      const template = loader.get("flow-chart")!;
      const content = {
        title: "Vertical Flow",
        direction: "vertical",
        steps: [
          { label: "Start", type: "start" },
          { label: "End", type: "end" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Vertical Flow");
      expect(result).toContain("flow-vertical");
      expect(result).toContain("flow-start");
      expect(result).toContain("flow-end");
    });

    it("should render branches for decision", async () => {
      const template = loader.get("flow-chart")!;
      const content = {
        title: "Decision Flow",
        steps: [
          { label: "Start" },
          {
            label: "Check",
            type: "decision",
            branches: [
              { condition: "Yes", target: "A" },
              { condition: "No", target: "B" },
            ],
          },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("flow-decision");
      expect(result).toContain("Yes: A");
      expect(result).toContain("No: B");
    });
  });

  describe("hierarchy", () => {
    it("should be loaded", () => {
      const template = loader.get("hierarchy");
      expect(template).toBeDefined();
      expect(template?.category).toBe("diagrams");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("hierarchy", {
        title: "Org Chart",
        root: {
          label: "CEO",
          children: [{ label: "CTO" }, { label: "CFO" }],
        },
      });
      expect(result.valid).toBe(true);
    });

    it("should validate minimal content", () => {
      const result = loader.validateContent("hierarchy", {
        title: "Simple",
        root: { label: "Root" },
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing root label", () => {
      const result = loader.validateContent("hierarchy", {
        title: "No label",
        root: {},
      });
      expect(result.valid).toBe(false);
    });

    it("should render nested structure", async () => {
      const template = loader.get("hierarchy")!;
      const content = {
        title: "Organization",
        root: {
          label: "CEO",
          color: "#1976D2",
          children: [
            { label: "CTO", color: "#388E3C" },
            { label: "CFO" },
          ],
        },
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Organization");
      expect(result).toContain("hierarchy-container");
      expect(result).toContain("CEO");
      expect(result).toContain("CTO");
      expect(result).toContain("CFO");
      expect(result).toContain("--node-color: #1976D2");
      expect(result).toContain("--node-color: #388E3C");
    });
  });

  describe("matrix", () => {
    it("should be loaded", () => {
      const template = loader.get("matrix");
      expect(template).toBeDefined();
      expect(template?.category).toBe("diagrams");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("matrix", {
        title: "Priority Matrix",
        quadrants: [
          { label: "Q1" },
          { label: "Q2" },
          { label: "Q3" },
          { label: "Q4" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject fewer than 4 quadrants", () => {
      const result = loader.validateContent("matrix", {
        title: "Incomplete",
        quadrants: [{ label: "Q1" }, { label: "Q2" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject more than 4 quadrants", () => {
      const result = loader.validateContent("matrix", {
        title: "Too many",
        quadrants: [
          { label: "Q1" },
          { label: "Q2" },
          { label: "Q3" },
          { label: "Q4" },
          { label: "Q5" },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should render with axes", async () => {
      const template = loader.get("matrix")!;
      const content = {
        title: "Eisenhower Matrix",
        xAxis: { label: "Urgency", low: "Low", high: "High" },
        yAxis: { label: "Importance", low: "Low", high: "High" },
        quadrants: [
          { label: "Plan", color: "#C8E6C9" },
          { label: "Do", color: "#FFCDD2" },
          { label: "Eliminate", color: "#F5F5F5" },
          { label: "Delegate", color: "#FFF9C4" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Eisenhower Matrix");
      expect(result).toContain("matrix-container");
      expect(result).toContain("matrix-x-axis");
      expect(result).toContain("matrix-y-axis");
      expect(result).toContain("Urgency");
      expect(result).toContain("Importance");
      expect(result).toContain("--quadrant-color: #C8E6C9");
    });

    it("should render quadrant items", async () => {
      const template = loader.get("matrix")!;
      const content = {
        title: "Matrix with items",
        quadrants: [
          { label: "Q1", items: ["Item A", "Item B"] },
          { label: "Q2" },
          { label: "Q3" },
          { label: "Q4", items: ["Item C"] },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Item A");
      expect(result).toContain("Item B");
      expect(result).toContain("Item C");
      expect(result).toContain("quadrant-items");
    });
  });

  describe("timeline", () => {
    it("should be loaded", () => {
      const template = loader.get("timeline");
      expect(template).toBeDefined();
      expect(template?.category).toBe("diagrams");
    });

    it("should validate valid content", () => {
      const result = loader.validateContent("timeline", {
        title: "Project Timeline",
        events: [
          { date: "Q1", label: "Planning" },
          { date: "Q2", label: "Development" },
          { date: "Q3", label: "Launch" },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject too few events", () => {
      const result = loader.validateContent("timeline", {
        title: "Short",
        events: [{ date: "2024", label: "Only one" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should reject events missing required fields", () => {
      const result = loader.validateContent("timeline", {
        title: "Missing",
        events: [{ date: "Q1" }, { label: "No date" }],
      });
      expect(result.valid).toBe(false);
    });

    it("should validate direction enum", () => {
      const result = loader.validateContent("timeline", {
        title: "Invalid",
        direction: "diagonal",
        events: [
          { date: "A", label: "1" },
          { date: "B", label: "2" },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it("should render horizontal timeline", async () => {
      const template = loader.get("timeline")!;
      const content = {
        title: "Project Plan",
        direction: "horizontal",
        events: [
          { date: "Q1", label: "Start", color: "#4CAF50" },
          { date: "Q2", label: "Middle" },
          { date: "Q3", label: "End", color: "#9C27B0" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("# Project Plan");
      expect(result).toContain("timeline-horizontal");
      expect(result).toContain("Q1");
      expect(result).toContain("Q2");
      expect(result).toContain("Q3");
      expect(result).toContain("--event-color: #4CAF50");
    });

    it("should render vertical timeline", async () => {
      const template = loader.get("timeline")!;
      const content = {
        title: "Vertical Timeline",
        direction: "vertical",
        events: [
          { date: "2020", label: "Event 1" },
          { date: "2021", label: "Event 2" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("timeline-vertical");
    });

    it("should render event descriptions", async () => {
      const template = loader.get("timeline")!;
      const content = {
        title: "With descriptions",
        events: [
          { date: "Phase 1", label: "Planning", description: "Gather requirements" },
          { date: "Phase 2", label: "Building", description: "Write code" },
        ],
      };

      const result = await engine.render(template.output, { content });
      expect(result).toContain("Gather requirements");
      expect(result).toContain("Write code");
      expect(result).toContain("event-description");
    });
  });

  describe("listByCategory", () => {
    it("should list all diagram templates", () => {
      const diagrams = loader.listByCategory("diagrams");
      expect(diagrams.length).toBe(5);

      const names = diagrams.map(t => t.name);
      expect(names).toContain("cycle-diagram");
      expect(names).toContain("flow-chart");
      expect(names).toContain("hierarchy");
      expect(names).toContain("matrix");
      expect(names).toContain("timeline");
    });
  });
});
