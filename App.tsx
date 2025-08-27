import { useState, useRef, useEffect } from 'react';

// Define the services (simplified to just names for simulation)
const serviceNames: string[] = [
    "Snap", "Gap", "Tap30", "Divar", "Torob", "SnapFood", "Sheypoor", "OfoghKourosh",
    "AliBaba", "SnapMarket", "GapFilm", "STrip", "Filmnet", "DrDr", "Itool", "AnarGift",
    "Azki", "Nobat", "Chamedoon", "BaniMode", "Lendo", "NashrOlgoo", "PakhshShop", "DideNegar",
    "Baskol", "Kilid", "BaSalam", "See5", "Ghabzino", "SimKhan (F)", "SimKhan (T)", "DrSaina",
    "BinJo", "Limome", "BimitoVip", "SeebIrani", "MihanPezeshk", "HamrahMechanic"
];

// Helper function to validate and format phone number
const isPhoneValid = (phone: string): string | null => {
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (/^\+989[0-9]{9}$/.test(cleanPhone)) {
        return cleanPhone;
    }
    if (/^989[0-9]{9}$/.test(cleanPhone)) {
        return `+${cleanPhone}`;
    }
    if (/^09[0-9]{9}$/.test(cleanPhone)) {
        return `+98${cleanPhone.substring(1)}`;
    }
    if (/^9[0-9]{9}$/.test(cleanPhone)) {
        return `+98${cleanPhone}`;
    }
    return null;
};

type ServiceState = 'idle' | 'sending' | 'sent' | 'error';

interface MessageLogEntry {
    id: number;
    service: string;
    status: ServiceState;
    timestamp: string;
    message?: string;
}

