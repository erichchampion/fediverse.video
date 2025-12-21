/**
 * LinkCard Component Tests
 * Tests for link preview cards in posts
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { LinkCard } from "../LinkCard";
import type { Card } from "@types";
import { Linking } from "react-native";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      card: "#F5F5F5",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
      primary: "#007AFF",
    },
  }),
}));

// Spy on Linking.openURL
const linkingSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true);

const mockCard: Card = {
  url: "https://example.com/article",
  title: "Example Article Title",
  description:
    "This is a description of the example article with some preview text.",
  type: "link",
  providerName: "Example.com",
  image: "https://example.com/preview.jpg",
};

describe("LinkCard", () => {
  beforeEach(() => {
    linkingSpy.mockClear();
  });

  it("should render card title", () => {
    const { getByText } = render(<LinkCard card={mockCard} />);

    expect(getByText("Example Article Title")).toBeTruthy();
  });

  it("should render card description", () => {
    const { getByText } = render(<LinkCard card={mockCard} />);

    expect(getByText(mockCard.description)).toBeTruthy();
  });

  it("should render provider name", () => {
    const { getByText } = render(<LinkCard card={mockCard} />);

    expect(getByText("Example.com")).toBeTruthy();
  });

  it("should render preview image when available", () => {
    const { getByTestId } = render(<LinkCard card={mockCard} />);

    const image = getByTestId("link-card-image");
    expect(image.props.source.uri).toBe(mockCard.image);
  });

  it("should not render image when not available", () => {
    const cardWithoutImage = { ...mockCard, image: undefined };
    const { queryByTestId } = render(<LinkCard card={cardWithoutImage} />);

    expect(queryByTestId("link-card-image")).toBeNull();
  });

  it("should open link when card is tapped", () => {
    const { getByTestId } = render(<LinkCard card={mockCard} />);

    fireEvent.press(getByTestId("link-card"));

    expect(linkingSpy).toHaveBeenCalledWith(mockCard.url);
  });

  it("should truncate long descriptions", () => {
    const cardWithLongDescription = {
      ...mockCard,
      description: "A".repeat(500),
    };

    const { getByText } = render(<LinkCard card={cardWithLongDescription} />);

    // Check that the text is rendered (it will be truncated by numberOfLines prop)
    expect(getByText(cardWithLongDescription.description)).toBeTruthy();
  });

  it("should handle different card types", () => {
    const photoCard: Card = {
      ...mockCard,
      type: "photo",
    };

    const { getByTestId } = render(<LinkCard card={photoCard} />);

    expect(getByTestId("link-card")).toBeTruthy();
  });

  it("should handle missing provider name", () => {
    const cardWithoutProvider = { ...mockCard, providerName: undefined };
    const { getByText } = render(<LinkCard card={cardWithoutProvider} />);

    // Should still render the title
    expect(getByText(mockCard.title)).toBeTruthy();
  });

  it("should be accessible", () => {
    const { getByTestId } = render(<LinkCard card={mockCard} />);

    const card = getByTestId("link-card");
    expect(card.props.accessibilityRole).toBe("button");
    expect(card.props.accessibilityLabel).toContain(mockCard.title);
  });
});
