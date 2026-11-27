
type SettlementExpense = {
  group: string;
  payments: { name: string; amount: number }[];
  shares: { name: string; amount: number }[];
};

export type Settlement = {
  group: string;
  from: string;
  to: string;
  amount: number;
};

type MemberBalance = {
  name: string;
  balance: number;
};

export function calculateSettlements(
  expenses: SettlementExpense[]
): Settlement[] {
  const groupBalances = new Map<string, Map<string, number>>();

  // Calculate each person's net balance in each group.
  for (const expense of expenses) {
    if (!groupBalances.has(expense.group)) {
      groupBalances.set(expense.group, new Map());
    }

    const balances = groupBalances.get(expense.group)!;

    for (const payment of expense.payments) {
      const amount = Math.round(payment.amount * 100);

      balances.set(
        payment.name,
        (balances.get(payment.name) ?? 0) + amount
      );
    }

    for (const share of expense.shares) {
      const amount = Math.round(share.amount * 100);

      balances.set(
        share.name,
        (balances.get(share.name) ?? 0) - amount
      );
    }
  }

  const settlements: Settlement[] = [];

  // Simplify debts separately within each group.
  for (const [group, balances] of groupBalances) {
    const debtors: MemberBalance[] = [];
    const creditors: MemberBalance[] = [];

    for (const [name, balance] of balances) {
      if (balance < 0) {
        debtors.push({ name, balance });
      } else if (balance > 0) {
        creditors.push({ name, balance });
      }
    }

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (
      debtorIndex < debtors.length &&
      creditorIndex < creditors.length
    ) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      const amount = Math.min(
        -debtor.balance,
        creditor.balance
      );

      settlements.push({
        group,
        from: debtor.name,
        to: creditor.name,
        amount: amount / 100,
      });

      debtor.balance += amount;
      creditor.balance -= amount;

      if (debtor.balance === 0) {
        debtorIndex++;
      }

      if (creditor.balance === 0) {
        creditorIndex++;
      }
    }

    // A non-zero remainder means the group's expense data
    // is not balanced. Do not silently generate settlements.
    const remainder = [...balances.values()].reduce(
      (sum, balance) => sum + balance,
      0
    );

    if (remainder !== 0) {
      throw new Error(
        `Unbalanced expense records in group: ${group}`
      );
    }
  }

  return settlements;
}
