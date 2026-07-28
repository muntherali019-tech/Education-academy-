import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
import type { RoundResult } from "./game/progress";
import type { StageId } from "./game/stages";

function result(
  stage: StageId,
  percentage: number,
  completedAt: string,
): RoundResult {
  return {
    stage,
    seed: 1,
    correct: Math.round((percentage / 100) * 15),
    total: 15,
    percentage,
    passed: percentage >= 60,
    completedAt,
  };
}

/** Reads the value shown on an overall-progress tile. */
function tileValue(label: string): string {
  const tile = screen.getByRole("listitem", { name: label });
  return within(tile).getByText((_, element) =>
    element?.className === "tile-value",
  ).textContent ?? "";
}

/** Reads a row of the "By stage" table by its row header. */
function stageRow(name: string): string[] {
  const header = screen.getByRole("rowheader", { name });
  const row = header.closest("tr");
  if (!row) throw new Error(`No row for ${name}`);
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");
}

describe("<Dashboard />", () => {
  it("shows an empty state when nothing has been played", () => {
    render(<Dashboard history={[]} onBack={() => {}} />);

    expect(screen.getByText(/no rounds finished yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("summarises overall progress in tiles", () => {
    const history = [
      result("ks1", 100, "2026-01-01T10:00:00.000Z"),
      result("ks2", 40, "2026-01-02T10:00:00.000Z"),
    ];
    render(<Dashboard history={history} onBack={() => {}} />);

    expect(tileValue("Rounds played")).toBe("2");
    expect(tileValue("Rounds cleared")).toBe("1");
    expect(tileValue("Pass rate")).toBe("50%");
    // (100 + 40) / 2 — the mean score, not the pass rate.
    expect(tileValue("Average score")).toBe("70%");
  });

  it("lists all four stages, including unplayed ones", () => {
    render(
      <Dashboard history={[result("ks1", 80, "2026-01-01T10:00:00.000Z")]} onBack={() => {}} />,
    );

    expect(stageRow("Key Stage 1")).toEqual(["1", "1", "80%", "80%", "1 Jan 2026"]);
    // Never played — counts are zero and the rest is dashed out, not 0%.
    expect(stageRow("Key Stage 3")).toEqual(["0", "0", "—", "—", "—"]);
    expect(screen.getByRole("rowheader", { name: "Higher Education" })).toBeInTheDocument();
  });

  it("keeps best and average distinct", () => {
    const history = [
      result("ks2", 100, "2026-01-01T10:00:00.000Z"),
      result("ks2", 60, "2026-01-02T10:00:00.000Z"),
    ];
    render(<Dashboard history={history} onBack={() => {}} />);

    const [played, cleared, best, average] = stageRow("Key Stage 2");
    expect(played).toBe("2");
    expect(cleared).toBe("2");
    expect(best).toBe("100%");
    expect(average).toBe("80%");
  });

  it("lists recent rounds newest first with a pass badge", () => {
    const history = [
      result("ks1", 20, "2026-01-01T10:00:00.000Z"),
      result("ks2", 90, "2026-01-02T10:00:00.000Z"),
    ];
    render(<Dashboard history={history} onBack={() => {}} />);

    const items = within(screen.getByRole("list", { name: "Recent rounds" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Key Stage 2");
    expect(items[0]).toHaveTextContent("Cleared");
    expect(items[0]).toHaveTextContent("90%");
    expect(items[1]).toHaveTextContent("Key Stage 1");
    expect(items[1]).toHaveTextContent("Not cleared");
  });

  it("formats dates in UTC regardless of the viewer's timezone", () => {
    // 23:30 UTC would be the next day in a positive-offset timezone.
    render(
      <Dashboard history={[result("ks1", 80, "2026-03-05T23:30:00.000Z")]} onBack={() => {}} />,
    );
    expect(stageRow("Key Stage 1")[4]).toBe("5 Mar 2026");
  });

  it("dashes out an unparseable date instead of showing Invalid Date", () => {
    render(<Dashboard history={[result("ks1", 80, "not-a-date")]} onBack={() => {}} />);
    expect(stageRow("Key Stage 1")[4]).toBe("—");
  });

  it("calls onBack when the back button is pressed", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard history={[]} onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /back to stages/i }));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
