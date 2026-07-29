import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { ROUND_SIZE } from "./game/round";

/** Answers every question in the current round by taking the first choice. */
async function playWholeRound(user: UserEvent) {
  for (let i = 0; i < ROUND_SIZE; i++) {
    const choices = screen
      .getAllByRole("button")
      .filter((button) => button.classList.contains("choice"));
    await user.click(choices[0]);
  }
}

beforeEach(() => {
  localStorage.clear();
});

describe("<App />", () => {
  it("greets the learner and lists the four stages", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /education academy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /key stage 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /key stage 2/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /key stage 3/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /higher education/i })).toBeInTheDocument();
  });

  it("starts a round when a stage is chosen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));

    expect(screen.getByText(new RegExp(`question 1 of ${ROUND_SIZE}`, "i"))).toBeInTheDocument();
  });

  it("advances through questions as they are answered", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /key stage 2/i }));

    await user.click(screen.getAllByRole("button", { name: /.+/ })[1]);

    expect(screen.getByText(new RegExp(`question 2 of ${ROUND_SIZE}`, "i"))).toBeInTheDocument();
  });

  it("returns to the stage picker when the round is quit", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /key stage 3/i }));

    await user.click(screen.getByRole("button", { name: /quit round/i }));

    expect(screen.getByRole("heading", { name: /pick a stage/i })).toBeInTheDocument();
  });
});

describe("dashboard", () => {
  it("opens from the stage picker and says when nothing has been played", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));

    expect(screen.getByRole("heading", { name: /parent & teacher dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/no rounds finished yet/i)).toBeInTheDocument();
  });

  it("returns to the stage picker", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));

    await user.click(screen.getByRole("button", { name: /back to stages/i }));

    expect(screen.getByRole("heading", { name: /pick a stage/i })).toBeInTheDocument();
  });

  it("reports a finished round against its stage", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));
    await playWholeRound(user);
    await user.click(screen.getByRole("button", { name: /back to stages/i }));
    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));

    expect(screen.getByText(/1 round finished on this device/i)).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /key stage 1/i });
    expect(row).toHaveTextContent("1");
    expect(screen.getByRole("heading", { name: /by subject/i })).toBeInTheDocument();
  });

  it("does not count a round that was quit part way through", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /key stage 2/i }));
    const choices = screen
      .getAllByRole("button")
      .filter((button) => button.classList.contains("choice"));
    await user.click(choices[0]);
    await user.click(screen.getByRole("button", { name: /quit round/i }));
    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));

    expect(screen.getByText(/no rounds finished yet/i)).toBeInTheDocument();
  });

  it("keeps progress across a reload", async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));
    await playWholeRound(user);
    first.unmount();

    render(<App />);
    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));

    expect(screen.getByText(/1 round finished on this device/i)).toBeInTheDocument();
  });

  it("clears saved progress on request", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));
    await playWholeRound(user);
    await user.click(screen.getByRole("button", { name: /back to stages/i }));
    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));
    await user.click(screen.getByRole("button", { name: /clear saved progress/i }));

    expect(screen.getByText(/no rounds finished yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear saved progress/i })).not.toBeInTheDocument();
  });
});
