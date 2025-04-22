// Expense Tracker App in React with Context API and Chart.js (Styled with Tailwind CSS)
import React, { createContext, useContext, useReducer, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale, // Added for potential future use with bar charts etc.
  LinearScale    // Added for potential future use
} from "chart.js";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

// --- Context, Reducer, Provider, Hook ---

const TransactionContext = createContext();

// Load initial state safely, ensuring it's always an array
const loadInitialState = () => {
  try {
    const stored = localStorage.getItem("transactions");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error parsing transactions from localStorage:", error);
    return []; // Return empty array on error
  }
};
const initialState = loadInitialState();

// Transaction Reducer
const transactionReducer = (state, action) => {
  let newState;
  switch (action.type) {
    case "ADD":
      // Ensure new transactions have a category, default if necessary
      const newTransaction = { ...action.payload, category: action.payload.category || 'other' };
      newState = [...state, newTransaction];
      break; // Added break statement
    case "DELETE":
      newState = state.filter((t) => t.id !== action.payload);
      break; // Added break statement
    // EDIT case removed
    default:
      newState = state; // Assign state to newState
  }
  // Persist state after modification
  try {
    localStorage.setItem("transactions", JSON.stringify(newState));
  } catch (error) {
    console.error("Error saving transactions to localStorage:", error);
  }
  return newState;
};

// Transaction Provider Component
const TransactionProvider = ({ children }) => {
  const [transactions, dispatch] = useReducer(transactionReducer, initialState);

  // Effect to handle potential external updates to localStorage (optional, but good practice)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'transactions') {
        // Potentially reload state or dispatch an action if external changes detected
        // For simplicity, we'll just log it here
        console.log("localStorage transactions changed externally.");
        // Example: dispatch({ type: 'RELOAD_STATE', payload: loadInitialState() });
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  return (
    <TransactionContext.Provider value={{ transactions, dispatch }}>
      {children}
    </TransactionContext.Provider>
  );
};

// Custom Hook to use Transaction Context
const useTransactions = () => useContext(TransactionContext);

// --- UI Components ---

// Component to display today's total expenses
const TodayExpenses = () => {
  const { transactions } = useTransactions();
  const today = new Date().toISOString().slice(0, 10);

  const todayTransactions = transactions.filter(t => t.date === today);
  const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow-md text-white">
      <div className="flex items-center mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h2 className="text-lg font-semibold">Today's Expenses</h2>
      </div>
      <p className="text-3xl font-bold">₹{todayTotal.toFixed(2)}</p>
      <p className="text-sm text-blue-100 mt-2">{todayTransactions.length} transaction(s) today</p>
    </div>
  );
};

