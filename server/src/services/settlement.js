/**
 * Smart Settlement Algorithm
 * 
 * Goal: Minimize the number of transactions needed to settle all debts.
 * 
 * Algorithm (Debt Simplification):
 * 1. Compute net balance for each person (positive = they're owed, negative = they owe)
 * 2. Use a min-heap / two-pointer approach:
 *    - Creditors (positive balance) sorted descending
 *    - Debtors (negative balance) sorted ascending (most negative first)
 *    - Match largest creditor with largest debtor iteratively
 * 3. This produces the minimum number of transactions to settle all debts
 */

/**
 * @param {Array} members - Array of { id, name, avatar_url, net_balance }
 *                          net_balance: positive = they're owed money, negative = they owe
 * @returns {Array} transactions - Array of { from, to, amount }
 */
function computeSettlements(members) {
    // Filter out zero balances & clone
    let creditors = [];  // people who are owed money (net > 0)
    let debtors = [];    // people who owe money (net < 0)

    for (const m of members) {
        const net = parseInt(m.net_balance);
        if (net > 0) {
            creditors.push({ id: m.id, name: m.name, avatar_url: m.avatar_url, balance: net });
        } else if (net < 0) {
            debtors.push({ id: m.id, name: m.name, avatar_url: m.avatar_url, balance: Math.abs(net) });
        }
    }

    // Sort descending for greedy matching
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => b.balance - a.balance);

    const settlements = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const amount = Math.min(creditor.balance, debtor.balance);

        if (amount > 0) {
            settlements.push({
                from: { id: debtor.id, name: debtor.name, avatar_url: debtor.avatar_url },
                to: { id: creditor.id, name: creditor.name, avatar_url: creditor.avatar_url },
                amount,  // in cents
                amount_formatted: (amount / 100).toFixed(2),
            });
        }

        creditor.balance -= amount;
        debtor.balance -= amount;

        // Advance pointer of the one that's now settled
        if (creditor.balance === 0) i++;
        if (debtor.balance === 0) j++;
    }

    return settlements;
}

module.exports = { computeSettlements };
