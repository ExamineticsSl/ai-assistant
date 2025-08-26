import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApprovalInbox } from './ApprovalInbox';
import { ProjectProgressTracking } from './ProjectProgressTracking';
import { approvalService, ApprovalStats } from '../services/approvalService';

export const HumanApprovalDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'projects' | 'history' | 'stats'>('inbox');

  // Fetch approval statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['approval-stats'],
    queryFn: () => approvalService.getApprovalStats(),
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WHS AI Approval Dashboard</h1>
              <p className="text-gray-600">Review and respond to AI agent approval requests</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">System Status</div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Pending Approvals"
            value={stats?.pending || 0}
            icon="⏳"
            color="yellow"
            urgent={stats?.pending && stats.pending > 10}
          />
          <StatCard
            title="Total Requests"
            value={stats?.total || 0}
            icon="📋"
            color="blue"
          />
          <StatCard
            title="Approved Today"
            value={stats?.approved || 0}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Rejected Today"
            value={stats?.rejected || 0}
            icon="❌"
            color="red"
          />
          <StatCard
            title="Avg Response Time"
            value={`${Math.round(stats?.averageResponseTime || 0)}h`}
            icon="⚡"
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'inbox', label: 'Approval Inbox', count: stats?.pending },
                { key: 'projects', label: 'Project Progress', count: undefined },
                { key: 'history', label: 'History', count: undefined },
                { key: 'stats', label: 'Analytics', count: undefined },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-0">
            {activeTab === 'inbox' && <ApprovalInbox />}
            
            {activeTab === 'projects' && <ProjectProgressTracking />}
            
            {activeTab === 'history' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Approval History</h3>
                  <p className="text-gray-600">
                    View and search through all past approval decisions.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <em>Feature coming soon...</em>
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'stats' && (
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics & Reports</h3>
                  <p className="text-gray-600">
                    Detailed analytics on approval patterns, response times, and system performance.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    <em>Feature coming soon...</em>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Notification */}
      {stats?.oldestPending && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🚨</div>
              <div>
                <div className="font-medium">Urgent Approval Required</div>
                <div className="text-sm opacity-90">
                  "{stats.oldestPending.approvalTitle}" has been pending for over 24 hours
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  urgent?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, urgent }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`
      bg-white rounded-lg border p-6 
      ${urgent ? 'ring-2 ring-red-500 ring-opacity-50 animate-pulse' : ''}
    `}>
      <div className="flex items-center">
        <div className={`
          inline-flex items-center justify-center p-3 rounded-lg border
          ${colorClasses[color]}
        `}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-semibold ${urgent ? 'text-red-600' : 'text-gray-900'}`}>
            {value}
            {urgent && (
              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                URGENT
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};