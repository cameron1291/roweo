'use client'

import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, FunnelChart, Funnel, LabelList
} from 'recharts'

type RevenuePoint = { month: string; mrr: number; new_customers: number; churned: number }
type LetterPoint = { date: string; generated: number; posted: number }
type ScanPoint = { date: string; scans: number }
type SuburbPoint = { suburb: string; count: number }
type TypePoint = { type: string; count: number }
type FunnelPoint = { channel: string; sent: number; opened: number; viewed: number; clicked: number }
type Campaign = { id: string; name: string; channel: string; status: string }

const TABS = ['Revenue', 'Letters', 'QR & Engagement', 'Suburb Performance', 'Acquisition Funnel'] as const
type Tab = typeof TABS[number]

const CHART_COLORS = ['#3B6FDB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export function AnalyticsDashboard({
  revenueTimeline,
  lettersTimeline,
  scansTimeline,
  topSuburbs,
  projectTypes,
  funnelData,
  campaigns,
}: {
  revenueTimeline: RevenuePoint[]
  lettersTimeline: LetterPoint[]
  scansTimeline: ScanPoint[]
  topSuburbs: SuburbPoint[]
  projectTypes: TypePoint[]
  funnelData: FunnelPoint[]
  campaigns: Campaign[]
}) {
  const [tab, setTab] = useState<Tab>('Revenue')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-white mb-6">Analytics</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-white/10">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {tab === 'Revenue' && (
        <div className="space-y-8">
          {revenueTimeline.length > 0 ? (
            <>
              <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">Monthly Recurring Revenue (AUD)</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} formatter={(v) => [`$${v ?? 0}`, 'MRR']} />
                    <Line type="monotone" dataKey="mrr" stroke="#3B6FDB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">New vs Churned Subscribers</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                    <Bar dataKey="new_customers" name="New" fill="#3B6FDB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="churned" name="Churned" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyState message="No revenue data yet — subscription events will appear here." />
          )}
        </div>
      )}

      {/* Letters Tab */}
      {tab === 'Letters' && (
        <div className="space-y-8">
          {lettersTimeline.length > 0 ? (
            <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">Letters Generated vs Posted (last 30 days)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={lettersTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                  <Bar dataKey="generated" name="Generated" fill="#3B6FDB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="posted" name="Posted" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No letter data yet — letter events will appear here." />
          )}
        </div>
      )}

      {/* QR & Engagement Tab */}
      {tab === 'QR & Engagement' && (
        <div className="space-y-8">
          {scansTimeline.length > 0 ? (
            <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">QR Scans per Day (last 30 days)</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={scansTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} />
                  <Line type="monotone" dataKey="scans" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No scan data yet — QR scan events will appear here." />
          )}
        </div>
      )}

      {/* Suburb Performance Tab */}
      {tab === 'Suburb Performance' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            {topSuburbs.length > 0 ? (
              <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">Top suburbs by DA volume (last 30 days)</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topSuburbs.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis type="category" dataKey="suburb" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="count" name="DAs" fill="#3B6FDB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No suburb DA data yet." />
            )}
            {projectTypes.length > 0 ? (
              <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">DA breakdown by project type</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={projectTypes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis type="category" dataKey="type" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="count" name="DAs" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState message="No project type data yet." />
            )}
          </div>
        </div>
      )}

      {/* Acquisition Funnel Tab */}
      {tab === 'Acquisition Funnel' && (
        <div className="space-y-8">
          {campaigns.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-white/5">
              <p className="text-xs text-zinc-500 mb-2">Campaigns</p>
              <div className="flex gap-2 flex-wrap">
                {campaigns.map(c => (
                  <a key={c.id} href={`/admin/campaigns/${c.id}`} className="text-xs bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full hover:bg-zinc-700 transition-colors">
                    {c.name}
                  </a>
                ))}
              </div>
            </div>
          )}
          {funnelData.some(f => f.sent > 0) ? (
            <div className="bg-zinc-900 rounded-lg p-6 border border-white/5">
              <h2 className="text-sm font-medium text-zinc-400 mb-6">Acquisition funnel by channel (last 90 days)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="channel" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', color: '#fff', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                  <Bar dataKey="sent" name="Sent" fill="#3B6FDB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="opened" name="Opened" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="viewed" name="Demo viewed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicked" name="CTA clicked" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No acquisition campaign data yet. Run a campaign to see funnel data." />
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-12 border border-white/5 text-center">
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  )
}
