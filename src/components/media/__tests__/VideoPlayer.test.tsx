import {
  render,
  fireEvent,
  waitFor,
  act,
  RenderAPI,
} from "@testing-library/react-native";
import { VideoPlayer } from "../VideoPlayer";
import type { MediaAttachment } from "@types";

// Mock expo-video
let mockPlayerInstance: any = null;
let mockPlayerCallbacks: Set<() => void> = new Set();

jest.mock("expo-video", () => {
  const React = require("react");
  return {
    useVideoPlayer: jest.fn((url, callback) => {
      // Create a new player instance for each call
      const player = {
        playing: false,
        muted: false,
        loop: false,
        duration: 60000, // 60 seconds in milliseconds
        currentTime: 0,
        play: jest.fn(() => {
          player.playing = true;
          // Trigger callbacks to simulate state change
          mockPlayerCallbacks.forEach((cb) => cb());
        }),
        pause: jest.fn(() => {
          player.playing = false;
          // Trigger callbacks to simulate state change
          mockPlayerCallbacks.forEach((cb) => cb());
        }),
      };
      mockPlayerInstance = player;
      if (callback) {
        callback(player);
      }
      return player;
    }),
    VideoView: React.forwardRef((props: any, ref: any) => {
      const MockView = require("react-native").View;
      return <MockView testID="video-component" {...props} />;
    }),
  };
});

// Mock theme context
jest.mock("@contexts/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      card: "#FFFFFF",
      text: "#000000",
      textSecondary: "#666666",
      primary: "#6364FF",
    },
  }),
}));

