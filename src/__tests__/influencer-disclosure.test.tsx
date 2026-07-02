import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfluencerDisclosure } from "@/components/influencer-disclosure";

describe("InfluencerDisclosure — personalization", () => {
  it("banner interpolates the partner name", () => {
    render(<InfluencerDisclosure variant="banner" partnerName="Juan Dela Cruz" />);
    expect(
      screen.getByText(/Juan Dela Cruz is an independent partner of 365 Motor Sales/i),
    ).toBeInTheDocument();
  });

  it("inline interpolates the partner name", () => {
    render(<InfluencerDisclosure variant="inline" partnerName="Maria Santos" />);
    expect(
      screen.getByText(/Maria Santos is an independent partner of 365 Motor Sales/i),
    ).toBeInTheDocument();
  });

  it("footer interpolates the partner name", () => {
    render(<InfluencerDisclosure variant="footer" partnerName="Ana Reyes" />);
    expect(
      screen.getByText(/Ana Reyes is an independent partner of 365 Motor Sales/i),
    ).toBeInTheDocument();
  });

  it("falls back to generic copy when no partner name is provided", () => {
    render(<InfluencerDisclosure variant="banner" />);
    expect(
      screen.getByText(/This link is shared by an independent partner of 365 Motor Sales/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\(not an employee\)/i)).toBeInTheDocument();
  });

  it("banner is labelled as an affiliate disclosure note", () => {
    render(<InfluencerDisclosure variant="banner" partnerName="Test" />);
    expect(screen.getByRole("note", { name: /affiliate disclosure/i })).toBeInTheDocument();
  });
});