const SmsBomberApp: React.FC = () => {
    const [phoneNumberInput, setPhoneNumberInput] = useState<string>('');
    const [sleepTimeInput, setSleepTimeInput] = useState<string>('0.1');
    const [formattedPhoneNumber, setFormattedPhoneNumber] = useState<string | null>(null);
    const [actualSleepTime, setActualSleepTime] = useState<number>(0.1);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [serviceStates, setServiceStates] = useState<Map<string, ServiceState>>(() => {
        const initialState = new Map<string, ServiceState>();
        serviceNames.forEach(service => initialState.set(service, 'idle'));
        return initialState;
    });
    const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
    const [inputError, setInputError] = useState<string | null>(null);

    const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const finalStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Effect to parse sleep time input
    useEffect(() => {
        const parsedTime = parseFloat(sleepTimeInput);
        if (!isNaN(parsedTime) && parsedTime >= 0) {
            setActualSleepTime(parsedTime);
        } else {
            setActualSleepTime(0.1); // Fallback to default
        }
    }, [sleepTimeInput]);

    // Function to simulate a single service call and update state
    const simulateServiceCall = (serviceName: string, phone: string) => {
        setServiceStates(prev => {
            const newState = new Map(prev);
            newState.set(serviceName, 'sending');
            return newState;
        });

        // Simulate network delay for the actual "request"
        const requestDelay = Math.random() * 1500 + 500; // Simulate 0.5 to 2 seconds for a single request
        const success = Math.random() > 0.2; // 80% chance of success for simulation

        const timeoutId = setTimeout(() => {
            // Only update if still in sending state (could have been stopped globally)
            if (!isSending) return;

            const status: ServiceState = success ? 'sent' : 'error';
            setServiceStates(prev => {
                const newState = new Map(prev);
                newState.set(serviceName, status);
                return newState;
            });
            setMessageLog(prev => [
                ...prev,
                { id: Date.now() + Math.random(), service: serviceName, status: status, timestamp: new Date().toLocaleTimeString() }
            ]);
        }, requestDelay);

        timeoutsRef.current.push(timeoutId);
    };

    const startSending = () => {
        const validatedPhone = isPhoneValid(phoneNumberInput);
        if (!validatedPhone) {
            setInputError('Please enter a valid Iranian phone number (e.g., +989123456789 or 09123456789).');
            return;
        }
        setInputError(null);
        setFormattedPhoneNumber(validatedPhone);
        setIsSending(true);
        setMessageLog([]); // Clear previous log
        setServiceStates(new Map(serviceNames.map(service => [service, 'idle']))); // Reset all service states

        let maxExpectedFinishTime = 0; // To determine when all simulations should be done

        serviceNames.forEach((service, index) => {
            const launchDelay = index * actualSleepTime * 1000;
            const simulatedRequestDuration = (Math.random() * 1500 + 500); // Max possible for a single request
            const serviceExpectedFinishTime = launchDelay + simulatedRequestDuration;

            if (serviceExpectedFinishTime > maxExpectedFinishTime) {
                maxExpectedFinishTime = serviceExpectedFinishTime;
            }

            const timeoutId = setTimeout(() => {
                // Ensure we haven't stopped in the meantime
                if (isSending) {
                    simulateServiceCall(service, validatedPhone);
                }
            }, launchDelay);
            timeoutsRef.current.push(timeoutId);
        });

        // Set a final timeout to automatically stop the "bombing" process
        // after all services have had a chance to be launched and simulated.
        finalStopTimeoutRef.current = setTimeout(() => {
            if (isSending) { // Only auto-stop if not already manually stopped
                setIsSending(false);
                setMessageLog(prev => [
                    ...prev,
                    { id: Date.now() + Math.random(), service: 'System', status: 'idle', timestamp: new Date().toLocaleTimeString(), message: 'All services finished their attempts.' }
                ]);
            }
            finalStopTimeoutRef.current = null;
        }, maxExpectedFinishTime + 500); // Add a small buffer
    };

    const stopSending = () => {
        setIsSending(false);
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
        if (finalStopTimeoutRef.current) {
            clearTimeout(finalStopTimeoutRef.current);
            finalStopTimeoutRef.current = null;
        }
        setServiceStates(new Map(serviceNames.map(service => [service, 'idle'])));
        setMessageLog(prev => [
            ...prev,
            { id: Date.now() + Math.random(), service: 'System', status: 'error', timestamp: new Date().toLocaleTimeString(), message: 'User exited.' }
        ]);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans flex flex-col items-center">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-indigo-400 mb-2">SMS Bomber (Simulated)</h1>
                <p className="text-gray-400 text-lg">A client-side simulation based on the provided Python script.</p>
                <p className="text-sm text-yellow-400 mt-2">
                    Note: Direct SMS bombing from a browser is generally not possible due to Cross-Origin Resource Sharing (CORS) policies and backend requirements.
                    This application simulates the output of the Python script's logic.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl mb-8 border border-indigo-700">
                <div className="mb-4">
                    <label htmlFor="phoneNumber" className="block text-gray-300 text-sm font-bold mb-2">
                        Phone Number (e.g., +989123456789):
                    </label>
                    <input
                        type="text"
                        id="phoneNumber"
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700"
                        placeholder="+989..."
                        disabled={isSending}
                    />
                    {inputError && <p className="text-red-500 text-xs mt-2">{inputError}</p>}
                </div>

                <div className="mb-6">
                    <label htmlFor="sleepTime" className="block text-gray-300 text-sm font-bold mb-2">
                        Sleep Time Between Service Launches (seconds, default 0.1):
                    </label>
                    <input
                        type="number"
                        id="sleepTime"
                        value={sleepTimeInput}
                        onChange={(e) => setSleepTimeInput(e.target.value)}
                        className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-gray-100 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-700"
                        placeholder="0.1"
                        step="0.01"
                        min="0"
                        disabled={isSending}
                    />
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={startSending}
                        disabled={isSending}
                        className={`py-2 px-6 rounded-md font-semibold transition-colors duration-200 ${
                            isSending
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800'
                        }`}
                    >
                        Start Bombing
                    </button>
                    <button
                        onClick={stopSending}
                        disabled={!isSending}
                        className={`py-2 px-6 rounded-md font-semibold transition-colors duration-200 ${
                            !isSending
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800'
                        }`}
                    >
                        Stop
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mb-8">
                <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 col-span-1 md:col-span-2 lg:col-span-1">
                    <h2 className="text-xl font-bold text-indigo-400 mb-4">Bombing Log</h2>
                    <div className="h-64 bg-gray-700 p-3 rounded-md overflow-y-auto border border-gray-600 text-sm">
                        {messageLog.length === 0 ? (
                            <p className="text-gray-400">No messages yet...</p>
                        ) : (
                            messageLog.map((entry) => (
                                <p key={entry.id} className={`${entry.status === 'sent' ? 'text-green-400' : 'text-red-400'} mb-1`}>
                                    <span className="text-gray-500 mr-2">[{entry.timestamp}]</span>
                                    {entry.message ? entry.message : `(${entry.service}) ${entry.status === 'sent' ? 'Code Was Sent' : 'Error'}`}
                                </p>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 col-span-1 md:col-span-2 lg:col-span-2">
                    <h2 className="text-xl font-bold text-indigo-400 mb-4">Service Status</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 h-64 overflow-y-auto bg-gray-700 p-3 rounded-md border border-gray-600">
                        {serviceNames.map(service => {
                            const status = serviceStates.get(service);
                            let colorClass = 'text-gray-400';
                            if (status === 'sending') colorClass = 'text-yellow-400 animate-pulse';
                            if (status === 'sent') colorClass = 'text-green-400';
                            if (status === 'error') colorClass = 'text-red-400';
                            return (
                                <div key={service} className="flex items-center gap-1">
                                    <span className={`text-xs ${colorClass}`}>
                                        {status === 'sending' ? '🚀' : status === 'sent' ? '✅' : status === 'error' ? '❌' : '⚪'}
                                    </span>
                                    <span className={`text-sm ${colorClass}`}>{service}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="text-gray-500 text-sm mt-8">
                <p>Platform: Browser Environment</p>
                <p>Node: N/A (Client-side)</p>
                <p>Release: N/A (Client-side)</p>
            </div>
        </div>
    );
};

export default SmsBomberApp;