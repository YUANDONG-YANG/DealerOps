import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CarIcon, IndianRupeeIcon, CakeIcon } from 'lucide-react';
import { notification as antdNotification } from 'antd';
import { notificationsService } from '../../services/api';
import Badge from '../ui/Badge';

interface CarInfo {
    id: number;
    make: string;
    model: string;
    year: number;
    vin: string;
    purchaseDate: string;
}

interface PaymentDueNotification {
    id: number;
    carVin: string;
    buyerName: string;
    totalAmount: number;
    advanceAmount: number;
    paymentCompletionDate: string;
}

interface AnniversaryNotification {
    buyerId: number;
    buyerName: string;
    carMake: string;
    carModel: string;
    carVin: string;
    anniversaryYear: number;
}

type NotificationItem =
    | (CarInfo & { type: 'car' })
    | (PaymentDueNotification & { type: 'payment' })
    | (AnniversaryNotification & { type: 'anniversary' });

interface NotificationHandlerProps {
    showNotifications: boolean;
    setShowNotifications: (value: boolean) => void;
}

export const NotificationHandler: React.FC<NotificationHandlerProps> = ({
    showNotifications,
    setShowNotifications,
}) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const notificationRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const [carData, paymentData, anniversaryData] = await Promise.all([
                    notificationsService.getCarsOlderThan30Days(),
                    notificationsService.getPaymentDueToday(),
                    notificationsService.getAnniversaryBuyers(),
                ]);

                const carNotifications = carData.map((car: any) => ({ ...car, type: 'car' as const }));
                const paymentNotifications = paymentData.map((payment: any) => ({ ...payment, type: 'payment' as const }));
                const anniversaryNotifications: (AnniversaryNotification & { type: 'anniversary' })[] =
                    anniversaryData.map((a: AnniversaryNotification) => ({ ...a, type: 'anniversary' }));

                const allNotifications = [
                    ...carNotifications,
                    ...paymentNotifications,
                    ...anniversaryNotifications,
                ];
                setNotifications(allNotifications);

                const shown = sessionStorage.getItem('notifiedOnce');
                if (!shown && allNotifications.length > 0) {
                    // 🚘 Car Alert
                    carNotifications.forEach((car: { make: string; model: string; year: number; vin: string }) => {
                        antdNotification.open({
                            message: (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d46b08', fontWeight: 600 }}>
                                    <CarIcon size={18} stroke="#d46b08" />
                                    Car Inventory Alert: {car.make} {car.model}
                                </span>
                            ),
                            description: (
                                <div style={{ fontSize: 14, lineHeight: 1.5, color: '#595959' }}>
                                    <strong style={{ color: '#ad4e00' }}>
                                        {car.make} {car.model} ({car.year})
                                    </strong>{' '}
                                    has been in inventory for over <strong>30 days</strong>.{' '}
                                    <span style={{ color: '#8c8c8c' }}>VIN:</span>{' '}
                                    <strong style={{ color: '#262626' }}>{car.vin}</strong>
                                </div>
                            ),
                            style: {
                                backgroundColor: '#fffbe6',
                                boxShadow: '0 4px 12px rgba(250, 140, 22, 0.2)',
                                borderRadius: 20,
                                padding: '16px 20px',
                                minWidth: 320,
                            },
                            duration: 5,
                            placement: 'topRight',
                        });
                    });

                    // 💰 Payment Alert
                    paymentNotifications.forEach((payment: {
                        buyerName: string;
                        totalAmount: number;
                        advanceAmount: number;
                        carVin: string;
                        paymentCompletionDate: string;
                    }) => {
                        antdNotification.open({
                            message: (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cf1322', fontWeight: 600 }}>
                                    <IndianRupeeIcon size={18} stroke="#cf1322" />
                                    Payment Due: {payment.buyerName}
                                </span>
                            ),
                            description: (
                                <div style={{ fontSize: 14, lineHeight: 1.5, color: '#595959' }}>
                                    <strong style={{ color: '#a8071a' }}>{payment.buyerName}</strong> has a pending payment of{' '}
                                    <strong>₹{payment.totalAmount - payment.advanceAmount}</strong> for car{' '}
                                    <span style={{ color: '#8c8c8c' }}>VIN:</span>{' '}
                                    <strong style={{ color: '#262626' }}>{payment.carVin}</strong> due today (
                                    {payment.paymentCompletionDate}).
                                </div>
                            ),
                            style: {
                                backgroundColor: '#fff1f0',
                                boxShadow: '0 6px 16px rgba(255, 77, 79, 0.2)',
                                borderRadius: 20,
                                padding: '16px 20px',
                                minWidth: 320,
                            },
                            duration: 5,
                            placement: 'topRight',
                        });
                    });

                    // 🎉 Anniversary Alert
                    anniversaryNotifications.forEach((anniversary) => {
                        antdNotification.open({
                            message: (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#52c41a', fontWeight: 600 }}>
                                    <CakeIcon size={18} stroke="#52c41a" />
                                    Anniversary Alert: {anniversary.buyerName}
                                </span>
                            ),
                            description: (
                                <div style={{ fontSize: 14, lineHeight: 1.5, color: '#595959' }}>
                                    <strong style={{ color: '#389e0d' }}>{anniversary.buyerName}</strong> has an anniversary for their{' '}
                                    <strong>{anniversary.anniversaryYear}</strong> year(s) old{' '}
                                    <strong>{anniversary.carMake} {anniversary.carModel}</strong>.{' '}
                                    <span style={{ color: '#8c8c8c' }}>VIN:</span>{' '}
                                    <strong style={{ color: '#262626' }}>{anniversary.carVin}</strong>
                                </div>
                            ),
                            style: {
                                backgroundColor: '#f6ffed',
                                boxShadow: '0 4px 12px rgba(82, 196, 26, 0.2)',
                                borderRadius: 20,
                                padding: '16px 20px',
                                minWidth: 320,
                            },
                            duration: 5,
                            placement: 'topRight',
                        });
                    });

                    sessionStorage.setItem('notifiedOnce', 'true');
                }
            } catch (err) {
                console.error('Error fetching notifications', err);
            }
        };

        fetchNotifications();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                notificationRef.current &&
                !notificationRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [setShowNotifications]);

    return (
        <>
            <motion.button
                ref={buttonRef}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {notifications.length}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {showNotifications && (
                    <motion.div
                        ref={notificationRef}
                        className="absolute right-4 top-16 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-medium text-gray-900 dark:text-white">Car Notifications</h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.map((notification) => (
                                <div
                                    key={'id' in notification ? notification.id : (notification as AnniversaryNotification).buyerId}
                                    className={
                                        notification.type === 'car'
                                            ? "p-4 border-b border-gray-100 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/10"
                                            : notification.type === 'payment'
                                                ? "p-4 border-b border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10"
                                                : "p-4 border-b border-gray-100 dark:border-gray-700 bg-green-50 dark:bg-green-900/10"
                                    }
                                >
                                    {notification.type === 'car' ? (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                                        {notification.make} {notification.model} - {notification.year}
                                                    </h4>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                        In inventory since: {new Date(notification.purchaseDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Badge variant="warning">Overdue</Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                VIN: {notification.vin}
                                            </p>
                                        </>
                                    ) : notification.type === 'payment' ? (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                                        Payment Due Today - {notification.buyerName}
                                                    </h4>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                        VIN: {notification.carVin}
                                                    </p>
                                                </div>
                                                <Badge variant="danger">Due</Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                Amount Due: ₹{notification.totalAmount - notification.advanceAmount}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                                        Anniversary Alert - {notification.buyerName}
                                                    </h4>
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                                        {notification.anniversaryYear} year(s) with {notification.carMake} {notification.carModel}, VIN: {notification.carVin}
                                                    </p>
                                                </div>
                                                <Badge variant="success">Anniversary</Badge>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};