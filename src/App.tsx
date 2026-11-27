
import { useState, useEffect } from "react";

import {
  Wallet,
  Users,
  ReceiptText,
  ArrowLeftRight,
  Settings,
  Plus,
  Bell,
  ChevronRight,
  Plane,
  Home,
  Utensils,
  UserPlus,
  X,
  MessageCircle,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import AddExpenseModal from "./components/AddExpenseModal";
import CreateGroupModal from "./components/CreateGroupModal";

import { calculateBalances } from "./utils/balance";
import { calculateSettlements } from "./utils/settlement";

import "./App.css";

type Group = {
  id: number;
  name: string;
  memberNames: string[];
  icon: LucideIcon;
  color: string;
};

type Expense = {
  id: number;
  title: string;
  group: string;
  date: string;
  amount: number;
  icon: LucideIcon;
  payments: { name: string; amount: number }[];
  shares: { name: string; amount: number }[];
  splitMode: "equal" | "custom";
};

const initialGroups: Group[] = [];

const initialExpenses: Expense[] = [];

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ================= DATA PERSISTENCE =================

const GROUPS_STORAGE_KEY = "splitsmart_groups_v2";
const EXPENSES_STORAGE_KEY = "splitsmart_expenses_v2";

function getIconName(icon: LucideIcon): string {
  if (icon === Plane) return "Plane";
  if (icon === Home) return "Home";
  if (icon === Utensils) return "Utensils";
  if (icon === Users) return "Users";
  if (icon === ReceiptText) return "ReceiptText";

  return "Users";
}

function getIcon(iconName: string): LucideIcon {
  switch (iconName) {
    case "Plane":
      return Plane;
    case "Home":
      return Home;
    case "Utensils":
      return Utensils;
    case "ReceiptText":
      return ReceiptText;
    case "Users":
    default:
      return Users;
  }
}

function loadGroups(): Group[] {
  try {
    const savedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);

    if (!savedGroups) return initialGroups;

    const parsedGroups = JSON.parse(savedGroups);

    if (!Array.isArray(parsedGroups)) return initialGroups;

    return parsedGroups.map((group) => ({
      ...group,
      icon: getIcon(group.iconName),
    }));
  } catch {
    return initialGroups;
  }
}

function loadExpenses(): Expense[] {
  try {
    const savedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);

    if (!savedExpenses) return initialExpenses;

    const parsedExpenses = JSON.parse(savedExpenses);

    if (!Array.isArray(parsedExpenses)) return initialExpenses;

    return parsedExpenses.map((expense) => ({
      ...expense,
      icon: getIcon(expense.iconName),
    }));
  } catch {
    return initialExpenses;
  }
}

// ================= MAIN APP =================

