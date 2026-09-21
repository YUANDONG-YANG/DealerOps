// import React, { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { User, Moon, Sun, X, LogOutIcon, MenuIcon, StoreIcon } from 'lucide-react';
// import { useTheme } from './ThemeContext';
// import { logout } from '../../services/auth';
// import { useNavigate } from 'react-router-dom';
// import { Dropdown, Menu, message } from 'antd';
// import { authService } from '../../services/api';
// import { NotificationHandler } from './NotificationHandler';

// interface HeaderProps {
//   toggleSidebar: () => void;
//   isSidebarOpen: boolean;
// }

// interface UsersInfo {
//   id: number;
//   ownerName: string;
//   email: string;
//   role: string;
//   userPhone: string;
//   userMobile: string;
//   active: boolean;
// }

// const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
//   const { theme, toggleTheme } = useTheme();
//   const [isScrolled, setIsScrolled] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [user, setUser] = useState<UsersInfo | null>(null);
//   const [showNotifications, setShowNotifications] = useState(false);
//   const navigate = useNavigate();

//   const fetchUser = async () => {
//     try {
//       setLoading(true);
//       const response = await authService.getUserInfo();
//       setUser(response.data || null);
//     } catch (error) {
//       message.error('Failed to fetch user');
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Only for testing
//   useEffect(() => {
//     sessionStorage.removeItem('notifiedOnce');
//   }, []);

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   const userMenu = (
//     <Menu>
//       <Menu.Item key="dealership" onClick={() => navigate('/dealership')} icon={<StoreIcon size={14} />}>
//         Dealership
//       </Menu.Item>
//       <Menu.Item key="logout" onClick={handleLogout} icon={<LogOutIcon size={14} />}>
//         Logout
//       </Menu.Item>
//     </Menu>
//   );

//   useEffect(() => {
//     window.addEventListener('scroll', () => setIsScrolled(window.scrollY > 10));
//     fetchUser();
//     return () => window.removeEventListener('scroll', () => { });
//   }, []);

//   return (
//     <header className={`fixed top-0 right-0 left-0 z-20 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
//       <div className="container mx-auto px-4 h-16 flex items-center justify-between">
//         <div className="flex items-center lg:hidden">
//           <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={toggleSidebar}>
//             {isSidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
//           </button>
//         </div>

//         <div className="lg:ml-auto flex items-center space-x-4">
//           <NotificationHandler
//             showNotifications={showNotifications}
//             setShowNotifications={setShowNotifications}
//           />

//           <motion.button
//             className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
//             whileHover={{ scale: 1.05 }}
//             whileTap={{ scale: 0.95 }}
//             onClick={toggleTheme}
//           >
//             {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
//           </motion.button>

//           <motion.div className="flex items-center space-x-2 pl-4 border-l border-gray-200 dark:border-gray-700" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
//             <Dropdown overlay={userMenu} placement="bottomRight">
//               <div className="flex items-center space-x-2 cursor-pointer">
//                 <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
//                   <User size={16} />
//                 </div>
//                 <div className="hidden md:block">
//                   <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
//                     {user?.ownerName || 'Loading...'}
//                   </p>
//                   <p className="text-xs text-gray-500 dark:text-gray-400">
//                     {user?.email || ''}
//                   </p>
//                 </div>
//               </div>
//             </Dropdown>
//           </motion.div>
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Header;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Moon, Sun, X, LogOutIcon, MenuIcon, StoreIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { logout, isAuthenticated } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Menu, message } from 'antd';
import { authService } from '../../services/api';
import { NotificationHandler } from './NotificationHandler';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

interface UsersInfo {
  id: number;
  ownerName: string;
  email: string;
  role: string;
  userPhone: string;
  userMobile: string;
  active: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UsersInfo | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await authService.getUserInfo();
      setUser(response.data || null);
    } catch (error) {
      message.error('Failed to fetch user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Reset session flag on load (for testing)
  useEffect(() => {
    sessionStorage.removeItem('notifiedOnce');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Auto logout when token expires
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAuthenticated()) {
        const alreadyNotified = sessionStorage.getItem('notifiedOnce');
        if (!alreadyNotified) {
          sessionStorage.setItem('notifiedOnce', 'true');
          console.log('Token expired. Logging out...');
          handleLogout();
        }
      }
    }, 5000); // check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const userMenu = (
    <Menu>
      <Menu.Item key="dealership" onClick={() => navigate('/dealership')} icon={<StoreIcon size={14} />}>
        Dealership
      </Menu.Item>
      <Menu.Item key="logout" onClick={handleLogout} icon={<LogOutIcon size={14} />}>
        Logout
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    window.addEventListener('scroll', () => setIsScrolled(window.scrollY > 10));
    fetchUser();
    return () => window.removeEventListener('scroll', () => { });
  }, []);

  return (
    <header className={`fixed top-0 right-0 left-0 z-20 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center lg:hidden">
          <button className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={toggleSidebar}>
            {isSidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>

        <div className="lg:ml-auto flex items-center space-x-4">
          <NotificationHandler
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
          />

          <motion.button
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          <motion.div className="flex items-center space-x-2 pl-4 border-l border-gray-200 dark:border-gray-700" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div className="flex items-center space-x-2 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                  <User size={16} />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.ownerName || 'Loading...'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email || ''}
                  </p>
                </div>
              </div>
            </Dropdown>
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;
