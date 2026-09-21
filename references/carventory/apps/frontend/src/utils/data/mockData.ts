import { Budget, FinancialGoal, FinancialSummary, Notification } from '../index';

export const financialSummary: FinancialSummary = {
  balance: 12450.75,
  income: 5800.00,
  expenses: 2350.25,
  savings: 1500.00
};

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

export const recentTransactions: Transaction[] = [
  { id: '1', date: '2025-06-10', description: 'Grocery Store', category: 'Food', amount: 85.32, type: 'expense' },
  { id: '2', date: '2025-06-09', description: 'Salary Deposit', category: 'Income', amount: 3200.00, type: 'income' },
  { id: '3', date: '2025-06-08', description: 'Electric Bill', category: 'Utilities', amount: 124.56, type: 'expense' },
  { id: '4', date: '2025-06-07', description: 'Freelance Payment', category: 'Income', amount: 850.00, type: 'income' },
  { id: '5', date: '2025-06-06', description: 'Coffee Shop', category: 'Food', amount: 4.50, type: 'expense' },
  { id: '6', date: '2025-06-05', description: 'Gym Membership', category: 'Health', amount: 59.99, type: 'expense' },
  { id: '7', date: '2025-06-04', description: 'Book Purchase', category: 'Education', amount: 45.00, type: 'expense' },
  { id: '8', date: '2025-06-03', description: 'Stock Dividend', category: 'Investment', amount: 120.00, type: 'income' },
  { id: '9', date: '2025-06-02', description: 'Online Subscription', category: 'Entertainment', amount: 12.99, type: 'expense' },
  { id: '10', date: '2025-06-01', description: 'Taxi Fare', category: 'Transport', amount: 20.00, type: 'expense' },
  { id: '11', date: '2025-05-31', description: 'Gadget Sale', category: 'Income', amount: 300.00, type: 'income' },
  { id: '12', date: '2025-05-30', description: 'House Rent', category: 'Housing', amount: 950.00, type: 'expense' },
  { id: '13', date: '2025-05-29', description: 'Car Maintenance', category: 'Transport', amount: 230.00, type: 'expense' },
  { id: '14', date: '2025-05-28', description: 'Bonus Received', category: 'Income', amount: 600.00, type: 'income' },
  { id: '15', date: '2025-05-27', description: 'Lunch with Friends', category: 'Food', amount: 34.20, type: 'expense' },
  { id: '16', date: '2025-05-26', description: 'Yoga Class', category: 'Health', amount: 25.00, type: 'expense' },
  { id: '17', date: '2025-05-25', description: 'Parking Fee', category: 'Transport', amount: 8.00, type: 'expense' },
  { id: '18', date: '2025-05-24', description: 'Tax Refund', category: 'Income', amount: 150.00, type: 'income' },
  { id: '19', date: '2025-05-23', description: 'Pet Supplies', category: 'Other', amount: 60.75, type: 'expense' },
  { id: '20', date: '2025-05-22', description: 'Investment Gain', category: 'Investment', amount: 500.00, type: 'income' },
  { id: '21', date: '2025-05-21', description: 'Donation', category: 'Other', amount: 100.00, type: 'expense' },
  { id: '22', date: '2025-05-20', description: 'Movie Tickets', category: 'Entertainment', amount: 18.00, type: 'expense' },
  { id: '23', date: '2025-05-19', description: 'Internet Bill', category: 'Utilities', amount: 55.00, type: 'expense' },
  { id: '24', date: '2025-05-18', description: 'Bike Sale', category: 'Income', amount: 150.00, type: 'income' },
  { id: '25', date: '2025-05-17', description: 'Grocery Store', category: 'Food', amount: 90.10, type: 'expense' },
  { id: '26', date: '2025-05-16', description: 'Interest Income', category: 'Investment', amount: 75.00, type: 'income' },
  { id: '27', date: '2025-05-15', description: 'Mobile Recharge', category: 'Utilities', amount: 15.00, type: 'expense' },
  { id: '28', date: '2025-05-14', description: 'Restaurant', category: 'Food', amount: 48.75, type: 'expense' },
  { id: '29', date: '2025-05-13', description: 'Online Course', category: 'Education', amount: 120.00, type: 'expense' },
  { id: '30', date: '2025-05-12', description: 'Cashback', category: 'Income', amount: 10.00, type: 'income' },
];


export const budgets: Budget[] = [
  {
    id: '1',
    category: 'Food',
    allocated: 500,
    spent: 342.87,
    color: '#3B82F6'
  },
  {
    id: '2',
    category: 'Transportation',
    allocated: 300,
    spent: 187.45,
    color: '#10B981'
  },
  {
    id: '3',
    category: 'Entertainment',
    allocated: 200,
    spent: 197.82,
    color: '#F59E0B'
  },
  {
    id: '4',
    category: 'Utilities',
    allocated: 400,
    spent: 310.56,
    color: '#8B5CF6'
  }
];

export const financialGoals: FinancialGoal[] = [
  {
    id: '1',
    name: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 6500,
    targetDate: '2025-12-31',
    color: '#3B82F6'
  },
  {
    id: '2',
    name: 'Vacation',
    targetAmount: 3000,
    currentAmount: 1200,
    targetDate: '2025-08-15',
    color: '#F59E0B'
  },
  {
    id: '3',
    name: 'New Computer',
    targetAmount: 2000,
    currentAmount: 800,
    targetDate: '2025-10-01',
    color: '#8B5CF6'
  }
];

export const monthlyExpenseData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Income',
      data: [4200, 4300, 5800, 4100, 5500, 5800],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: '#3B82F6',
      borderWidth: 2,
    },
    {
      label: 'Expenses',
      data: [2100, 1900, 2300, 2450, 2100, 2350],
      backgroundColor: 'rgba(245, 158, 11, 0.5)',
      borderColor: '#F59E0B',
      borderWidth: 2,
    }
  ]
};

export const categorySpendingData = {
  labels: ['Food', 'Housing', 'Transportation', 'Entertainment', 'Utilities', 'Other'],
  datasets: [
    {
      data: [18, 35, 12, 8, 15, 12],
      backgroundColor: [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Amber
        '#8B5CF6', // Purple
        '#F43F5E', // Rose
        '#A1A1AA'  // Gray
      ],
      borderWidth: 1,
    },
  ],
};

export const notifications: Notification[] = [
  {
    id: '1',
    title: 'Low Balance Alert',
    message: 'Your checking account balance is below $100',
    type: 'alert',
    date: '2025-06-10T09:30:00',
    read: false
  },
  {
    id: '2',
    title: 'Bill Payment Reminder',
    message: 'Your electricity bill is due in 3 days',
    type: 'warning',
    date: '2025-06-09T14:15:00',
    read: false
  },
  {
    id: '3',
    title: 'Savings Goal Reached',
    message: 'Congratulations! You reached your vacation savings goal',
    type: 'success',
    date: '2025-06-08T11:45:00',
    read: true
  },
  {
    id: '4',
    title: 'New Feature Available',
    message: 'Try our new budget optimization tool',
    type: 'info',
    date: '2025-06-07T16:20:00',
    read: true
  }
];