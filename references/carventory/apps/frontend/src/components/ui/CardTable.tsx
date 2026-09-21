import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  glassmorphism?: boolean;
  header?: React.ReactNode; 
}

const Card: React.FC<CardProps> = ({
  title,
  header,
  children,
  className = '',
  glassmorphism = false
}) => {
  const baseClasses = "rounded-xl overflow-hidden shadow-sm";
  const glassmorphismClasses = glassmorphism
    ? "bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-white/20 dark:border-gray-700/30"
    : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700";

  return (
    <motion.div
      className={`${baseClasses} ${glassmorphismClasses} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(title || header) && (
        <div className="px-5 py-0 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          {title && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {title}
            </h2>
          )}
          {header && <div>{header}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
};

export default Card;
