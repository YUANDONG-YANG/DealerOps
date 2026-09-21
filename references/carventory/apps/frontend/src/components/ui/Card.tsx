import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../layout/ThemeContext'; // Import the theme context

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  glassmorphism?: boolean;
  header?: ReactNode;
  style?: React.CSSProperties; // Corrected from string to React.CSSProperties
}

const Card: React.FC<CardProps> = ({
  title,
  header,
  children,
  className = '',
  glassmorphism = false,
  style,
}) => {
  const { theme } = useTheme(); // Use theme context

  const baseClasses = 'rounded-xl overflow-hidden shadow-sm';
  const glassmorphismClasses = glassmorphism
    ? 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-white/20 dark:border-gray-700/30'
    : theme === 'dark'
    ? 'bg-gray-800 border border-gray-700'
    : 'bg-white border border-gray-100';

  return (
    <motion.div
      className={`${baseClasses} ${glassmorphismClasses} ${className}`}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(title || header) && (
        <div
          className={`px-5 py-4 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
          } flex items-center justify-between`}
        >
          {title && (
            <h2
              className={`text-lg font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}
            >
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