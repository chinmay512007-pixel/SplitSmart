
type BalanceExpense = {
  group: string;
  payments: {
    name: string;
    amount: number;
  }[];
  shares: {
    name: string;
    amount: number;
  }[];
};

type BalanceResult = {
  youOwe: number;
  youAreOwed: number;
  netBalance: number;
  groupsYouOwe: number;
  groupsOwingYou: number;
};

export function calculateBalances(
  expenses: BalanceExpense[],
  currentUser: string
): BalanceResult {
  // Store each person's balance separately for each group.
  const groupBalances = new Map<string, Map<string, number>>();

  for (const expense of expenses) {
    if (!groupBalances.has(expense.group)) {
      groupBalances.set(expense.group, new Map());
    }

    const members = groupBalances.get(expense.group)!;

    // Add money paid by each person.
    for (const payment of expense.payments) {
      const paise = Math.round(payment.amount * 100);

      members.set(
        payment.name,
        (members.get(payment.name) ?? 0) + paise
      );
    }

    // Subtract each person's share.
    for (const share of expense.shares) {
      const paise = Math.round(share.amount * 100);

      members.set(
        share.name,
        (members.get(share.name) ?? 0) - paise
      );
    }
  }

  let youOwe = 0;
  let youAreOwed = 0;
  let groupsYouOwe = 0;
  let groupsOwingYou = 0;

  // Calculate the current user's position in each group.
  for (const members of groupBalances.values()) {
    const userBalance = members.get(currentUser) ?? 0;

    if (userBalance < 0) {
      youOwe += Math.abs(userBalance);
      groupsYouOwe++;
    } else if (userBalance > 0) {
      youAreOwed += userBalance;
      groupsOwingYou++;
    }
  }

  const netBalance = youAreOwed - youOwe;

  return {
    youOwe: youOwe / 100,
    youAreOwed: youAreOwed / 100,
    netBalance: netBalance / 100,
    groupsYouOwe,
    groupsOwingYou,
  };
}
