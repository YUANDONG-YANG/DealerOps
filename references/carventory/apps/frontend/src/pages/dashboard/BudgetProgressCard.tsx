import React from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import { Budget } from '../../utils';

interface BudgetProgressCardProps {
  budgets: Budget[];
}

const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({ budgets }) => {
  return (
    <Card title="Budget Progress" className="mb-6">
      <div className="space-y-5">
        {budgets.map((budget, index) => {
          const percentage = Math.min(100, Math.round((budget.spent / budget.allocated) * 100));
          const isOverBudget = budget.spent > budget.allocated;

          return (
            <div key={budget.id} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {budget.category}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ${budget.spent.toFixed(2)} / ${budget.allocated.toFixed(2)}
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                  style={{ backgroundColor: isOverBudget ? '#EF4444' : budget.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {percentage}% {isOverBudget && '(Over budget)'}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default BudgetProgressCard;