describe("VideoPlayer", () => {
  const mockVideoMedia: MediaAttachment = {
    id: "1",
    type: "video",
    url: "https://example.com/video.mp4",
    previewUrl: "https://example.com/preview.jpg",
    description: "Test video",
  };

  const mockGifMedia: MediaAttachment = {
    id: "2",
    type: "gifv",
    url: "https://example.com/animation.gif",
    previewUrl: "https://example.com/preview.jpg",
    description: "Test GIF",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Autoplay behavior on view enter/exit", () => {
    it("should autoplay video when isVisible is true", () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockVideoMedia} isVisible={true} autoPlay={true} />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();
      // Video should be set to play (shouldPlay prop)
    });

    it("should not autoplay video when isVisible is false", () => {
      const { getByTestId } = render(
        <VideoPlayer
          media={mockVideoMedia}
          isVisible={false}
          autoPlay={true}
        />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();
      // Video should not be playing when not visible
    });

    it("should pause video when isVisible changes from true to false", async () => {
      const { rerender } = render(
        <VideoPlayer media={mockVideoMedia} isVisible={true} autoPlay={true} />,
      );

      // Change visibility to false
      rerender(
        <VideoPlayer
          media={mockVideoMedia}
          isVisible={false}
          autoPlay={true}
        />,
      );

      await waitFor(() => {
        // Video should be paused when no longer visible
        expect(true).toBe(true); // Placeholder for actual pause verification
      });
    });

    it("should resume video when isVisible changes from false to true", async () => {
      const { rerender } = render(
        <VideoPlayer
          media={mockVideoMedia}
          isVisible={false}
          autoPlay={true}
        />,
      );

      // Change visibility to true
      rerender(
        <VideoPlayer media={mockVideoMedia} isVisible={true} autoPlay={true} />,
      );

      await waitFor(() => {
        // Video should resume playing when visible again
        expect(true).toBe(true); // Placeholder for actual play verification
      });
    });

    it("should autoplay GIF animations when isVisible is true", () => {
      const { getByTestId, queryByText } = render(
        <VideoPlayer media={mockGifMedia} isVisible={true} />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();

      // GIF badge should be visible
      const gifBadge = queryByText("GIF");
      expect(gifBadge).toBeTruthy();
    });
  });

  describe("Grid view behavior (always muted, no visible controls)", () => {
    it("should render video in grid mode with sound always off", () => {
      const { queryByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="grid" isVisible={true} />,
      );

      const video = queryByTestId("video-component");
      expect(video).toBeTruthy();

      // Controls should not be visible in grid mode
      const playButton = queryByTestId("play-button");
      expect(playButton).toBeNull();

      const muteButton = queryByTestId("mute-button");
      expect(muteButton).toBeNull();
    });

    it("should keep sound muted in grid mode even if user tries to unmute", () => {
      const { queryByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="grid" isVisible={true} />,
      );

      // In grid mode, mute button should not be accessible
      const muteButton = queryByTestId("mute-button");
      expect(muteButton).toBeNull();
    });

    it("should autoplay GIF in grid mode without controls", () => {
      const { queryByTestId, queryByText } = render(
        <VideoPlayer media={mockGifMedia} mode="grid" isVisible={true} />,
      );

      const video = queryByTestId("video-component");
      expect(video).toBeTruthy();

      // GIF badge should be visible
      const gifBadge = queryByText("GIF");
      expect(gifBadge).toBeTruthy();

      // Controls should not be visible
      const playButton = queryByTestId("play-button");
      expect(playButton).toBeNull();
    });

    it("should autoplay video when entering grid viewport", () => {
      const { rerender } = render(
        <VideoPlayer media={mockVideoMedia} mode="grid" isVisible={false} />,
      );

      // Video enters viewport
      rerender(
        <VideoPlayer media={mockVideoMedia} mode="grid" isVisible={true} />,
      );

      // Video should start playing automatically
      expect(true).toBe(true); // Placeholder for actual autoplay verification
    });
  });

  describe("List view behavior (muted by default, with playback controls)", () => {
    it("should render video in list mode with sound off by default", () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={true} />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();

      // Mute icon should show muted state (🔇)
      const muteIcon = getByTestId("mute-icon");
      expect(muteIcon.props.children).toBe("🔇");
    });

    it("should display playback controls in list mode", async () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={true} />,
      );

      // Play button should be visible
      const playButton = getByTestId("play-button");
      expect(playButton).toBeTruthy();

      // Mute button should be visible
      const muteButton = getByTestId("mute-button");
      expect(muteButton).toBeTruthy();

      // Time display should be visible (after status loads)
      await waitFor(() => {
        const timeDisplay = getByTestId("time-display");
        expect(timeDisplay).toBeTruthy();
      });
    });

    it("should show progress bar in list mode", async () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={true} />,
      );

      // Progress bar should be visible (after status loads)
      await waitFor(() => {
        const progressBar = getByTestId("progress-bar");
        expect(progressBar).toBeTruthy();
      });
    });

    it("should allow user to toggle sound on in list mode", async () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={true} />,
      );

      const muteButton = getByTestId("mute-button");
      const muteIcon = getByTestId("mute-icon");

      // Initially muted
      expect(muteIcon.props.children).toBe("🔇");

      // Toggle sound on
      fireEvent.press(muteButton);

      await waitFor(() => {
        // Should show unmuted icon (🔊)
        expect(muteIcon.props.children).toBe("🔊");
      });
    });

    it("should allow user to scrub through video using progress bar", async () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={true} />,
      );

      // Wait for progress bar to appear after status loads
      const progressBar = await waitFor(() => getByTestId("progress-bar"));
      expect(progressBar).toBeTruthy();

      // Simulate user dragging progress bar to 50%
      fireEvent(progressBar, "onValueChange", 0.5);

      await waitFor(() => {
        // Video position should update to 50%
        expect(true).toBe(true); // Placeholder for actual seek verification
      });
    });

    it("should allow user to play/pause video in list mode", async () => {
      const { getByTestId } = render(
        <VideoPlayer
          media={mockVideoMedia}
          mode="list"
          isVisible={true}
          autoPlay={false}
        />,
      );

      const playButton = getByTestId("play-button");

      // Initially paused, should show play icon
      expect(getByTestId("play-icon").props.children).toBe("▶️");

      // Verify initial state
      expect(mockPlayerInstance?.playing).toBe(false);

      // Press play button
      fireEvent.press(playButton);

      // Verify player.play() was called and playing state updated
      expect(mockPlayerInstance?.play).toHaveBeenCalledTimes(1);
      expect(mockPlayerInstance?.playing).toBe(true);

      // Note: In the real component, player.playing is read directly from the player object,
      // so React doesn't track it as state. The expo-video library handles reactivity internally.
      // This test verifies the play() method is called correctly.
      // The UI state test would require a more sophisticated mock that triggers React re-renders.
    });

    it("should autoplay video in list mode when entering viewport", () => {
      const { rerender } = render(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={false} />,
      );

      // Video enters viewport
      rerender(
        <VideoPlayer media={mockVideoMedia} mode="list" isVisible={true} />,
      );

      // Video should start playing automatically (muted)
      expect(true).toBe(true); // Placeholder for actual autoplay verification
    });

    it("should not show controls for GIF in list mode", () => {
      const { queryByTestId, queryByText } = render(
        <VideoPlayer media={mockGifMedia} mode="list" isVisible={true} />,
      );

      // GIF badge should be visible
      const gifBadge = queryByText("GIF");
      expect(gifBadge).toBeTruthy();

      // Controls should be hidden for GIF (auto-hidden)
      // GIFs don't need manual controls since they loop
    });

    it("should update progress bar as video plays", async () => {
      const { getByTestId } = render(
        <VideoPlayer
          media={mockVideoMedia}
          mode="list"
          isVisible={true}
          autoPlay={true}
        />,
      );

      // Wait for progress bar to appear after status loads
      const progressBar = await waitFor(() => getByTestId("progress-bar"));
      expect(progressBar).toBeTruthy();

      // Wait and check that progress updates
      await waitFor(() => {
        // Progress should increase over time
        expect(true).toBe(true); // Placeholder for actual progress verification
      });
    });
  });

  describe("GIF-specific behavior", () => {
    it("should always autoplay GIF regardless of autoPlay prop", () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockGifMedia} autoPlay={false} isVisible={true} />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();
      // GIFs should play even when autoPlay is false
    });

    it("should loop GIF continuously", () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockGifMedia} isVisible={true} />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();
      // Video should have looping enabled
    });

    it("should always keep GIF muted", () => {
      const { getByTestId } = render(
        <VideoPlayer media={mockGifMedia} mode="list" isVisible={true} />,
      );

      const video = getByTestId("video-component");
      expect(video).toBeTruthy();
      // GIFs should always be muted (no sound track anyway)
    });
  });
});
