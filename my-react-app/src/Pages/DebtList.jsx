import { useEffect, useMemo, useState } from "react";
import "../Styles/DebtList.css";

const STORAGE_KEY = "debt_discipline_debts_v2";

function normalizeDueDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(31, Math.max(1, Math.round(n)));
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function DebtList() {
  const [debts, setDebts] = useState([]);

  // Add form fields
  const [name, setName] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [remainingBalance, setRemainingBalance] = useState("");

  // Filter
  const [filter, setFilter] = useState("all"); // all | completed | incomplete

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDueDay, setEditDueDay] = useState(1);
  const [editMonthlyAmount, setEditMonthlyAmount] = useState("");
  const [editRemainingBalance, setEditRemainingBalance] = useState("");

  // Load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      // Normalize in case older saved shape exists
      const normalized = parsed.map((d) => ({
        id: d.id ?? (crypto?.randomUUID?.() ?? String(Date.now())),
        name: d.name ?? d.text ?? "Untitled debt",
        dueDay: normalizeDueDay(d.dueDay ?? 1),
        monthlyAmount: safeNumber(d.monthlyAmount ?? d.amount ?? 0),
        remainingBalance: safeNumber(d.remainingBalance ?? d.balance ?? 0),
        completed: Boolean(d.completed),
      }));

      setDebts(normalized);
    } catch (err) {
      console.error("Failed to load debts:", err);
    }
  }, []);

  // Save whenever debts change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(debts));
    } catch (err) {
      console.error("Failed to save debts:", err);
    }
  }, [debts]);

  const counts = useMemo(() => {
    const completed = debts.filter((d) => d.completed).length;
    const incomplete = debts.length - completed;
    const totalBalance = debts.reduce((sum, d) => sum + safeNumber(d.remainingBalance, 0), 0);
    const totalMonthly = debts.reduce((sum, d) => sum + safeNumber(d.monthlyAmount, 0), 0);
    return { total: debts.length, completed, incomplete, totalBalance, totalMonthly };
  }, [debts]);

  const filteredDebts = useMemo(() => {
    if (filter === "completed") return debts.filter((d) => d.completed);
    if (filter === "incomplete") return debts.filter((d) => !d.completed);
    return debts;
  }, [debts, filter]);

  const addDebt = (e) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    const newDebt = {
      id: crypto?.randomUUID?.() ?? String(Date.now()),
      name: trimmed,
      dueDay: normalizeDueDay(dueDay),
      monthlyAmount: safeNumber(monthlyAmount, 0),
      remainingBalance: safeNumber(remainingBalance, 0),
      completed: false,
    };

    setDebts((prev) => [newDebt, ...prev]);

    // reset form
    setName("");
    setDueDay(1);
    setMonthlyAmount("");
    setRemainingBalance("");
  };

  const toggleCompleted = (id) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d))
    );
  };

  const removeDebt = (id) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    if (editingId === id) cancelEdit();
  };

  const clearCompleted = () => {
    setDebts((prev) => prev.filter((d) => !d.completed));
    if (editingId && debts.find((d) => d.id === editingId)?.completed) cancelEdit();
  };

  const startEdit = (debt) => {
    setEditingId(debt.id);
    setEditName(debt.name);
    setEditDueDay(debt.dueDay);
    setEditMonthlyAmount(String(debt.monthlyAmount ?? 0));
    setEditRemainingBalance(String(debt.remainingBalance ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDueDay(1);
    setEditMonthlyAmount("");
    setEditRemainingBalance("");
  };

  const saveEdit = (id) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    setDebts((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              name: trimmed,
              dueDay: normalizeDueDay(editDueDay),
              monthlyAmount: safeNumber(editMonthlyAmount, d.monthlyAmount),
              remainingBalance: safeNumber(editRemainingBalance, d.remainingBalance),
            }
          : d
      )
    );

    cancelEdit();
  };

  return (
    <div className="debtListPage">
      <h1 className="debtListTitle">Debt Tracker</h1>

      <p className="debtListSummary">
        Total: <b>{counts.total}</b> • Completed: <b>{counts.completed}</b> •
        Incomplete: <b>{counts.incomplete}</b>
        <br />
        Total Monthly: <b>{money(counts.totalMonthly)}</b> • Total Remaining:{" "}
        <b>{money(counts.totalBalance)}</b>
      </p>

      {/* Add debt form */}
      <form className="debtForm" onSubmit={addDebt}>
        <div className="field">
          <span className="label">Debt name</span>
          <input
            className="debtInput"
            type="text"
            placeholder="e.g., Visa Card"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="label">Due day</span>
          <input
            className="debtInput"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="label">Monthly amount</span>
          <input
            className="debtInput"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 150"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="label">Remaining balance</span>
          <input
            className="debtInput"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 3200"
            value={remainingBalance}
            onChange={(e) => setRemainingBalance(e.target.value)}
          />
        </div>

        <div className="field" style={{ justifyContent: "flex-end" }}>
          <span className="label">&nbsp;</span>
          <button className="addButton" type="submit">
            Add
          </button>
        </div>
      </form>

      {/* Filters + bulk actions */}
      <div className="actionsRow">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterButton>
        <FilterButton
          active={filter === "completed"}
          onClick={() => setFilter("completed")}
        >
          Completed
        </FilterButton>
        <FilterButton
          active={filter === "incomplete"}
          onClick={() => setFilter("incomplete")}
        >
          Incomplete
        </FilterButton>

        {counts.completed > 0 && (
          <button className="smallButton" type="button" onClick={clearCompleted}>
            Clear completed
          </button>
        )}
      </div>

      {/* List */}
      {filteredDebts.length === 0 ? (
        <p className="emptyState">
          No debts to show{filter !== "all" ? ` for "${filter}"` : ""}.
        </p>
      ) : (
        <ul className="debtList">
          {filteredDebts.map((debt) => {
            const isEditing = editingId === debt.id;

            return (
              <li key={debt.id} className="debtItem">
                <div className="debtItemBody">
                  <div className="debtTopRow">
                    <input
                      type="checkbox"
                      checked={debt.completed}
                      onChange={() => toggleCompleted(debt.id)}
                      aria-label={`Mark ${debt.name} completed`}
                    />

                    {!isEditing ? (
                      <span
                        className={[
                          "debtText",
                          debt.completed ? "debtTextCompleted" : "",
                        ].join(" ")}
                      >
                        {debt.name}
                      </span>
                    ) : (
                      <input
                        className="miniInput"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="debtMeta">
                      <span className="pill">Due: {debt.dueDay}</span>
                      <span className="pill">Monthly: {money(debt.monthlyAmount)}</span>
                      <span className="pill">Remaining: {money(debt.remainingBalance)}</span>
                    </div>
                  ) : (
                    <div className="debtMeta">
                      <span className="pill">
                        Due day:{" "}
                        <input
                          className="miniInput"
                          type="number"
                          min="1"
                          max="31"
                          value={editDueDay}
                          onChange={(e) => setEditDueDay(e.target.value)}
                        />
                      </span>

                      <span className="pill">
                        Monthly:{" "}
                        <input
                          className="miniInput"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editMonthlyAmount}
                          onChange={(e) => setEditMonthlyAmount(e.target.value)}
                        />
                      </span>

                      <span className="pill">
                        Remaining:{" "}
                        <input
                          className="miniInput"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editRemainingBalance}
                          onChange={(e) => setEditRemainingBalance(e.target.value)}
                        />
                      </span>
                    </div>
                  )}
                </div>

                {/* Row actions */}
                {!isEditing ? (
                  <div className="actionsRow">
                    <button
                      className="smallButton primaryButton"
                      type="button"
                      onClick={() => startEdit(debt)}
                    >
                      Edit
                    </button>
                    <button
                      className="smallButton"
                      type="button"
                      onClick={() => removeDebt(debt.id)}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="actionsRow">
                    <button
                      className="smallButton primaryButton"
                      type="button"
                      onClick={() => saveEdit(debt.id)}
                    >
                      Save
                    </button>
                    <button className="smallButton" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      className={["filterButton", active ? "filterButtonActive" : ""].join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default DebtList;