function App() {
  const [groups, setGroups] = useState<Group[]>(loadGroups);
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const [activePage, setActivePage] = useState("Dashboard");

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    initialGroups[0]?.id ?? null
  );

  const [newMemberName, setNewMemberName] = useState("");
  const [groupMessage, setGroupMessage] = useState("");

  // Save groups whenever they change.

  useEffect(() => {
    try {
      const groupsToSave = groups.map((group) => ({
        ...group,
        iconName: getIconName(group.icon),
        icon: undefined,
      }));

      localStorage.setItem(
        GROUPS_STORAGE_KEY,
        JSON.stringify(groupsToSave)
      );
    } catch (error) {
      console.error("Could not save groups:", error);
    }
  }, [groups]);

  // Save expenses whenever they change.

  useEffect(() => {
    try {
      const expensesToSave = expenses.map((expense) => ({
        ...expense,
        iconName: getIconName(expense.icon),
        icon: undefined,
      }));

      localStorage.setItem(
        EXPENSES_STORAGE_KEY,
        JSON.stringify(expensesToSave)
      );
    } catch (error) {
      console.error("Could not save expenses:", error);
    }
  }, [expenses]);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null;

  const selectedGroupExpenses = selectedGroup
    ? expenses.filter((expense) => expense.group === selectedGroup.name)
    : [];

  const balances = calculateBalances(expenses, "Chinmay");

  const settlements = calculateSettlements(expenses);

  // ================= CREATE GROUP =================

  function handleCreateGroup(newGroup: {
    name: string;
    memberNames: string[];
  }) {
    const group: Group = {
      id: Date.now(),
      name: newGroup.name,
      memberNames: newGroup.memberNames,
      icon: Users,
      color: "purple",
    };

    setGroups((previousGroups) => [...previousGroups, group]);
    setSelectedGroupId(group.id);
    setShowCreateGroupModal(false);
    setActivePage("Groups");
    setGroupMessage("");
  }

  // ================= ADD MEMBER =================

  function handleAddMember() {
    if (!selectedGroup) return;

    const trimmedName = newMemberName.trim();

    if (!trimmedName) {
      setGroupMessage("Please enter a member name.");
      return;
    }

    const alreadyExists = selectedGroup.memberNames.some(
      (name) => name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (alreadyExists) {
      setGroupMessage("This member is already in the group.");
      return;
    }

    setGroups((previousGroups) =>
      previousGroups.map((group) =>
        group.id === selectedGroup.id
          ? {
              ...group,
              memberNames: [...group.memberNames, trimmedName],
            }
          : group
      )
    );

    setNewMemberName("");
    setGroupMessage(`${trimmedName} added successfully.`);
  }

  // ================= REMOVE MEMBER =================

  function handleRemoveMember(memberName: string) {
    if (!selectedGroup) return;

    const memberHasExpenses = expenses.some(
      (expense) =>
        expense.group === selectedGroup.name &&
        (expense.payments.some((payment) => payment.name === memberName) ||
          expense.shares.some((share) => share.name === memberName))
    );

    if (memberHasExpenses) {
      setGroupMessage(
        `${memberName} cannot be removed because they are part of an existing expense.`
      );
      return;
    }

    setGroups((previousGroups) =>
      previousGroups.map((group) =>
        group.id === selectedGroup.id
          ? {
              ...group,
              memberNames: group.memberNames.filter(
                (name) => name !== memberName
              ),
            }
          : group
      )
    );

    setGroupMessage(`${memberName} removed from the group.`);
  }

  // ================= ADD EXPENSE =================

  function handleAddExpense(
    newExpense: Omit<Expense, "id" | "date" | "icon">
  ) {
    const expense: Expense = {
      ...newExpense,
      id: Date.now(),
      date: "Just now",
      icon: ReceiptText,
    };

    setExpenses((previousExpenses) => [expense, ...previousExpenses]);
    setShowExpenseModal(false);
  }

  // ================= WHATSAPP SHARING =================

  function handleShareSettlements() {
    if (!selectedGroup) return;

    const groupSettlements = calculateSettlements(
      expenses.filter(
        (expense) => expense.group === selectedGroup.name
      )
    );

    const message = [
      `*${selectedGroup.name.toUpperCase()} - SETTLEMENT SUMMARY*`,
      "",
      groupSettlements.length > 0
        ? groupSettlements
            .map(
              (settlement) =>
                `• ${settlement.from} → ${settlement.to}: ${formatCurrency(
                  settlement.amount
                )}`
            )
            .join("\n")
        : "Everyone is settled up! No pending payments.",
      "",
      "_Generated using SplitSmart._",
    ].join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  // ================= RENDER =================

  return (
    <div className="app-container">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={21} />
          </div>
          <span>SplitSmart</span>
        </div>

        <div className="menu-label">MENU</div>

        <nav className="navigation">
          <button
            className={`nav-item ${
              activePage === "Dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("Dashboard")}
          >
            <Home size={19} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Groups" ? "active" : ""
            }`}
            onClick={() => setActivePage("Groups")}
          >
            <Users size={19} />
            <span>My Groups</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Settlements" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settlements")}
          >
            <ArrowLeftRight size={19} />
            <span>Settlements</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">C</div>
            <div>
              <strong>Chinmay</strong>
              <span>Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{activePage === "Groups" ? "My Groups" : activePage}</strong>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="avatar">C</div>
          </div>
        </header>

        {/* DASHBOARD */}

        {activePage === "Dashboard" && (
          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">OVERVIEW</p>
                <h1>Good evening!</h1>
                <p className="subtitle">
                  Here's what's happening with your shared expenses.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setShowExpenseModal(true)}
              >
                <Plus size={18} />
                Add expense
              </button>
            </section>

            {/* BALANCE CARDS */}

            <section className="balance-grid">
              <div className="balance-card">
                <div className="balance-card-top">
                  <span>You owe</span>
                  <div className="balance-icon red">
                    <Wallet size={19} />
                  </div>
                </div>
                <h2>{formatCurrency(balances.youOwe)}</h2>
                <p>
                  Across {balances.groupsYouOwe}{" "}
                  {balances.groupsYouOwe === 1 ? "group" : "groups"}
                </p>
              </div>

              <div className="balance-card">
                <div className="balance-card-top">
                  <span>You are owed</span>
                  <div className="balance-icon green">
                    <Wallet size={19} />
                  </div>
                </div>
                <h2>{formatCurrency(balances.youAreOwed)}</h2>
                <p>
                  Across {balances.groupsOwingYou}{" "}
                  {balances.groupsOwingYou === 1 ? "group" : "groups"}
                </p>
              </div>

              <div className="balance-card net-card">
                <div className="balance-card-top">
                  <span>Net balance</span>
                  <div className="balance-icon blue">
                    <ArrowLeftRight size={19} />
                  </div>
                </div>
                <h2>{formatCurrency(balances.netBalance)}</h2>
                <p>
                  {balances.netBalance >= 0
                    ? "You are in a positive balance"
                    : "You have an outstanding balance"}
                </p>
              </div>
            </section>

            {/* GROUPS AND EXPENSE HISTORY */}

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Your groups</h3>
                    <p>Manage your shared activities</p>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => setActivePage("Groups")}
                  >
                    View all
                  </button>
                </div>

                <div className="group-list">
                  {groups.map((group) => {
                    const GroupIcon = group.icon;

                    return (
                      <button
                        className="group-item"
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setActivePage("Groups");
                        }}
                      >
                        <div className={`group-icon ${group.color}`}>
                          <GroupIcon size={19} />
                        </div>

                        <div className="group-info">
                          <strong>{group.name}</strong>
                          <span>{group.memberNames.length} members</span>
                        </div>

                        <ChevronRight size={18} className="chevron" />
                      </button>
                    );
                  })}
                </div>

                <button
                  className="outline-button"
                  onClick={() => setShowCreateGroupModal(true)}
                >
                  <Plus size={17} />
                  Create new group
                </button>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Expense history</h3>
                    <p>All your recorded transactions</p>
                  </div>
                </div>

                <div className="expense-list">
                  {expenses.length > 0 ? (
                    expenses.map((expense) => {
                      const ExpenseIcon = expense.icon;

                      return (
                        <div className="expense-item" key={expense.id}>
                          <div className="expense-icon">
                            <ExpenseIcon size={18} />
                          </div>

                          <div className="expense-info">
                            <strong>{expense.title}</strong>
                            <span>
                              {expense.group} · {expense.date}
                            </span>
                            <span className="expense-subinfo">
                              Paid by{" "}
                              {expense.payments
                                .map((payment) => payment.name)
                                .join(", ")}
                              {" · "}
                              {expense.shares.length} participants
                            </span>
                          </div>

                          <div className="expense-amount">
                            {formatCurrency(expense.amount)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-group-message">
                      <ReceiptText size={28} />
                      <p>No expenses recorded yet.</p>
                    </div>
                  )}
                </div>

                <button
                  className="outline-button"
                  onClick={() => setShowExpenseModal(true)}
                >
                  <Plus size={17} />
                  Add expense
                </button>
              </div>
            </section>
          </div>
        )}

        {/* MY GROUPS PAGE */}

        {activePage === "Groups" && (
          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">GROUP MANAGEMENT</p>
                <h1>My Groups</h1>
                <p className="subtitle">
                  Manage your groups, members and shared expenses.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => setShowCreateGroupModal(true)}
              >
                <Plus size={18} />
                Create group
              </button>
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>All groups</h3>
                    <p>{groups.length} groups created</p>
                  </div>
                </div>

                <div className="group-list">
                  {groups.map((group) => {
                    const GroupIcon = group.icon;

                    return (
                      <button
                        className={`group-item ${
                          selectedGroupId === group.id ? "selected" : ""
                        }`}
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupId(group.id);
                          setGroupMessage("");
                        }}
                      >
                        <div className={`group-icon ${group.color}`}>
                          <GroupIcon size={19} />
                        </div>

                        <div className="group-info">
                          <strong>{group.name}</strong>
                          <span>{group.memberNames.length} members</span>
                        </div>

                        <ChevronRight size={18} className="chevron" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="panel">
                {selectedGroup ? (
                  <>
                    <div className="panel-heading">
                      <div>
                        <h3>{selectedGroup.name}</h3>
                        <p>
                          {selectedGroup.memberNames.length} group members
                        </p>
                      </div>
                    </div>

                    <div className="member-section">
                      <h4>Members</h4>

                      <div className="group-list">
                        {selectedGroup.memberNames.map((member) => (
                          <div className="group-item" key={member}>
                            <div className="avatar">
                              {member.charAt(0).toUpperCase()}
                            </div>

                            <div className="group-info">
                              <strong>{member}</strong>
                              <span>
                                {member === "Chinmay"
                                  ? "Administrator"
                                  : "Group member"}
                              </span>
                            </div>

                            {member !== "Chinmay" && (
                              <button
                                className="remove-member-button"
                                title={`Remove ${member}`}
                                onClick={() => handleRemoveMember(member)}
                              >
                                <X size={17} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <form
                        className="member-input-row"
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleAddMember();
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Enter member name"
                          value={newMemberName}
                          onChange={(event) => {
                            setNewMemberName(event.target.value);
                            setGroupMessage("");
                          }}
                        />

                        <button type="submit" className="add-member-button">
                          <UserPlus size={16} />
                          Add
                        </button>
                      </form>

                      {groupMessage && (
                        <p className="group-message">{groupMessage}</p>
                      )}
                    </div>

                    <div className="group-expenses-section">
                      <div className="panel-heading">
                        <div>
                          <h3>Group expenses</h3>
                          <p>
                            {selectedGroupExpenses.length} recorded expenses
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                          <button
                            className="text-button"
                            onClick={handleShareSettlements}
                          >
                            <MessageCircle size={16} />
                            WhatsApp
                          </button>

                          <button
                            className="text-button"
                            onClick={() => setShowExpenseModal(true)}
                          >
                            <Plus size={15} />
                            Add
                          </button>
                        </div>
                      </div>

                      {selectedGroupExpenses.length > 0 ? (
                        <div className="expense-list">
                          {selectedGroupExpenses.map((expense) => (
                            <div className="expense-item" key={expense.id}>
                              <div className="expense-icon">
                                <ReceiptText size={18} />
                              </div>

                              <div className="expense-info">
                                <strong>{expense.title}</strong>
                                <span>{expense.date}</span>
                                <span className="expense-subinfo">
                                  Paid by{" "}
                                  {expense.payments
                                    .map((payment) => payment.name)
                                    .join(", ")}
                                </span>
                              </div>

                              <div className="expense-amount">
                                {formatCurrency(expense.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="subtitle">
                          No expenses have been added to this group yet.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-group-message">
                    <Users size={30} />
                    <h3>No group selected</h3>
                    <p>Create a group to get started.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* SETTLEMENTS PAGE */}

        {activePage === "Settlements" && (
          <div className="dashboard settlements-page">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">PAYMENT SUMMARY</p>
                <h1>Settlements</h1>
                <p className="subtitle">
                  See who needs to pay whom and how much.
                </p>
              </div>
            </section>

            <section className="settlement-summary">
              <div className="balance-card">
                <div className="balance-card-top">
                  <span>Suggested payments</span>
                  <div className="balance-icon purple">
                    <ArrowLeftRight size={19} />
                  </div>
                </div>
                <h2>{settlements.length}</h2>
                <p>Transfers across all groups</p>
              </div>

              <div className="balance-card">
                <div className="balance-card-top">
                  <span>Total to be settled</span>
                  <div className="balance-icon green">
                    <Wallet size={19} />
                  </div>
                </div>
                <h2>
                  {formatCurrency(
                    settlements.reduce(
                      (total, settlement) => total + settlement.amount,
                      0
                    )
                  )}
                </h2>
                <p>Total value of suggested transfers</p>
              </div>
            </section>

            <section className="panel settlement-panel">
              <div className="panel-heading">
                <div>
                  <h3>Settlement breakdown</h3>
                  <p>Suggested payments, organised by group</p>
                </div>
              </div>

              {settlements.length > 0 ? (
                <div className="settlement-list">
                  {settlements.map((settlement, index) => (
                    <div
                      className="settlement-item"
                      key={`${settlement.group}-${settlement.from}-${settlement.to}-${index}`}
                    >
                      <div className="settlement-group-label">
                        <span>{settlement.group}</span>
                        <span className="settlement-tag">
                          Suggested transfer
                        </span>
                      </div>

                      <div className="settlement-people">
                        <div className="settlement-member">
                          <span className="settlement-role">FROM</span>
                          <div className="settlement-member-info">
                            <div className="member-avatar">
                              {settlement.from.charAt(0).toUpperCase()}
                            </div>
                            <strong>{settlement.from}</strong>
                          </div>
                        </div>

                        <div className="settlement-member">
                          <span className="settlement-role">TO</span>
                          <div className="settlement-member-info">
                            <div className="member-avatar receiver-avatar">
                              {settlement.to.charAt(0).toUpperCase()}
                            </div>
                            <strong>{settlement.to}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="settlement-bottom">
                        <span>Amount to transfer</span>
                        <strong>{formatCurrency(settlement.amount)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-group-message">
                  <ArrowLeftRight size={30} />
                  <h3>All settled up!</h3>
                  <p>There are currently no outstanding payments.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SETTINGS PAGE */}

        {activePage === "Settings" && (
          <div className="dashboard">
            <section className="welcome-section">
              <div>
                <p className="eyebrow">PREFERENCES</p>
                <h1>Settings</h1>
                <p className="subtitle">
                  Manage your SplitSmart preferences.
                </p>
              </div>
            </section>

            <section className="panel">
              <h3>Account</h3>
              <p className="subtitle">
                You are currently using SplitSmart as Chinmay.
              </p>
            </section>
          </div>
        )}
      </main>

      {/* ADD EXPENSE MODAL */}

      {showExpenseModal && (
        <AddExpenseModal
          groups={groups}
          onClose={() => setShowExpenseModal(false)}
          onAdd={handleAddExpense}
        />
      )}

      {/* CREATE GROUP MODAL */}

      {showCreateGroupModal && (
        <CreateGroupModal
          existingGroupNames={groups.map((group) => group.name)}
          onClose={() => setShowCreateGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}

export default App;
