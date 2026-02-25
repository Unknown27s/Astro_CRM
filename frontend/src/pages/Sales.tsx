import React, { useEffect, useState } from 'react';
import { deals } from '../services/api';
import { Plus } from 'lucide-react';

const stages = [
    'Prospecting',
    'Qualification',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
];

export default function Sales() {
    const [dealList, setDealList] = useState<any[]>([]);
    const [pipelineStats, setPipelineStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeals();
        loadPipelineStats();
    }, []);

    const loadDeals = async () => {
        try {
            const response = await deals.getAll();
            setDealList(response.data.deals);
        } catch (error) {
            console.error('Error loading deals:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPipelineStats = async () => {
        try {
            const response = await deals.getPipelineStats();
            setPipelineStats(response.data);
        } catch (error) {
            console.error('Error loading pipeline stats:', error);
        }
    };

    const getDealsByStage = (stage: string) => {
        return dealList.filter((deal) => deal.stage === stage);
    };

    const getStageColor = (stage: string) => {
        const colors: Record<string, string> = {
            Prospecting: 'bg-blue-100 border-blue-300',
            Qualification: 'bg-purple-100 border-purple-300',
            Proposal: 'bg-yellow-100 border-yellow-300',
            Negotiation: 'bg-orange-100 border-orange-300',
            'Closed Won': 'bg-green-100 border-green-300',
            'Closed Lost': 'bg-red-100 border-red-300',
        };
        return colors[stage] || 'bg-gray-100 border-gray-300';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Sales Pipeline</h1>
                    <p className="text-gray-600 mt-1">Track and manage your deals</p>
                </div>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus size={20} />
                    Add Deal
                </button>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {pipelineStats.map((stat) => (
                    <div key={stat.stage} className="bg-white rounded-lg shadow-md p-4">
                        <p className="text-xs text-gray-600 uppercase">{stat.stage}</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{stat.count}</p>
                        <p className="text-sm text-green-600 mt-1">
                            ${(stat.total_value || 0).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {stages.map((stage) => {
                    const stageDeals = getDealsByStage(stage);
                    return (
                        <div key={stage} className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-800 mb-3">
                                {stage}
                                <span className="ml-2 text-sm text-gray-500">
                                    ({stageDeals.length})
                                </span>
                            </h3>
                            <div className="space-y-3">
                                {stageDeals.map((deal) => (
                                    <div
                                        key={deal.id}
                                        className={`p-3 rounded-lg border-2 ${getStageColor(stage)} cursor-pointer hover:shadow-md transition-shadow`}
                                    >
                                        <p className="font-medium text-gray-800">{deal.title}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {deal.company || `${deal.first_name} ${deal.last_name}`}
                                        </p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-sm font-semibold text-green-600">
                                                ${(deal.value || 0).toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {deal.probability}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
