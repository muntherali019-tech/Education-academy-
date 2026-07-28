import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { ROUND_SIZE } from "./game/round";
import { loadHistory, STORAGE_KEY, type HistoryStore } from "./game/storage";

/** In-memory store so tests never touch real localStorage. */
function fakeStore(initial?: string): HistoryStore & { raw: () => string | null } {
  let value = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    raw: () => value,
  };
}

const FIXED_NOW = new Date("2026-05-04T12:00:00.000Z");

/** Answers every question in the current round by taking the first choice. */
async function completeRound(user: UserEvent) {
  for (let i = 0; i < ROUND_SIZE; i++) {
    const answers = within(screen.getByRole("list", { name: "Answers" })).getAllByRole(
      "button",
    );
    await user.click(answers[0]);
  }
}

function tileValue(label: string): string {
  const tile = screen.getByRole("listitem", { name: label });
  return within(tile).getByText((_, element) => element?.className === "tile-value")
    .textContent ?? "";
}

describe("<App />", () => {
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it("greets the learner and lists the four stages", () => {
    render(<App store={null} />);

    expect(screen.getByRole("heading", { name: /education academy/i })).toBeInTheDocument();
    const stages = within(screen.getByRole("list", { name: "Stages" })).getAllByRole(
      "button",
    );
    expect(stages.map((button) => button.textContent)).toEqual([
      expect.stringContaining("Key Stage 1"),
      expect.stringContaining("Key Stage 2"),
      expect.stringContaining("Key Stage 3"),
      expect.stringContaining("Higher Education"),
    ]);
  });

  it("starts a round when a stage is chosen", async () => {
    render(<App store={null} />);

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));

    expect(screen.getByText(new RegExp(`question 1 of ${ROUND_SIZE}`, "i"))).toBeInTheDocument();
  });

  it("advances through questions as they are answered", async () => {
    render(<App store={null} />);
    await user.click(screen.getByRole("button", { name: /key stage 2/i }));

    const answers = within(screen.getByRole("list", { name: "Answers" })).getAllByRole(
      "button",
    );
    await user.click(answers[0]);

    expect(screen.getByText(new RegExp(`question 2 of ${ROUND_SIZE}`, "i"))).toBeInTheDocument();
  });

  it("returns to the stage picker when the round is quit", async () => {
    render(<App store={null} />);
    await user.click(screen.getByRole("button", { name: /key stage 3/i }));

    await user.click(screen.getByRole("button", { name: /quit round/i }));

    expect(screen.getByRole("heading", { name: /pick a stage/i })).toBeInTheDocument();
  });

  it("shows a score when the round finishes", async () => {
    render(<App store={null} />);
    await user.click(screen.getByRole("button", { name: /key stage 1/i }));

    await completeRound(user);

    expect(screen.getByText(new RegExp(`/ ${ROUND_SIZE}`))).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Answers" })).not.toBeInTheDocument();
  });

  describe("progress", () => {
    it("shows an empty dashboard before anything is played", async () => {
      render(<App store={null} />);

      await user.click(screen.getByRole("button", { name: /view progress/i }));

      expect(screen.getByText(/no rounds finished yet/i)).toBeInTheDocument();
    });

    it("records a finished round and shows it on the dashboard", async () => {
      render(<App store={null} now={() => FIXED_NOW} />);
      await user.click(screen.getByRole("button", { name: /key stage 2/i }));
      await completeRound(user);

      await user.click(screen.getByRole("button", { name: /back to stages/i }));
      await user.click(screen.getByRole("button", { name: /view progress/i }));

      expect(tileValue("Rounds played")).toBe("1");
      const recent = within(screen.getByRole("list", { name: "Recent rounds" })).getAllByRole(
        "listitem",
      );
      expect(recent).toHaveLength(1);
      expect(recent[0]).toHaveTextContent("Key Stage 2");
      expect(recent[0]).toHaveTextContent("4 May 2026");
    });

    it("persists the finished round to the store exactly once", async () => {
      const store = fakeStore();
      render(<App store={store} now={() => FIXED_NOW} />);
      await user.click(screen.getByRole("button", { name: /key stage 1/i }));

      await completeRound(user);

      const saved = loadHistory(store);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({
        stage: "ks1",
        total: ROUND_SIZE,
        completedAt: FIXED_NOW.toISOString(),
      });
    });

    it("does not record a round that was quit part-way", async () => {
      const store = fakeStore();
      render(<App store={store} />);
      await user.click(screen.getByRole("button", { name: /key stage 1/i }));

      const answers = within(screen.getByRole("list", { name: "Answers" })).getAllByRole(
        "button",
      );
      await user.click(answers[0]);
      await user.click(screen.getByRole("button", { name: /quit round/i }));

      expect(loadHistory(store)).toEqual([]);
    });

    it("loads existing history from the store on mount", async () => {
      const existing = JSON.stringify([
        {
          stage: "ks3",
          seed: 5,
          correct: 12,
          total: 15,
          percentage: 80,
          passed: true,
          completedAt: "2026-02-02T09:00:00.000Z",
        },
      ]);
      render(<App store={fakeStore(existing)} />);

      await user.click(screen.getByRole("button", { name: /view progress/i }));

      expect(tileValue("Rounds played")).toBe("1");
      const recent = within(screen.getByRole("list", { name: "Recent rounds" })).getAllByRole(
        "listitem",
      );
      expect(recent).toHaveLength(1);
      expect(recent[0]).toHaveTextContent("Key Stage 3");
      expect(recent[0]).toHaveTextContent("2 Feb 2026");
    });

    it("accumulates rounds across plays", async () => {
      const store = fakeStore();
      render(<App store={store} now={() => FIXED_NOW} />);

      await user.click(screen.getByRole("button", { name: /key stage 1/i }));
      await completeRound(user);
      await user.click(screen.getByRole("button", { name: /back to stages/i }));

      await user.click(screen.getByRole("button", { name: /key stage 2/i }));
      await completeRound(user);
      await user.click(screen.getByRole("button", { name: /back to stages/i }));

      await user.click(screen.getByRole("button", { name: /view progress/i }));

      expect(tileValue("Rounds played")).toBe("2");
      expect(loadHistory(store)).toHaveLength(2);
    });

    it("starts clean when the stored payload is corrupt", async () => {
      render(<App store={fakeStore("{not json")} />);

      await user.click(screen.getByRole("button", { name: /view progress/i }));

      expect(screen.getByText(/no rounds finished yet/i)).toBeInTheDocument();
    });

    it("keeps working when no store is available", async () => {
      render(<App store={null} />);
      await user.click(screen.getByRole("button", { name: /key stage 1/i }));

      await completeRound(user);
      await user.click(screen.getByRole("button", { name: /back to stages/i }));
      await user.click(screen.getByRole("button", { name: /view progress/i }));

      // Held in memory for the session even though nothing was persisted.
      expect(tileValue("Rounds played")).toBe("1");
    });

    it("writes under the versioned storage key", async () => {
      const store = fakeStore();
      render(<App store={store} now={() => FIXED_NOW} />);
      await user.click(screen.getByRole("button", { name: /key stage 1/i }));

      await completeRound(user);

      expect(store.raw()).not.toBeNull();
      expect(STORAGE_KEY).toBe("education-academy:progress:v1");
    });
  });
});
