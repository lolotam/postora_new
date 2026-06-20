import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SchedulingSection } from "../SchedulingSection";

// Mock the child components
vi.mock("../SchedulePicker", () => ({
  SchedulePicker: ({ scheduledAt, onScheduleChange }: any) => (
    <div data-testid="schedule-picker">
      <button onClick={() => onScheduleChange(new Date("2024-06-20T10:00:00Z"))}>
        Set Date
      </button>
      <span>{scheduledAt?.toISOString() || "No date"}</span>
    </div>
  ),
}));

vi.mock("../BestTimeSuggestions", () => ({
  BestTimeSuggestions: ({ selectedPlatforms, onSelectTime }: any) => (
    <div data-testid="best-time-suggestions">
      <span>Platforms: {selectedPlatforms.join(", ")}</span>
      <button onClick={() => onSelectTime(new Date("2024-06-20T14:00:00Z"))}>
        Select Best Time
      </button>
    </div>
  ),
}));

vi.mock("../TimezoneSelector", () => ({
  TimezoneSelector: ({ value, onChange, scheduledAt }: any) => (
    <div data-testid="timezone-selector">
      <span>Timezone: {value}</span>
      <button onClick={() => onChange("America/New_York")}>Change TZ</button>
    </div>
  ),
}));

describe("SchedulingSection", () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    scheduleEnabled: false,
    setScheduleEnabled: vi.fn(),
    scheduledAt: null as Date | null,
    setScheduledAt: vi.fn(),
    scheduleTimezone: "UTC",
    setScheduleTimezone: vi.fn(),
    selectedPlatforms: ["instagram", "facebook"] as any[],
  };

  it("renders the section header", () => {
    render(<SchedulingSection {...defaultProps} />);
    expect(screen.getByText("Scheduling & auto-poster")).toBeInTheDocument();
  });

  it("shows checkbox for enabling scheduling", () => {
    render(<SchedulingSection {...defaultProps} />);
    expect(screen.getByText("Enable scheduled posting")).toBeInTheDocument();
  });

  it("hides scheduling controls when not enabled", () => {
    render(<SchedulingSection {...defaultProps} scheduleEnabled={false} />);
    expect(screen.queryByTestId("schedule-picker")).not.toBeInTheDocument();
  });

  it("shows scheduling controls when enabled", () => {
    render(<SchedulingSection {...defaultProps} scheduleEnabled={true} />);
    expect(screen.getByTestId("schedule-picker")).toBeInTheDocument();
    expect(screen.getByTestId("best-time-suggestions")).toBeInTheDocument();
    expect(screen.getByTestId("timezone-selector")).toBeInTheDocument();
  });

  it("calls setScheduleEnabled when checkbox is clicked", () => {
    const setScheduleEnabled = vi.fn();
    render(
      <SchedulingSection {...defaultProps} setScheduleEnabled={setScheduleEnabled} />
    );

    // Find the checkbox by role (Radix UI Checkbox uses role="checkbox")
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(setScheduleEnabled).toHaveBeenCalledWith(true);
  });

  it("displays selected platforms in BestTimeSuggestions", () => {
    render(
      <SchedulingSection
        {...defaultProps}
        scheduleEnabled={true}
        selectedPlatforms={["instagram", "tiktok"]}
      />
    );

    expect(screen.getByText("Platforms: instagram, tiktok")).toBeInTheDocument();
  });

  it("hides BestTimeSuggestions when no platforms selected", () => {
    render(
      <SchedulingSection
        {...defaultProps}
        scheduleEnabled={true}
        selectedPlatforms={[]}
      />
    );

    expect(screen.queryByTestId("best-time-suggestions")).not.toBeInTheDocument();
  });

  it("passes timezone to TimezoneSelector", () => {
    render(
      <SchedulingSection
        {...defaultProps}
        scheduleEnabled={true}
        scheduleTimezone="Europe/London"
      />
    );

    expect(screen.getByText("Timezone: Europe/London")).toBeInTheDocument();
  });

  it("content is accessible when isOpen is true", () => {
    render(<SchedulingSection {...defaultProps} isOpen={true} />);

    // When open, the checkbox text should be in the document
    expect(screen.getByText("Enable scheduled posting")).toBeInTheDocument();
  });
});
