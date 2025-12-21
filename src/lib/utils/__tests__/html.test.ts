/**
 * Tests for HTML utility functions
 */

import { stripHtml, getContentPreview } from "../html";
import { UI_CONFIG } from "@/config";

describe("HTML Utilities", () => {
  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      expect(stripHtml("<p>Hello world</p>")).toBe("Hello world");
      expect(stripHtml("<div><p>Test</p></div>")).toBe("Test");
    });

    it("should convert <br> tags to newlines", () => {
      expect(stripHtml("Line 1<br>Line 2")).toBe("Line 1\nLine 2");
      expect(stripHtml("Line 1<br/>Line 2")).toBe("Line 1\nLine 2");
      expect(stripHtml("Line 1<br />Line 2")).toBe("Line 1\nLine 2");
    });

    it("should convert closing </p> tags to double newlines", () => {
      expect(stripHtml("<p>Para 1</p><p>Para 2</p>")).toBe("Para 1\n\nPara 2");
    });

    it("should decode HTML entities", () => {
      expect(stripHtml("&lt;hello&gt;")).toBe("<hello>");
      expect(stripHtml("&amp; &quot;")).toBe('& "');
      expect(stripHtml("&#39;test&#39;")).toBe("'test'");
    });

    it("should trim whitespace", () => {
      expect(stripHtml("  <p>Test</p>  ")).toBe("Test");
    });

    it("should handle empty strings", () => {
      expect(stripHtml("")).toBe("");
    });

    it("should handle null/undefined by returning empty string", () => {
      expect(stripHtml(null as any)).toBe("");
      expect(stripHtml(undefined as any)).toBe("");
    });

    it("should handle complex HTML", () => {
      const html =
        '<div class="test"><p>Paragraph 1</p><p>Paragraph 2<br>With line break</p></div>';
      expect(stripHtml(html)).toBe(
        "Paragraph 1\n\nParagraph 2\nWith line break",
      );
    });

    it("should handle nested tags", () => {
      expect(stripHtml("<div><span><strong>Bold</strong></span></div>")).toBe(
        "Bold",
      );
    });

    it("should handle self-closing tags", () => {
      expect(stripHtml('Text<img src="test.jpg" />More text')).toBe(
        "TextMore text",
      );
    });
  });

  describe("getContentPreview", () => {
    it("should return plain text preview of HTML", () => {
      const html =
        "<p>This is a long paragraph with <strong>bold</strong> text</p>";
      const preview = getContentPreview(html, 20);
      expect(preview).toBe("This is a long parag");
      expect(preview.length).toBe(20);
    });

    it("should use default CONTENT_PREVIEW_LENGTH when not specified", () => {
      const html = "<p>" + "a".repeat(200) + "</p>";
      const preview = getContentPreview(html);
      expect(preview.length).toBeLessThanOrEqual(
        UI_CONFIG.CONTENT_PREVIEW_LENGTH,
      );
      expect(preview.length).toBe(UI_CONFIG.CONTENT_PREVIEW_LENGTH);
    });

    it("should handle HTML tags in preview", () => {
      const html = "<p>Hello <strong>world</strong>!</p>";
      const preview = getContentPreview(html, 10);
      expect(preview).toBe("Hello worl");
      expect(preview).not.toContain("<");
      expect(preview).not.toContain(">");
    });

    it("should handle empty HTML", () => {
      expect(getContentPreview("", 100)).toBe("");
      expect(getContentPreview("<p></p>", 100)).toBe("");
    });

    it("should handle HTML shorter than maxLength", () => {
      const html = "<p>Short text</p>";
      const preview = getContentPreview(html, 100);
      expect(preview).toBe("Short text");
    });

    it("should handle custom maxLength", () => {
      const html = "<p>" + "a".repeat(100) + "</p>";
      const preview = getContentPreview(html, 50);
      expect(preview.length).toBe(50);
    });

    it("should strip HTML before limiting length", () => {
      const html = "<p>" + "a".repeat(50) + "</p>";
      const preview = getContentPreview(html, 30);
      // Should be 30 'a' characters, not including HTML tags
      expect(preview).toBe("a".repeat(30));
      expect(preview.length).toBe(30);
    });
  });
});
