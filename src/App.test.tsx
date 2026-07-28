import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { ROUND_SIZE } from "./game/round";

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
