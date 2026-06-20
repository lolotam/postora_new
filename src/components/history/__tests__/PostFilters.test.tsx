import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PostFilters } from "../PostFilters";

// Mock UI components
vi.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange }: any) => <div onClick={() => onValueChange && onValueChange("test-value")}>{children}</div>,
    SelectTrigger: ({ children }: any) => <button>{children}</button>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock("@/components/ui/input", () => ({
    Input: ({ onChange, placeholder, value, className, "data-testid": testId }: any) => (
        <input
            onChange={onChange}
            placeholder={placeholder}
            value={value}
            className={className}
            data-testid={testId}
        />
    ),
}));

describe("PostFilters Component", () => {
    const defaultProps = {
        search: "",
        onSearchChange: vi.fn(),
        selectedFilter: "all" as const,
        onFilterChange: vi.fn(),
        sourceFilter: "all" as const,
        onSourceFilterChange: vi.fn(),
        platformFilter: "all" as const,
        onPlatformFilterChange: vi.fn(),
        itemsPerPage: 10,
        onItemsPerPageChange: vi.fn(),
    };

    it("renders search input", () => {
        render(<PostFilters {...defaultProps} />);
        expect(screen.getByPlaceholderText("Search posts...")).toBeInTheDocument();
    });

    it("calls onSearchChange when input changes", () => {
        const onSearchChange = vi.fn();
        render(<PostFilters {...defaultProps} onSearchChange={onSearchChange} />);

        const input = screen.getByPlaceholderText("Search posts...");
        fireEvent.change(input, { target: { value: "test query" } });

        expect(onSearchChange).toHaveBeenCalled();
    });

    // Since Select mocking is simple/limited, we might skip deep interaction tests for Select
    // unless we build a more robust mock.
});