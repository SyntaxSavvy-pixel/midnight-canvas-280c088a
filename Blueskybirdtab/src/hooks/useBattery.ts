import { useState, useEffect } from 'react';

export interface BatteryState {
    level: number;
    charging: boolean;
    supported: boolean;
}

export const useBattery = (): BatteryState => {
    const [battery, setBattery] = useState<BatteryState>({
        level: 1,
        charging: false,
        supported: true,
    });

    useEffect(() => {
        // @ts-ignore - Navigator.getBattery is experimental
        if (!navigator.getBattery) {
            setBattery(prev => ({ ...prev, supported: false }));
            return;
        }

        // @ts-ignore
        navigator.getBattery().then((bat: any) => {
            const updateBattery = () => {
                setBattery({
                    level: bat.level,
                    charging: bat.charging,
                    supported: true,
                });
            };

            updateBattery();

            bat.addEventListener('levelchange', updateBattery);
            bat.addEventListener('chargingchange', updateBattery);

            return () => {
                bat.removeEventListener('levelchange', updateBattery);
                bat.removeEventListener('chargingchange', updateBattery);
            };
        });
    }, []);

    return battery;
};
