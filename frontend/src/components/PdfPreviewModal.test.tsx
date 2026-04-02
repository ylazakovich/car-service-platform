import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PdfPreviewModal } from "./PdfPreviewModal";

const blob = new Blob(["pdf"], { type: "application/pdf" });
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("PdfPreviewModal", () => {
  it("renders the title", () => {
    render(<PdfPreviewModal blob={blob} filename="repair.pdf" onClose={onClose} />);
    expect(screen.getByText("Certificate of Completion")).toBeVisible();
  });

  it("renders Close and Download buttons", () => {
    render(<PdfPreviewModal blob={blob} filename="repair.pdf" onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("calls onClose when Close is clicked", () => {
    render(<PdfPreviewModal blob={blob} filename="repair.pdf" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    render(<PdfPreviewModal blob={blob} filename="repair.pdf" onClose={onClose} />);
    fireEvent.click(document.querySelector(".modal-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("revokes blob URL on unmount", () => {
    const { unmount } = render(<PdfPreviewModal blob={blob} filename="repair.pdf" onClose={onClose} />);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
