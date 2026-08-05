import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComingSoon } from "./ComingSoon";
import { StageSelect } from "./StageSelect";
import { Results } from "./Results";
import { Quiz } from "./Quiz";
import { STAGES } from "../data/stages";
import { QUESTIONS, ROUND_LENGTH } from "../data/questions";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ComingSoon", () => {
  it("shows the copy it is given and offers a way back", async () => {
    const onHome = vi.fn();
    render(<ComingSoon title="Scan & solve" body="Point your camera at a question." onHome={onHome} />);

    expect(screen.getByRole("heading", { name: "Scan & solve" })).toBeInTheDocument();
    expect(screen.getByText("Point your camera at a question.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /back to the games/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});

describe("StageSelect", () => {
  it("renders a card per stage with its name, ages and blurb", () => {
    render(<StageSelect stages={STAGES} onPick={vi.fn()} />);
    for (const s of STAGES) {
      expect(screen.getByRole("heading", { name: s.name })).toBeInTheDocument();
      expect(screen.getByText(s.ages)).toBeInTheDocument();
      expect(screen.getByText(s.blurb)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button")).toHaveLength(STAGES.length);
  });

  it("reports the id of the stage that was picked, not its position", async () => {
    const onPick = vi.fn();
    render(<StageSelect stages={STAGES} onPick={onPick} />);
    await userEvent.click(screen.getByRole("heading", { name: "Key Stage 3" }).closest("button")!);
    expect(onPick).toHaveBeenCalledWith("ks3");
  });

  it("renders nothing but the hero when given no stages", () => {
    render(<StageSelect stages={[]} onPick={vi.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Results", () => {
  it("shows the score, the stage name and both actions", async () => {
    const onRetry = vi.fn();
    const onHome = vi.fn();
    render(<Results stage="ks2" score={12} total={15} onRetry={onRetry} onHome={onHome} />);

    expect(screen.getByRole("heading", { name: /12\s*\/\s*15/ })).toBeInTheDocument();
    expect(screen.getByText(/Key Stage 2 round complete/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /play again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /choose another stage/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  // The verdict ladder is the whole point of the screen — cover every rung.
  it.each([
    [15, 15, /Top cat/i],
    [12, 15, /Brilliant work/i],
    [8, 15, /Good effort/i],
    [2, 15, /Every expert starts somewhere/i],
  ])("scoring %i/%i gives the right message", (score, total, message) => {
    render(<Results stage="ks1" score={score} total={total} onRetry={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("falls back to the raw id if the stage is unknown", () => {
    // @ts-expect-error deliberately passing an id that is not in STAGES
    render(<Results stage="ks9" score={1} total={2} onRetry={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByText(/ks9 round complete/)).toBeInTheDocument();
  });
});

describe("Quiz", () => {
  /**
   * Freeze the shuffle. This does NOT yield the bank in declared order — with
   * random()=0 every draw is index 0, which is a real permutation — so tests
   * read the question off the screen rather than assuming which one is showing.
   */
  const unshuffled = () => vi.spyOn(Math, "random").mockReturnValue(0);

  /** The bank entry currently on screen, found by its prompt. */
  const onScreen = (stage: "ks1" | "ks2" | "ks3" | "higher") => {
    const prompt = screen.getByRole("heading", { level: 2 }).textContent;
    const q = QUESTIONS[stage].find((x) => x.prompt === prompt);
    if (!q) throw new Error(`no bank entry for prompt: ${prompt}`);
    return q;
  };

  it("shows the first question and the round position", () => {
    unshuffled();
    render(<Quiz stage="ks1" onFinish={vi.fn()} onQuit={vi.fn()} />);
    expect(screen.getByText(`Question 1 / ${ROUND_LENGTH} · 🐟 0`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /.+/ }).length).toBeGreaterThan(4);
  });

  it("reveals a hint only before an answer is given", async () => {
    unshuffled();
    render(<Quiz stage="ks1" onFinish={vi.fn()} onQuit={vi.fn()} />);
    const hintBtn = screen.getByRole("button", { name: /paw for a hint/i });
    await userEvent.click(hintBtn);
    expect(screen.getByRole("button", { name: /💡/ })).toBeInTheDocument();
  });

  it("credits a correct answer and congratulates the learner", async () => {
    unshuffled();
    render(<Quiz stage="ks1" onFinish={vi.fn()} onQuit={vi.fn()} />);
    const q = onScreen("ks1");

    await userEvent.click(screen.getByRole("button", { name: q.choices[q.answer] }));
    expect(screen.getByText(/Purr-fect/i)).toBeInTheDocument();
    expect(screen.getByText(`Question 1 / ${ROUND_LENGTH} · 🐟 1`)).toBeInTheDocument();
  });

  it("shows the right answer and the hint when the learner is wrong", async () => {
    unshuffled();
    render(<Quiz stage="ks1" onFinish={vi.fn()} onQuit={vi.fn()} />);
    const q = onScreen("ks1");
    const wrong = q.choices.findIndex((_, i) => i !== q.answer);

    await userEvent.click(screen.getByRole("button", { name: q.choices[wrong] }));
    expect(screen.getByText(new RegExp(`Not quite`, "i"))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(q.hint.slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
    expect(screen.getByText(`Question 1 / ${ROUND_LENGTH} · 🐟 0`)).toBeInTheDocument();
  });

  it("ignores a second pick on the same question", async () => {
    unshuffled();
    render(<Quiz stage="ks1" onFinish={vi.fn()} onQuit={vi.fn()} />);
    const q = onScreen("ks1");

    await userEvent.click(screen.getByRole("button", { name: q.choices[q.answer] }));
    // The choices are disabled once answered, so this must not double-count.
    await userEvent.click(screen.getByRole("button", { name: q.choices[q.answer] }));
    expect(screen.getByText(`Question 1 / ${ROUND_LENGTH} · 🐟 1`)).toBeInTheDocument();
  });

  it("advances through the round and finishes with the final score", async () => {
    unshuffled();
    const onFinish = vi.fn();
    render(<Quiz stage="ks1" onFinish={onFinish} onQuit={vi.fn()} />);

    for (let i = 0; i < ROUND_LENGTH; i++) {
      const q = onScreen("ks1");
      await userEvent.click(screen.getByRole("button", { name: q.choices[q.answer] }));
      await userEvent.click(
        screen.getByRole("button", { name: i + 1 >= ROUND_LENGTH ? /see results/i : /next question/i })
      );
    }
    expect(onFinish).toHaveBeenCalledWith(ROUND_LENGTH, ROUND_LENGTH);
  });

  it("lets the learner quit mid-round", async () => {
    unshuffled();
    const onQuit = vi.fn();
    render(<Quiz stage="ks2" onFinish={vi.fn()} onQuit={onQuit} />);
    await userEvent.click(screen.getByRole("button", { name: /quit round/i }));
    expect(onQuit).toHaveBeenCalledTimes(1);
  });
});
