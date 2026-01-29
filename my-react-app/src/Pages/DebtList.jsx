import { useEffect, useMemo, useRef, useState } from "react";
import "../Styles/DebtList.css";

const STORAGE_KEY = "debt_discipline_debts_v3";

/* ---------- helpers ---------- */
function normalizeDueDay(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(31, Math.max(1, Math.round(n)));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

function getFirstPaymentDate(dueDay) {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), normalizeDueDay(dueDay));
  if (first < today) {
    return new Date(today.getFullYear(), today.getMonth() + 1, normalizeDueDay(dueDay));
  }
  return first;
}

function payoffProjection({ remainingBalance, monthlyAmount, dueDay }) {
  const balance = safeNumber(remainingBalance, 0);
  const monthly = safeNumber(monthlyAmount, 0);

  if (balance <= 0) return { months: 0, paidBy: null };
  if (monthly <= 0) return { months: null, paidBy: null };

  const months = Math.ceil(balance / monthly);
  const firstPayment = getFirstPaymentDate(dueDay);
  const paidByDate = addMonths(firstPayment, months - 1);
  return { months, paidBy: paidByDate };
}

function formatMonthYear(date) {
  if (!date) return "";
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function loadDebtsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Normalize + migration support
    return parsed.map((d) => {
      const remaining = safeNumber(d.remainingBalance ?? d.balance ?? 0);
      const original = safeNumber(d.originalBalance ?? d.original ?? remaining);

      return {
        id: d.id ?? (crypto?.randomUUID?.() ?? String(Date.now())),
        name: d.name ?? d.text ?? "Untitled debt",
        dueDay: normalizeDueDay(d.dueDay ?? 1),
        monthlyAmount: safeNumber(d.monthlyAmount ?? d.amount ?? 0),
        remainingBalance: remaining,
        originalBalance: original > 0 ? original : remaining,
        completed: Boolean(d.completed),
      };
    });
  } catch (err) {
    console.error("Failed to load debts:", err);
    return [];
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- component ---------- */
function DebtList() {
  const [debts, setDebts] = useState(() => loadDebtsFromStorage());

  // Add form fields
  const [name, setName] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [remainingBalance, setRemainingBalance] = useState("");

  // Filter + Sort
  const [filter, setFilter] = useState("all"); // all | completed | incomplete
  const [sortBy, setSortBy] = useState("dueDay"); // dueDay | remaining | monthly
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDueDay, setEditDueDay] = useState(1);
  const [editMonthlyAmount, setEditMonthlyAmount] = useState("");
  const [editRemainingBalance, setEditRemainingBalance] = useState("");

  // Import file input ref
  const importRef = useRef(null);

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

    const totalRemaining = debts.reduce((sum, d) => sum + safeNumber(d.remainingBalance, 0), 0);
    const totalOriginal = debts.reduce((sum, d) => sum + safeNumber(d.originalBalance, 0), 0);
    const totalMonthly = debts.reduce((sum, d) => sum + safeNumber(d.monthlyAmount, 0), 0);

    const overallPct =
      totalOriginal > 0 ? clamp(((totalOriginal - totalRemaining) / totalOriginal) * 100, 0, 100) : 0;

    let overallMonths = null;
    let overallPaidBy = null;

    if (totalRemaining <= 0) {
      overallMonths = 0;
      overallPaidBy = null;
    } else if (totalMonthly > 0) {
      overallMonths = Math.ceil(totalRemaining / totalMonthly);
      overallPaidBy = addMonths(new Date(), overallMonths);
    }

    return {
      total: debts.length,
      completed,
      incomplete,
      totalRemaining,
      totalOriginal,
      totalMonthly,
      overallPct,
      overallMonths,
      overallPaidBy,
    };
  }, [debts]);

  const filteredAndSorted = useMemo(() => {
    let list = debts;

    if (filter === "completed") list = list.filter((d) => d.completed);
    if (filter === "incomplete") list = list.filter((d) => !d.completed);

    const dir = sortDir === "asc" ? 1 : -1;

    const sorted = [...list].sort((a, b) => {
      let av, bv;

      if (sortBy === "dueDay") {
        av = normalizeDueDay(a.dueDay);
        bv = normalizeDueDay(b.dueDay);
      } else if (sortBy === "remaining") {
        av = safeNumber(a.remainingBalance, 0);
        bv = safeNumber(b.remainingBalance, 0);
      } else {
        av = safeNumber(a.monthlyAmount, 0);
        bv = safeNumber(b.monthlyAmount, 0);
      }

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return sorted;
  }, [debts, filter, sortBy, sortDir]);

  /* ---- actions ---- */
  const addDebt = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const remaining = safeNumber(remainingBalance, 0);

    const newDebt = {
      id: crypto?.randomUUID?.() ?? String(Date.now()),
      name: trimmed,
      dueDay: normalizeDueDay(dueDay),
      monthlyAmount: safeNumber(monthlyAmount, 0),
      remainingBalance: remaining,
      originalBalance: remaining, // used for progress %
      completed: false,
    };

    setDebts((prev) => [newDebt, ...prev]);

    setName("");
    setDueDay(1);
    setMonthlyAmount("");
    setRemainingBalance("");
  };

  const toggleCompleted = (id) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, completed: !d.completed } : d)));
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
      prev.map((d) => {
        if (d.id !== id) return d;

        const newRemaining = safeNumber(editRemainingBalance, d.remainingBalance);
        const oldOriginal = safeNumber(d.originalBalance, 0);

        // Keep originalBalance at least as large as remainingBalance (prevents negative progress)
        const newOriginal = oldOriginal > 0 ? Math.max(oldOriginal, newRemaining) : newRemaining;

        return {
          ...d,
          name: trimmed,
          dueDay: normalizeDueDay(editDueDay),
          monthlyAmount: safeNumber(editMonthlyAmount, d.monthlyAmount),
          remainingBalance: newRemaining,
          originalBalance: newOriginal,
        };
      })
    );

    cancelEdit();
  };

  const exportDebts = () => {
    downloadJson("debts.json", debts);
  };

  const triggerImport = () => {
    importRef.current?.click();
  };

  const importDebts = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        alert("Import failed: JSON must be an array.");
        return;
      }

      const normalized = parsed.map((d) => {
        const remaining = safeNumber(d.remainingBalance ?? d.balance ?? 0);
        const original = safeNumber(d.originalBalance ?? d.original ?? remaining);

        return {
          id: d.id ?? (crypto?.randomUUID?.() ?? String(Date.now())),
          name: String(d.name ?? d.text ?? "Untitled debt"),
          dueDay: normalizeDueDay(d.dueDay ?? 1),
          monthlyAmount: safeNumber(d.monthlyAmount ?? d.amount ?? 0),
          remainingBalance: remaining,
          originalBalance: original > 0 ? original : remaining,
          completed: Boolean(d.completed),
        };
      });

      // Replace current list (simple + predictable)
      setDebts(normalized);
    } catch (err) {
      console.error(err);
      alert("Import failed: invalid JSON file.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <div className="debtListPage">
      <h1 className="debtListTitle">Debt Tracker</h1>

      <p className="debtListSummary">
        Total: <b>{counts.total}</b> • Completed: <b>{counts.completed}</b> • Incomplete:{" "}
        <b>{counts.incomplete}</b>
        <br />
        Total Monthly: <b>{money(counts.totalMonthly)}</b> • Total Remaining:{" "}
        <b>{money(counts.totalRemaining)}</b>
        <br />
        Overall payoff: <b>{counts.overallPct.toFixed(0)}%</b>
        <br />
        Payoff estimate:{" "}
        <b>
          {counts.overallMonths === null
            ? "—"
            : counts.overallMonths === 0
            ? "Paid off"
            : `${counts.overallMonths} mo`}
        </b>
        {counts.overallMonths && counts.overallMonths > 0 ? (
          <>
            {" "}
            • Paid by <b>{formatMonthYear(counts.overallPaidBy)}</b>
          </>
        ) : null}
      </p>

      {/* Overall progress bar */}
      <div className="progressWrap">
        <div className="progressBar">
          <div className="progressFill" style={{ "--pct": `${counts.overallPct}%` }} />
        </div>
        <div className="progressText">
          {money(counts.totalOriginal - counts.totalRemaining)} paid • {money(counts.totalRemaining)} remaining
        </div>
      </div>

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

      {/* Filter / Sort / Export-Import controls */}
      <div className="controlsRow">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterButton>
        <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")}>
          Completed
        </FilterButton>
        <FilterButton active={filter === "incomplete"} onClick={() => setFilter("incomplete")}>
          Incomplete
        </FilterButton>

        {counts.completed > 0 && (
          <button className="smallButton" type="button" onClick={clearCompleted}>
            Clear completed
          </button>
        )}

        <span style={{ marginLeft: "auto" }} />

        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="dueDay">Sort: Due day</option>
          <option value="remaining">Sort: Remaining balance</option>
          <option value="monthly">Sort: Monthly amount</option>
        </select>

        <select className="select" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>

        <button className="smallButton" type="button" onClick={exportDebts}>
          Export JSON
        </button>

        <button className="smallButton" type="button" onClick={triggerImport}>
          Import JSON
        </button>

        <input
          ref={importRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => importDebts(e.target.files?.[0])}
        />
      </div>

      {/* List */}
      {filteredAndSorted.length === 0 ? (
        <p className="emptyState">
          No debts to show{filter !== "all" ? ` for "${filter}"` : ""}.
        </p>
      ) : (
        <ul className="debtList">
          {filteredAndSorted.map((debt) => {
            const isEditing = editingId === debt.id;

            const proj = payoffProjection(debt);
            const original = safeNumber(debt.originalBalance, safeNumber(debt.remainingBalance, 0));
            const remaining = safeNumber(debt.remainingBalance, 0);
            const pct =
              original > 0 ? clamp(((original - remaining) / original) * 100, 0, 100) : 0;

            return (
              <li key={debt.id} className="debtItem">
                <div className="debtItemBody">
                  <div className="debtTopRow">
                    <input
                      type="checkbox"
                      checked={debt.completed}
                      onChange={() => toggleCompleted(debt.id)}
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
                    <>
                      <div className="debtMeta">
                        <span className="pill">Due: {debt.dueDay}</span>
                        <span className="pill">Monthly: {money(debt.monthlyAmount)}</span>
                        <span className="pill">Remaining: {money(debt.remainingBalance)}</span>

                        <span className="pill">
                          Payoff:{" "}
                          {proj.months === null
                            ? "—"
                            : proj.months === 0
                            ? "Paid off"
                            : `${proj.months} mo`}
                        </span>

                        {proj.months && proj.months > 0 ? (
                          <span className="pill">Paid by: {formatMonthYear(proj.paidBy)}</span>
                        ) : null}
                      </div>

                      <div className="progressWrap">
                        <div className="progressBar">
                          <div className="progressFill" style={{ "--pct": `${pct}%` }} />
                        </div>
                        <div className="progressText">{pct.toFixed(0)}% paid</div>
                      </div>
                    </>
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

                {!isEditing ? (
                  <div className="actionsRow">
                    <button
                      className="smallButton primaryButton"
                      type="button"
                      onClick={() => startEdit(debt)}
                    >
                      Edit
                    </button>
                    <button className="smallButton" type="button" onClick={() => removeDebt(debt.id)}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="actionsRow">
                    <button className="smallButton primaryButton" type="button" onClick={() => saveEdit(debt.id)}>
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
