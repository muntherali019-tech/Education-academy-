import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { ROUND_SIZE } from "./game/round";
import { FREE_ROUNDS_PER_DAY } from "./game/subscription";
import { MarkingError, type Marker, type MarkingResult } from "./marking/marking";

/** Answers every question in the current round by taking the first choice. */
async function playWholeRound(user: UserEvent) {
  for (let i = 0; i < ROUND_SIZE; i++) {
    const choices = screen
      .getAllByRole("button")
      .filter((button) => button.classList.contains("choice"));
    await user.click(choices[0]);
  }
}

/** Starts and abandons rounds until today's free allowance is gone. */
async function spendFreeRounds(user: UserEvent) {
  for (let i = 0; i < FREE_ROUNDS_PER_DAY; i++) {
    await user.click(screen.getByRole("button", { name: /key stage 1/i }));
    await user.click(screen.getByRole("button", { name: /quit round/i }));
  }
}

/** Takes out a subscription through the plans view. */
async function subscribe(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: /see plans/i }));
  await user.click(screen.getByRole("button", { name: /mochi monthly/i }));
  await user.click(screen.getByRole("button", { name: /back to stages/i }));
}

const MARKING: MarkingResult = {
  overall: "Great effort — two out of three!",
  items: [
    { question: "7 x 8?", studentAnswer: "56", verdict: "correct", comment: "Spot on." },
    { question: "9 x 6?", studentAnswer: "56", verdict: "incorrect", comment: "Try counting up." },
    { question: "12 / 4?", studentAnswer: "", verdict: "unclear", comment: "Too blurry to read." },
  ],
};

function photoFile(): File {
  return new File(["homework"], "homework.png", { type: "image/png" });
}

async function choosePhoto(user: UserEvent) {
  await user.upload(screen.getByLabelText(/homework photo/i), photoFile());
  await waitFor(() => expect(screen.getByRole("button", { name: /mark it/i })).toBeEnabled());
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

describe("paywall", () => {
  it("shows how many free rounds are left today", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByText(new RegExp(`${FREE_ROUNDS_PER_DAY} of ${FREE_ROUNDS_PER_DAY} free rounds`)),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));
    await user.click(screen.getByRole("button", { name: /quit round/i }));

    expect(
      screen.getByText(
        new RegExp(`${FREE_ROUNDS_PER_DAY - 1} of ${FREE_ROUNDS_PER_DAY} free rounds`),
      ),
    ).toBeInTheDocument();
  });

  it("blocks the next round once the allowance is spent", async () => {
    const user = userEvent.setup();
    render(<App />);

    await spendFreeRounds(user);
    await user.click(screen.getByRole("button", { name: /key stage 2/i }));

    expect(screen.getByRole("heading", { name: /today's free rounds/i })).toBeInTheDocument();
    expect(screen.queryByText(/question 1 of/i)).not.toBeInTheDocument();
  });

  it("lets a locked-out learner back out to the stage picker", async () => {
    const user = userEvent.setup();
    render(<App />);
    await spendFreeRounds(user);
    await user.click(screen.getByRole("button", { name: /key stage 2/i }));

    await user.click(screen.getByRole("button", { name: /maybe later/i }));

    expect(screen.getByRole("heading", { name: /pick a stage/i })).toBeInTheDocument();
    expect(screen.getByText(/free rounds are all used up/i)).toBeInTheDocument();
  });

  it("opens the plans view from the stage picker before the limit is hit", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /see plans/i }));

    expect(screen.getByRole("heading", { name: /subscribe for unlimited rounds/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mochi monthly/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mochi yearly/i })).toBeInTheDocument();
    expect(screen.getByText(/no payment is taken/i)).toBeInTheDocument();
  });

  it("lifts the limit once subscribed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await spendFreeRounds(user);
    await user.click(screen.getByRole("button", { name: /key stage 2/i }));

    await user.click(screen.getByRole("button", { name: /mochi monthly/i }));

    expect(screen.getByRole("heading", { name: /your subscription/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to stages/i }));
    expect(screen.getByText(/unlimited rounds/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /key stage 2/i }));
    expect(screen.getByText(new RegExp(`question 1 of ${ROUND_SIZE}`, "i"))).toBeInTheDocument();
  });

  it("keeps the subscription across a reload and can cancel it", async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(screen.getByRole("button", { name: /see plans/i }));
    await user.click(screen.getByRole("button", { name: /mochi yearly/i }));
    first.unmount();

    render(<App />);
    await user.click(screen.getByRole("button", { name: /manage subscription/i }));
    expect(screen.getByText(/mochi yearly/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel subscription/i }));

    expect(screen.getByRole("heading", { name: /subscribe for unlimited rounds/i })).toBeInTheDocument();
  });

  it("sends a locked-out learner to the plans view from photo marking", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /mark my homework/i }));

    expect(screen.getByRole("heading", { name: /photo marking is for subscribers/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/homework photo/i)).not.toBeInTheDocument();
  });

  it("does not hand back free rounds when saved progress is cleared", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /key stage 1/i }));
    await playWholeRound(user);
    await user.click(screen.getByRole("button", { name: /back to stages/i }));
    await user.click(screen.getByRole("button", { name: /parent & teacher dashboard/i }));
    await user.click(screen.getByRole("button", { name: /clear saved progress/i }));
    await user.click(screen.getByRole("button", { name: /back to stages/i }));

    expect(
      screen.getByText(
        new RegExp(`${FREE_ROUNDS_PER_DAY - 1} of ${FREE_ROUNDS_PER_DAY} free rounds`),
      ),
    ).toBeInTheDocument();
  });
});

