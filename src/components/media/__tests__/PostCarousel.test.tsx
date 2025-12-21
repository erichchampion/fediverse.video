/**
 * PostCarousel Component Tests
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { PostCarousel } from "../PostCarousel";
import type { MediaAttachment } from "@types";

// Mock dependencies
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#FFFFFF",
      text: "#000000",
      textSecondary: "#666666",
      border: "#E0E0E0",
    },
  }),
}));

jest.mock("@hooks/useSettings", () => ({
  useSettings: () => ({
    autoPlayMedia: true,
    highQualityUploads: true,
    isLoading: false,
  }),
}));

const mockMedia: MediaAttachment[] = [
  {
    id: "media1",
    type: "image",
    url: "https://example.com/image1.jpg",
    previewUrl: "https://example.com/preview1.jpg",
    description: "First image",
  },
  {
    id: "media2",
    type: "image",
    url: "https://example.com/image2.jpg",
    previewUrl: "https://example.com/preview2.jpg",
    description: "Second image",
  },
  {
    id: "media3",
    type: "video",
    url: "https://example.com/video.mp4",
    previewUrl: "https://example.com/preview3.jpg",
    description: "A video",
  },
];

describe("PostCarousel", () => {
  it("should render media indicators", () => {
    const { getAllByText } = render(
      <PostCarousel
        media={mockMedia}
        sensitive={false}
        currentIndex={0}
        onIndexChange={jest.fn()}
      />,
    );

    // Should show indicators for each media item (images use 🖼️, videos use 📺)
    const indicators = getAllByText(/🖼️|📺/);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it("should highlight current index indicator", () => {
    const { getByTestId } = render(
      <PostCarousel
        media={mockMedia}
        sensitive={false}
        currentIndex={1}
        onIndexChange={jest.fn()}
      />,
    );

    const indicator1 = getByTestId("indicator-1");
    const indicator0 = getByTestId("indicator-0");

    // Current indicator (1) should have full opacity
    const indicator1Style = Array.isArray(indicator1.props.style)
      ? indicator1.props.style.find(
          (s: any) => s && typeof s.opacity === "number",
        )
      : indicator1.props.style;
    expect(indicator1Style).toMatchObject({ opacity: 1 });

    // Non-current indicator should have reduced opacity
    const indicator0Style = Array.isArray(indicator0.props.style)
      ? indicator0.props.style.find(
          (s: any) => s && typeof s.opacity === "number",
        )
      : indicator0.props.style;
    expect(indicator0Style).toMatchObject({ opacity: 0.5 });
  });

  it("should call onIndexChange when indicator is tapped", () => {
    const mockOnIndexChange = jest.fn();
    const { getByTestId } = render(
      <PostCarousel
        media={mockMedia}
        sensitive={false}
        currentIndex={0}
        onIndexChange={mockOnIndexChange}
      />,
    );

    fireEvent.press(getByTestId("indicator-2"));
    expect(mockOnIndexChange).toHaveBeenCalledWith(2);
  });

  it("should show sensitive content overlay when sensitive is true", () => {
    const { getByTestId } = render(
      <PostCarousel
        media={mockMedia}
        sensitive={true}
        currentIndex={0}
        onIndexChange={jest.fn()}
      />,
    );

    expect(getByTestId("sensitive-overlay")).toBeTruthy();
  });

  it("should hide sensitive overlay when tapped", () => {
    const { getByTestId, queryByTestId } = render(
      <PostCarousel
        media={mockMedia}
        sensitive={true}
        currentIndex={0}
        onIndexChange={jest.fn()}
      />,
    );

    const overlay = getByTestId("sensitive-overlay");
    fireEvent.press(overlay);

    // Overlay should be hidden
    expect(queryByTestId("sensitive-overlay")).toBeNull();
  });

  it("should render different indicators for different media types", () => {
    const { getAllByText } = render(
      <PostCarousel
        media={mockMedia}
        sensitive={false}
        currentIndex={0}
        onIndexChange={jest.fn()}
      />,
    );

    // Check that we have the right emoji indicators
    expect(getAllByText("🖼️").length).toBe(2); // Two images
    expect(getAllByText("📺").length).toBe(1); // One video
  });

  it("should handle empty media array", () => {
    const { queryByTestId } = render(
      <PostCarousel
        media={[]}
        sensitive={false}
        currentIndex={0}
        onIndexChange={jest.fn()}
      />,
    );

    // Should not render any indicators
    expect(queryByTestId("indicator-0")).toBeNull();
  });
});
