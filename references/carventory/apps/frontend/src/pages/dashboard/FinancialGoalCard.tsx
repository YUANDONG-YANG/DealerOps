import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import Card from '../../components/ui/Card';
import { FinancialGoal } from '../../utils';

interface FinancialGoalCardProps {
  goals: FinancialGoal[];
}

const FinancialGoalCard: React.FC<FinancialGoalCardProps> = ({ goals }) => {
  return (
    <Card title="Financial Goals" className="mb-6">
      <div className="space-y-5">
        {goals.map((goal, index) => {
          const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const remainingAmount = goal.targetAmount - goal.currentAmount;
          const targetDate = new Date(goal.targetDate);

          return (
            <motion.div
              key={goal.id}
              className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center mb-2">
                <div className="p-2 rounded-full" style={{ backgroundColor: `${goal.color}20` }}>
                  <Target className="h-5 w-5" style={{ color: goal.color }} />
                </div>
                <h3 className="text-lg font-semibold ml-3 text-gray-800 dark:text-white">{goal.name}</h3>
              </div>

              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  ${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                </span>
                <span className="font-medium" style={{ color: goal.color }}>
                  {percentage}%
                </span>
              </div>

              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="absolute h-full rounded-full"
                  style={{ backgroundColor: goal.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                />
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                <span>
                  Target: {targetDate.toLocaleDateString()}
                </span>
                <span>
                  Remaining: ${remainingAmount.toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};

export default FinancialGoalCard;