// Component to display current month's total expenses and top categories
const MonthlyExpenses = () => {
  const { transactions } = useTransactions();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const [year, month] = t.date.split('-').map(Number);
    return month === currentMonth && year === currentYear;
  });

  const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Group by category for the month
  const monthlyCategories = {};
  monthlyTransactions.forEach(t => {
    const category = t.category || 'other'; // Use 'other' if category is missing
    monthlyCategories[category] = (monthlyCategories[category] || 0) + t.amount;
  });

  const sortedCategories = Object.entries(monthlyCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // Top 3 categories

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow-md text-white">
      <div className="flex items-center mb-3">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
         </svg>
        <h2 className="text-lg font-semibold">
          {monthNames[now.getMonth()]} {currentYear}
        </h2>
      </div>
      <p className="text-3xl font-bold">₹{monthlyTotal.toFixed(2)}</p>

      {sortedCategories.length > 0 && (
        <div className="mt-3 pt-3 border-t border-green-400">
          <h3 className="text-sm font-medium text-green-100 mb-2">Top Categories:</h3>
          <div className="space-y-1">
            {sortedCategories.map(([category, amount]) => (
              <div key={category} className="flex justify-between text-sm">
                <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                <span className="font-medium">₹{amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for setting and displaying the monthly budget
const BudgetSetting = () => {
  const [budget, setBudget] = React.useState(() => localStorage.getItem('monthlyBudget') || '');
  const [isEditing, setIsEditing] = React.useState(!localStorage.getItem('monthlyBudget'));
  const { transactions } = useTransactions();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const [year, month] = t.date.split('-').map(Number);
    return month === currentMonth && year === currentYear;
  });

  const totalSpent = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
  const budgetNum = parseFloat(budget) || 0;
  const remaining = budgetNum - totalSpent;
  const percentUsed = budgetNum ? Math.min(100, Math.max(0, (totalSpent / budgetNum) * 100)) : 0; // Ensure percentage is between 0 and 100

  const handleSaveBudget = () => {
    const budgetValue = parseFloat(budget);
    if (!isNaN(budgetValue) && budgetValue >= 0) {
      localStorage.setItem('monthlyBudget', budgetValue.toString());
      setIsEditing(false);
    } else {
      alert("Please enter a valid non-negative number for the budget.");
      setBudget(localStorage.getItem('monthlyBudget') || ''); // Reset to previous valid value or empty
    }
  };

  const handleEditClick = () => {
    // Load current budget value when starting edit
    setBudget(localStorage.getItem('monthlyBudget') || '');
    setIsEditing(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-indigo-700">Monthly Budget</h2>
        {!isEditing && budgetNum > 0 ? (
          <button
            onClick={handleEditClick}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            Edit Budget
          </button>
        ) : null}
      </div>

      {isEditing || !localStorage.getItem('monthlyBudget') ? ( // Show input if editing or no budget ever set
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Set monthly budget (e.g., 5000)"
            className="flex-1 border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            min="0"
            step="any" // Allow decimals
          />
          <button
            onClick={handleSaveBudget}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition whitespace-nowrap"
          >
            Save Budget
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Budget:</span>
            <span className="font-semibold">₹{budgetNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Spent:</span>
            <span className="font-semibold">₹{totalSpent.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-gray-600">Remaining:</span>
            <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{remaining.toFixed(2)}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                percentUsed >= 100 ? 'bg-red-600' :
                percentUsed > 75 ? 'bg-yellow-500' : 'bg-green-600' // Adjusted thresholds
              }`}
              style={{ width: `${percentUsed}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {percentUsed.toFixed(0)}% used
          </div>
        </>
      )}
    </div>
  );
};

// Form component to add a new transaction
const AddTransaction = () => {
  const { dispatch } = useTransactions();
  const [desc, setDesc] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState("other");
  const [errors, setErrors] = React.useState({});

  const categories = [
    "food", "transportation", "entertainment", "utilities",
    "shopping", "health", "education", "housing", "other"
  ];

  const validateForm = () => {
    const newErrors = {};
    if (!desc.trim()) newErrors.desc = "Description is required";
    else if (desc.trim().length < 2) newErrors.desc = "Min. 2 characters";

    if (!amount) newErrors.amount = "Amount is required";
    else if (isNaN(amount) || parseFloat(amount) <= 0) newErrors.amount = "Must be positive";

    if (!category) newErrors.category = "Category required"; // Should not trigger with default

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const newTransaction = {
      id: Date.now(), // Use timestamp as a simple unique ID
      desc: desc.trim(),
      amount: parseFloat(amount),
      date: new Date().toISOString().slice(0, 10),
      category
    };
    dispatch({ type: "ADD", payload: newTransaction });

    // Reset form
    setDesc("");
    setAmount("");
    setCategory("other");
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            id="description"
            type="text"
            placeholder="e.g., Groceries, Rent"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={`w-full border ${errors.desc ? 'border-red-500' : 'border-gray-300'} p-2.5 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
            aria-invalid={!!errors.desc}
            aria-describedby={errors.desc ? "desc-error" : undefined}
          />
          {errors.desc && <p id="desc-error" className="text-red-500 text-xs mt-1">{errors.desc}</p>}
        </div>

        <div className="md:col-span-1">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
          <input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`w-full border ${errors.amount ? 'border-red-500' : 'border-gray-300'} p-2.5 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
            min="0.01"
            step="0.01"
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? "amount-error" : undefined}
          />
          {errors.amount && <p id="amount-error" className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>

        <div className="md:col-span-1">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? "category-error" : undefined}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          {errors.category && <p id="category-error" className="text-red-500 text-xs mt-1">{errors.category}</p>}
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors duration-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Expense
        </button>
      </div>
    </form>
  );
};

// Component to display the 5 most recent transactions
const RecentTransactions = () => {
  const { transactions } = useTransactions();

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id) // Sort by date desc, then ID
    .slice(0, 5);

  if (recentTransactions.length === 0) {
    return <p className="text-gray-500 italic text-center py-4">No recent activity</p>;
  }

  const categoryColors = { /* ... same colors as in TransactionList ... */
    food: "bg-green-100 text-green-800", transportation: "bg-blue-100 text-blue-800",
    entertainment: "bg-purple-100 text-purple-800", utilities: "bg-yellow-100 text-yellow-800",
    shopping: "bg-pink-100 text-pink-800", health: "bg-red-100 text-red-800",
    education: "bg-indigo-100 text-indigo-800", housing: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-3">
      {recentTransactions.map((t) => (
        <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
          <div>
            <span className="font-medium text-gray-800 block">{t.desc}</span>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span className="inline-block bg-gray-200 text-gray-700 rounded px-2 py-0.5 whitespace-nowrap">
                {t.date}
              </span>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${categoryColors[t.category || 'other'] || categoryColors.other}`}>
                {(t.category || 'Other').charAt(0).toUpperCase() + (t.category || 'other').slice(1)}
              </span>
            </div>
          </div>
          <span className="font-semibold text-lg text-red-600 whitespace-nowrap">-₹{t.amount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

// Component to filter transactions by a specific date
const DateFilter = () => {
  const [selectedDate, setSelectedDate] = React.useState("");
  const { transactions } = useTransactions();

  const handleDateChange = (e) => setSelectedDate(e.target.value);

  const filteredTransactions = selectedDate ? transactions.filter(t => t.date === selectedDate) : [];
  const totalForDate = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="border-t pt-4 mt-6"> {/* Added margin-top */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label htmlFor="date-filter" className="font-medium text-gray-700 text-sm whitespace-nowrap">Filter by date:</label>
        <div className="flex-1 min-w-[160px]">
          <input
            type="date"
            id="date-filter"
            value={selectedDate}
            onChange={handleDateChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        {selectedDate && (
          <button
            onClick={() => setSelectedDate("")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm transition"
          >
            Clear Filter
          </button>
        )}
      </div>

      {selectedDate && (
        <div className={`mt-3 p-3 rounded-md text-sm ${filteredTransactions.length > 0 ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-600'}`}>
          {filteredTransactions.length > 0 ? (
            <>
              <p className="font-medium">
                Total for {selectedDate}: <span className="font-bold">₹{totalForDate.toFixed(2)}</span> ({filteredTransactions.length} transaction(s))
              </p>
              {/* Optional: List filtered transactions here */}
              {/* <ul className="list-disc list-inside mt-2">
                {filteredTransactions.map(t => <li key={t.id}>{t.desc}: ₹{t.amount.toFixed(2)}</li>)}
              </ul> */}
            </>
          ) : (
            <p className="italic">No transactions found for {selectedDate}.</p>
          )}
        </div>
      )}
    </div>
  );
};

// Component for searching transactions
const SearchTransactions = ({ onSearch }) => {
  return (
    <div className="mb-4">
       <label htmlFor="search-transactions" className="sr-only">Search Transactions</label> {/* Accessibility */}
      <input
        id="search-transactions"
        type="text"
        placeholder="Search by description or category..."
        onChange={(e) => onSearch(e.target.value)}
        className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
};

// Component displaying the list of all transactions with search and delete
const TransactionList = () => {
  const { transactions, dispatch } = useTransactions();
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredTransactions = transactions.filter(t => {
    const category = t.category || '';
    return t.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
           category.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id); // Sort newest first

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      dispatch({ type: "DELETE", payload: id });
    }
  };

  if (transactions.length === 0) {
    return <p className="text-gray-500 italic text-center mt-4 py-4">No transactions recorded yet. Add one above!</p>;
  }

  const categoryColors = { /* ... same colors ... */
    food: "bg-green-100 text-green-800", transportation: "bg-blue-100 text-blue-800",
    entertainment: "bg-purple-100 text-purple-800", utilities: "bg-yellow-100 text-yellow-800",
    shopping: "bg-pink-100 text-pink-800", health: "bg-red-100 text-red-800",
    education: "bg-indigo-100 text-indigo-800", housing: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <SearchTransactions onSearch={setSearchTerm} />

      {filteredTransactions.length === 0 && searchTerm && (
         <p className="text-gray-500 italic text-center mt-4 py-4">No transactions match your search: "{searchTerm}".</p>
      )}

      {filteredTransactions.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm"> {/* Added shadow */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">{t.desc}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${categoryColors[t.category || 'other'] || categoryColors.other}`}>
                      {(t.category || 'Other').charAt(0).toUpperCase() + (t.category || 'other').slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{t.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-red-600">-₹{t.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-600 hover:text-red-800 transition inline-flex items-center justify-center p-1 rounded hover:bg-red-100" // Added padding/hover bg
                      title="Delete transaction"
                    >
                       <span className="sr-only">Delete transaction {t.desc}</span> {/* Accessibility */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

// Component for displaying spending breakdown by category using a Pie chart
const ExpenseChart = () => {
  const { transactions } = useTransactions();

  if (transactions.length === 0) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg h-full flex flex-col justify-center items-center shadow-sm"> {/* Centering content & added shadow */}
        <h3 className="text-lg font-semibold mb-2 text-indigo-700">Spending Breakdown</h3>
        <p className="text-gray-500 text-sm">Add transactions to see the chart.</p>
      </div>
    );
  }

  // Group expenses by category and calculate total
  const categoryTotals = transactions.reduce((acc, t) => {
    const category = t.category || 'other'; // Default to 'other' if undefined
    acc[category] = (acc[category] || 0) + t.amount;
    return acc;
  }, {});

  const total = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

  // Sort categories by amount (highest to lowest) and calculate percentages
  const sortedData = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: ((amount / total) * 100).toFixed(1)
    }));

  const chartData = {
    labels: sortedData.map(item => `${item.category} (${item.percentage}%)`),
    datasets: [{
      data: sortedData.map(item => item.amount),
      backgroundColor: [
        '#4CAF50', // Green
        '#2196F3', // Blue
        '#FFC107', // Yellow
        '#F44336', // Red
        '#9C27B0', // Purple
        '#FF9800', // Orange
        '#00BCD4', // Cyan
        '#795548', // Brown
        '#607D8B', // Blue Grey
      ],
      borderColor: '#ffffff',
      borderWidth: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container height
    plugins: {
      legend: {
        position: 'top', // Or 'bottom', 'left', 'right'
        labels: {
            boxWidth: 12, // Smaller color boxes
            padding: 15 // Spacing between legend items
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              // Format as currency
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed);
            }
            return label;
          }
        }
      }
    },
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col"> {/* Ensure height and flex column */}
      <h3 className="text-lg font-semibold mb-4 text-center text-indigo-700">Spending Breakdown</h3>
      <div className="flex-grow relative" style={{ minHeight: '250px' }}> {/* Ensure minimum height and relative positioning */}
         {/* Added minHeight to prevent collapse */}
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};


// --- Main App Component ---

function App() {
  return (
    <TransactionProvider>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-indigo-800">
              Expense Tracker Dashboard
            </h1>
          </header>

          {/* Top Row: Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <TodayExpenses />
            <MonthlyExpenses />
          </div>

          {/* Budget Section */}
          <BudgetSetting />

          {/* Add Transaction Form */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold text-indigo-700 mb-4">Add New Expense</h2>
            <AddTransaction />
          </div>

          {/* Mid Row: Recent Transactions & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-indigo-700 mb-4">Recent Activity</h2>
              <RecentTransactions />
              <DateFilter /> {/* Date filter below recent transactions */}
            </div>
            <div className="lg:col-span-2 h-[400px] md:h-[500px]"> {/* Explicit height for chart container */}
              <ExpenseChart />
            </div>
          </div>

          {/* Bottom Section: Full Transaction List */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-indigo-700 mb-4">All Transactions</h2>
            <TransactionList />
          </div>

        </div>
      </div>
    </TransactionProvider>
  );
}

export default App;
