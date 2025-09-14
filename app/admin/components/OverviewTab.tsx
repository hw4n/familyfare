interface Service {
    id: string;
    name: string;
    displayName: string;
    maxMembers: number;
    currentMembers: number;
    availableSlots: number;
}

interface Transaction {
    id: string;
    totalAmount: number;
    month: string;
    status: string;
    description: string;
    service: {
        displayName: string;
    };
    participants: Array<{
        id: string;
        shareAmount: number;
        paymentStatus: string;
        user: {
            name: string;
        };
    }>;
}

export default function OverviewTab({
    services,
    transactions,
}: {
    services: Service[];
    transactions: Transaction[];
}) {
    const totalServices = services.length;
    const totalTransactions = transactions.length;
    const pendingTransactions = transactions.filter(
        (t) => t.status === "PENDING"
    ).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <svg
                            className="w-6 h-6 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                            총 서비스
                        </p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {totalServices}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <svg
                            className="w-6 h-6 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                            총 거래
                        </p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {totalTransactions}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                        <svg
                            className="w-6 h-6 text-yellow-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                            대기 중인 거래
                        </p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {pendingTransactions}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
