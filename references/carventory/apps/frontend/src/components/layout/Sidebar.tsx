import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CarFrontIcon,
  Users2Icon,
  UserCheck2Icon,
  MessageCircleIcon,
  CalendarCheck2Icon,
  HandCoinsIcon,
  BadgeCheckIcon,
  FileBarChart2Icon,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        window.innerWidth < 1024 &&
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        toggleSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  const menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { title: 'Car Inventory', icon: <CarFrontIcon size={20} />, path: '/cars' },
    { title: 'Sellers', icon: <Users2Icon size={20} />, path: '/sellers' },
    { title: 'Buyers', icon: <UserCheck2Icon size={20} />, path: '/buyers' },
    { title: 'Inquiries', icon: <MessageCircleIcon size={20} />, path: '/inquiries' },
    { title: 'Bookings', icon: <CalendarCheck2Icon size={20} />, path: '/bookings' },
    { title: 'Accounts', icon: <HandCoinsIcon size={20} />, path: '/accounts' },
    { title: 'Employees', icon: <BadgeCheckIcon size={20} />, path: '/employee' }
  ];
  return (
    <motion.aside
      ref={sidebarRef}
      className={`fixed top-0 left-0 bottom-0 z-30 bg-[#001529] dark:bg-gray-900 border-r border-gray-200/20 dark:border-gray-800 pt-6 transition-all shadow-xl ${isOpen ? 'w-64' : 'w-0 lg:w-64'
        } overflow-hidden`}
      initial={false}
      animate={{ width: isOpen ? '16rem' : window.innerWidth >= 1024 ? '16rem' : '0' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="px-6 py-5 flex items-center mb-12">
        <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg ring-1 ring-blue-400/30">
          <CarFrontIcon size={24} />
        </div>
        <h1 className="text-2xl font-bold ml-3 text-white dark:text-gray-100 tracking-tight">
          Carventory
        </h1>
      </div>

      <nav className="px-4">
        <div className="px-4 mb-5 text-xs font-semibold text-gray-300 dark:text-gray-400 uppercase tracking-widest">
          Navigation
        </div>
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25, ease: 'easeOut' }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-300
                  ${isActive
                    ? 'bg-blue-500/20 text-blue-300 dark:bg-blue-900/60 dark:text-blue-200'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  } group relative overflow-hidden
                `}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              >
                <span className="mr-3 text-gray-300 group-hover:text-white dark:text-gray-400 dark:group-hover:text-white transition-colors duration-300">
                  {item.icon}
                </span>
                <span className="font-medium">{item.title}</span>
                <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </NavLink>
            </motion.li>
          ))}
        </ul>
      </nav>
    </motion.aside>
  );
};

export default Sidebar;