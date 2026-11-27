
import { useState } from "react";
import type { FormEvent } from "react";
import { X, ReceiptText } from "lucide-react";

interface AddExpenseModalProps {
  groups: {
    name: string;
    memberNames: string[];
  }[];

  onClose: () => void;

  onAdd: (expense: {
    title: string;
    group: string;
    amount: number;
    payments: {
      name: string;
      amount: number;
    }[];
    shares: {
      name: string;
      amount: number;
    }[];
    splitMode: "equal" | "custom";
  }) => void;
}

function toPaise(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return null;
  }

  const [rupees, paise = ""] = value.trim().split(".");
  return Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
}

function fromPaise(value: number): number {
  return value / 100;
}

export default function AddExpenseModal({
  groups,
  onClose,
  onAdd,
}: AddExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [group, setGroup] = useState(groups[0]?.name ?? "");
  const [amount, setAmount] = useState("");

  const [selectedPayers, setSelectedPayers] = useState<string[]>([]);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(
    {}
  );

  const [participants, setParticipants] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customShares, setCustomShares] = useState<Record<string, string>>(
    {}
  );

  const [error, setError] = useState("");

  const selectedGroup = groups.find((item) => item.name === group);
  const members = selectedGroup?.memberNames ?? [];

  function handleGroupChange(groupName: string) {
    const newGroup = groups.find((item) => item.name === groupName);

    setGroup(groupName);
    setSelectedPayers([]);
    setPayerAmounts({});
    setParticipants(newGroup?.memberNames ?? []);
    setCustomShares({});
    setError("");
  }

  function togglePayer(name: string) {
    setSelectedPayers((current) =>
      current.includes(name)
        ? current.filter((person) => person !== name)
        : [...current, name]
    );
  }

  function toggleParticipant(name: string) {
    setParticipants((current) =>
      current.includes(name)
        ? current.filter((person) => person !== name)
        : [...current, name]
    );
  }

  function handlePayerAmountChange(name: string, value: string) {
    setPayerAmounts((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleCustomShareChange(name: string, value: string) {
    setCustomShares((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const totalPaise = toPaise(amount);

    if (!title.trim()) {
      setError("Please enter an expense title.");
      return;
    }

    if (!group) {
      setError("Please select a group.");
      return;
    }

    if (totalPaise === null || totalPaise <= 0) {
      setError("Enter a valid amount with up to two decimal places.");
      return;
    }

    if (selectedPayers.length === 0) {
      setError("Please select at least one person who paid.");
      return;
    }

    if (participants.length === 0) {
      setError("Please select at least one participant.");
      return;
    }

    // Calculate how much each payer contributed.
    const payments: { name: string; amount: number }[] = [];

    for (const name of selectedPayers) {
      const paymentPaise = toPaise(payerAmounts[name] ?? "");

      if (paymentPaise === null || paymentPaise <= 0) {
        setError(`Enter a valid payment amount for ${name}.`);
        return;
      }

      payments.push({
        name,
        amount: fromPaise(paymentPaise),
      });
    }

    const totalPaidPaise = payments.reduce(
      (sum, payment) => sum + Math.round(payment.amount * 100),
      0
    );

    if (totalPaidPaise !== totalPaise) {
      setError("The total contributions must equal the expense amount.");
      return;
    }

    // Calculate each participant's share.
    let shares: { name: string; amount: number }[] = [];

    if (splitMode === "equal") {
      const baseShare = Math.floor(totalPaise / participants.length);
      const remainder = totalPaise % participants.length;

      shares = participants.map((name, index) => ({
        name,
        amount: fromPaise(baseShare + (index < remainder ? 1 : 0)),
      }));
    } else {
      for (const name of participants) {
        const sharePaise = toPaise(customShares[name] ?? "");

        if (sharePaise === null || sharePaise < 0) {
          setError(`Enter a valid share for ${name}.`);
          return;
        }

        shares.push({
          name,
          amount: fromPaise(sharePaise),
        });
      }

      const totalSharesPaise = shares.reduce(
        (sum, share) => sum + Math.round(share.amount * 100),
        0
      );

      if (totalSharesPaise !== totalPaise) {
        setError("The total participant shares must equal the expense amount.");
        return;
      }
    }

    onAdd({
      title: title.trim(),
      group,
      amount: fromPaise(totalPaise),
      payments,
      shares,
      splitMode,
    });

    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="expense-modal">
        <div className="modal-header">
          <div className="modal-icon">
            <ReceiptText size={22} />
          </div>

          <div>
            <h2>Add an expense</h2>
            <p>Record who paid and how the expense is split.</p>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Expense title
            <input
              type="text"
              placeholder="e.g. Hotel booking"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label>
            Group
            <select
              value={group}
              onChange={(event) => handleGroupChange(event.target.value)}
            >
              {groups.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Total expense amount (₹)
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 1500"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <div>
            <h3>Who paid?</h3>
            <p>Select everyone who contributed and enter their amounts.</p>

            <div className="participant-list">
              {members.map((name) => {
                const isSelected = selectedPayers.includes(name);

                return (
                  <div className="participant-option" key={name}>
                    <label>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePayer(name)}
                      />
                      {name}
                    </label>

                    {isSelected && (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Amount ₹"
                        value={payerAmounts[name] ?? ""}
                        onChange={(event) =>
                          handlePayerAmountChange(name, event.target.value)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3>Who participated?</h3>
            <p>Select the people who should share this expense.</p>

            <div className="participant-list">
              {members.map((name) => (
                <label className="participant-option" key={name}>
                  <input
                    type="checkbox"
                    checked={participants.includes(name)}
                    onChange={() => toggleParticipant(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3>How should it be split?</h3>

            <div className="split-options">
              <label>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "equal"}
                  onChange={() => setSplitMode("equal")}
                />
                Equal split
              </label>

              <label>
                <input
                  type="radio"
                  name="splitMode"
                  checked={splitMode === "custom"}
                  onChange={() => setSplitMode("custom")}
                />
                Custom split
              </label>
            </div>
          </div>

          {splitMode === "custom" && (
            <div>
              <h3>Enter each person's share</h3>

              <div className="participant-list">
                {participants.map((name) => (
                  <label className="participant-option" key={name}>
                    <span>{name}</span>

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Share ₹"
                      value={customShares[name] ?? ""}
                      onChange={(event) =>
                        handleCustomShareChange(name, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="submit-expense">
            Add expense
          </button>
        </form>
      </div>
    </div>
  );
}