describe("homework marking", () => {
  it("opens for a subscriber", async () => {
    const user = userEvent.setup();
    render(<App />);
    await subscribe(user);

    await user.click(screen.getByRole("button", { name: /mark my homework/i }));

    expect(screen.getByRole("heading", { name: /mark my homework/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/homework photo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark it/i })).toBeDisabled();
  });

  it("marks a chosen photo against the chosen stage", async () => {
    const user = userEvent.setup();
    const marker = vi.fn<Marker>().mockResolvedValue(MARKING);
    render(<App marker={marker} />);
    await subscribe(user);
    await user.click(screen.getByRole("button", { name: /mark my homework/i }));

    await user.selectOptions(screen.getByLabelText(/which stage/i), "ks3");
    await choosePhoto(user);
    await user.click(screen.getByRole("button", { name: /mark it/i }));

    expect(await screen.findByText(MARKING.overall)).toBeInTheDocument();
    expect(marker).toHaveBeenCalledWith({
      stage: "ks3",
      mediaType: "image/png",
      base64: btoa("homework"),
    });
  });

  it("shows every question Mochi marked, with the score", async () => {
    const user = userEvent.setup();
    render(<App marker={vi.fn<Marker>().mockResolvedValue(MARKING)} />);
    await subscribe(user);
    await user.click(screen.getByRole("button", { name: /mark my homework/i }));
    await choosePhoto(user);

    await user.click(screen.getByRole("button", { name: /mark it/i }));

    expect(await screen.findByText(/1 of 3 correct/i)).toBeInTheDocument();
    expect(screen.getByText(/could not read/i)).toBeInTheDocument();
    expect(screen.getByText("Try counting up.")).toBeInTheDocument();
    expect(screen.getAllByText(/you wrote: 56/i)).toHaveLength(2);
    // The unanswered question shows no "you wrote" line at all.
    expect(screen.getByText("Too blurry to read.")).toBeInTheDocument();
  });

  it("shows a marking failure as a message the learner can act on", async () => {
    const user = userEvent.setup();
    const marker = vi
      .fn<Marker>()
      .mockRejectedValue(new MarkingError("Mochi could not reach the marking service."));
    render(<App marker={marker} />);
    await subscribe(user);
    await user.click(screen.getByRole("button", { name: /mark my homework/i }));
    await choosePhoto(user);

    await user.click(screen.getByRole("button", { name: /mark it/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the marking/i);
  });

  it("refuses a file that is not a photo, without calling the service", async () => {
    // applyAccept is off because the `accept` attribute is only a hint — a
    // camera or file picker can still hand back something else.
    const user = userEvent.setup({ applyAccept: false });
    const marker = vi.fn<Marker>().mockResolvedValue(MARKING);
    render(<App marker={marker} />);
    await subscribe(user);
    await user.click(screen.getByRole("button", { name: /mark my homework/i }));

    await user.upload(
      screen.getByLabelText(/homework photo/i),
      new File(["%PDF-"], "homework.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG, PNG/i);
    expect(screen.getByRole("button", { name: /mark it/i })).toBeDisabled();
    expect(marker).not.toHaveBeenCalled();
  });

  it("returns to the stage picker", async () => {
    const user = userEvent.setup();
    render(<App />);
    await subscribe(user);
    await user.click(screen.getByRole("button", { name: /mark my homework/i }));

    await user.click(screen.getByRole("button", { name: /back to stages/i }));

    expect(screen.getByRole("heading", { name: /pick a stage/i })).toBeInTheDocument();
  });
});
