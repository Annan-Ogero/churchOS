/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  Heart, 
  Settings, 
  Plus, 
  ChevronRight, 
  Search,
  Bell,
  X,
  MapPin,
  Clock,
  Send,
  User,
  Wallet,
  TrendingUp,
  PieChart,
  History,
  Shield,
  QrCode,
  ClipboardList,
  CheckCircle2,
  Video,
  FileText,
  Sparkles,
  Loader2,
  BookOpen,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { aiService } from './services/aiService';
import { BibleReader } from './components/BibleReader';

// --- Types ---

interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'branch_admin' | 'group_leader' | 'member';
  branch_id: number;
}

interface Group {
  id: number;
  name: string;
  type: string;
  description: string;
  branch_name: string;
  member_count: number;
  meeting_url?: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  location: string;
  branch_name: string;
  group_name?: string;
  meeting_url?: string;
  meeting_notes?: string;
  ai_summary?: string;
}

interface PrayerRequest {
  id: number;
  user_name: string;
  content: string;
  timestamp: string;
  is_anonymous: boolean;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'church' | 'branch';
  sender_name: string;
  branch_name?: string;
  timestamp: string;
}

interface Branch {
  id: number;
  name: string;
  location: string;
}

interface Campaign {
  id: number;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  contributor_count: number;
  deadline: string;
  visibility_policy: 'private' | 'participants' | 'full';
  status: 'active' | 'completed';
}

interface Contribution {
  id: number;
  user_name?: string;
  campaign_title?: string;
  amount: number;
  date: string;
  method: string;
}

interface AuditLog {
  id: number;
  user_name: string;
  action: string;
  target_type: string;
  details: string;
  timestamp: string;
}

interface Invitation {
  id: number;
  code: string;
  branch_name: string;
  role: string;
  creator_name: string;
  used_at: string | null;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, user }: { activeTab: string, setActiveTab: (t: string) => void, user: User | null }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Service', icon: Video },
    { id: 'groups', label: 'Ministries & Groups', icon: Users },
    { id: 'events', label: 'Events & Calendar', icon: Calendar },
    { id: 'serve', label: 'Serve Roster', icon: ClipboardList },
    { id: 'contributions', label: 'Contributions', icon: Wallet },
    { id: 'prayer', label: 'Prayer Wall', icon: Heart },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  if (user?.role === 'super_admin') {
    tabs.push({ id: 'settings', label: 'Administration', icon: Settings });
  }

  return (
    <div className="hidden md:flex flex-col w-64 bg-church-cream border-r border-church-gold/10 h-screen sticky top-0">
      <div className="p-8 border-b border-church-gold/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-church-ink rounded-full flex items-center justify-center text-church-gold font-serif text-xl border border-church-gold/20">G</div>
          <div className="flex flex-col">
            <h1 className="text-xl font-serif font-bold text-church-ink tracking-tight leading-none">Grace</h1>
            <span className="text-[10px] font-bold text-church-gold uppercase tracking-[0.2em]">Community</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-6 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
              activeTab === tab.id 
                ? 'bg-church-ink text-white shadow-lg shadow-church-ink/10' 
                : 'text-church-ink/60 hover:bg-church-gold/5 hover:text-church-ink'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-church-gold' : 'group-hover:text-church-gold transition-colors'} />
            <span className="text-sm font-medium tracking-wide">{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-church-gold/5">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 bg-church-paper rounded-full flex items-center justify-center text-church-ink border border-church-gold/10">
            <User size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-church-ink truncate">{user?.name || 'Loading...'}</p>
            <p className="text-[10px] font-bold text-church-gold uppercase tracking-wider truncate">{user?.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'contributions', label: 'Giving', icon: Wallet },
    { id: 'prayer', label: 'Prayer', icon: Heart },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center gap-1 ${
            activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <tab.icon size={24} />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

const Dashboard = ({ stats, events }: { stats: any, events: Event[] }) => {
  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-5xl font-serif font-bold text-church-ink tracking-tight">Peace be with you.</h2>
          <p className="text-church-ink/50 mt-2 font-medium tracking-wide uppercase text-xs">Saturday, February 21, 2026</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-white border border-church-gold/20 rounded-2xl text-church-ink font-bold text-sm shadow-sm hover:bg-church-paper transition-colors">
            View Schedule
          </button>
          <button className="px-6 py-3 bg-church-ink text-white rounded-2xl font-bold text-sm shadow-xl shadow-church-ink/20 hover:bg-church-ink/90 transition-colors">
            Give Online
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Faithful Members', value: stats?.members || 0, icon: Users },
          { label: 'Active Ministries', value: stats?.groups || 0, icon: LayoutDashboard },
          { label: 'Upcoming Gatherings', value: stats?.events || 0, icon: Calendar },
          { label: 'Campus Branches', value: stats?.branches || 0, icon: MapPin },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="p-8 glass-card rounded-[2rem] border border-white/40 flex flex-col justify-between h-48 group hover:border-church-gold/20 transition-all"
          >
            <div className="w-10 h-10 bg-church-paper rounded-2xl flex items-center justify-center text-church-gold border border-church-gold/10 group-hover:bg-church-gold group-hover:text-white transition-all">
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-church-gold uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-4xl font-serif font-bold text-church-ink">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <h3 className="text-3xl font-serif font-bold text-church-ink">Community Gatherings</h3>
              <button className="text-xs font-black text-church-gold uppercase tracking-widest hover:text-church-ink transition-colors">Explore All</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="p-6 glass-card rounded-3xl border border-white/40 hover:border-church-gold/20 transition-all group">
                  <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 bg-church-paper rounded-2xl flex flex-col items-center justify-center text-church-gold border border-church-gold/10 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(event.start_time).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-2xl font-serif font-bold leading-none">{new Date(event.start_time).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">Upcoming Event</span>
                        <div className="h-px flex-1 bg-church-gold/10"></div>
                      </div>
                      <h4 className="text-xl font-serif font-bold text-church-ink truncate">{event.title}</h4>
                      <div className="flex items-center gap-4 mt-2 text-xs font-medium text-church-ink/50">
                        <span className="flex items-center gap-1.5"><Clock size={14} className="text-church-gold" /> {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} className="text-church-gold" /> {event.location}</span>
                      </div>
                    </div>
                    <button className="w-12 h-12 rounded-full border border-church-gold/20 flex items-center justify-center text-church-gold hover:bg-church-gold hover:text-white transition-all">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <AIInsights stats={stats} />
          
          <div className="bg-church-ink text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-church-gold rounded-2xl flex items-center justify-center text-church-ink mb-8 shadow-lg shadow-church-gold/20">
                <BookOpen size={24} />
              </div>
              <h3 className="text-3xl font-serif font-bold mb-4 leading-tight">Daily Devotional</h3>
              <p className="text-church-paper/60 leading-relaxed italic mb-8 text-lg font-serif">
                "For where two or three gather in my name, there am I with them."
              </p>
              <div className="flex items-center justify-between pt-8 border-t border-white/10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-church-gold">Matthew 18:20</span>
                <button className="text-xs font-bold uppercase tracking-widest hover:text-church-gold transition-colors">Read More</button>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-church-gold/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupsList = ({ groups, onSelectGroup }: { groups: Group[], onSelectGroup: (id: number) => void }) => {
  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-serif font-bold text-church-ink tracking-tight">Ministries & Groups</h2>
          <p className="text-church-ink/50 mt-2 font-medium tracking-wide uppercase text-xs">Connecting hearts, serving together.</p>
        </div>
        <button className="hidden md:flex items-center gap-2 px-6 py-3 bg-church-ink text-white rounded-2xl font-bold text-sm shadow-xl shadow-church-ink/10 hover:bg-church-ink/90 transition-all">
          <Plus size={18} />
          Create Group
        </button>
      </header>

      <div className="relative max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-church-gold" size={20} />
        <input 
          type="text" 
          placeholder="Search groups, ministries, or teams..." 
          className="w-full pl-14 pr-6 py-5 bg-white border border-church-gold/10 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-church-gold/5 focus:border-church-gold/30 transition-all text-church-ink font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groups.map((group) => (
          <motion.div 
            whileHover={{ y: -8 }}
            key={group.id} 
            onClick={() => onSelectGroup(group.id)}
            className="glass-card p-8 rounded-[2.5rem] border border-white/40 cursor-pointer hover:border-church-gold/20 transition-all group"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="w-14 h-14 bg-church-paper rounded-2xl flex items-center justify-center text-church-gold border border-church-gold/10 group-hover:bg-church-gold group-hover:text-white transition-all relative">
                <Users size={28} />
                {group.meeting_url && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-church-gold rounded-full border-4 border-church-cream animate-pulse"></span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-3 py-1 bg-church-paper text-church-gold text-[10px] font-black rounded-full uppercase tracking-widest border border-church-gold/10">{group.type}</span>
                {group.meeting_url && <span className="text-[10px] font-black text-church-gold uppercase tracking-tighter animate-pulse">Live Meeting</span>}
              </div>
            </div>
            <h3 className="text-2xl font-serif font-bold text-church-ink mb-3">{group.name}</h3>
            <p className="text-church-ink/60 text-sm line-clamp-2 mb-8 leading-relaxed">{group.description}</p>
            <div className="flex items-center justify-between pt-6 border-t border-church-gold/5">
              <div className="flex items-center gap-2 text-[10px] font-black text-church-gold uppercase tracking-widest">
                <Users size={14} />
                {group.member_count} Members
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-church-gold uppercase tracking-widest">
                <MapPin size={14} />
                {group.branch_name}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const GroupDetail = ({ groupId, onBack, user }: { groupId: number, onBack: () => void, user: User | null }) => {
  const [group, setGroup] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const queryParams = new URLSearchParams({
      role: user.role,
      branch_id: user.branch_id.toString(),
      user_id: user.id.toString()
    }).toString();
    
    fetch(`/api/groups/${groupId}?${queryParams}`)
      .then(res => res.json())
      .then(data => setGroup(data));

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}?groupId=${groupId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_MESSAGE') {
        setGroup((prev: any) => {
          if (!prev) return prev;
          // Avoid duplicate messages if the sender also gets the broadcast
          if (prev.messages.some((m: any) => m.id === data.message.id)) return prev;
          return {
            ...prev,
            messages: [...prev.messages, data.message]
          };
        });
      }
    };

    return () => ws.close();
  }, [groupId, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group_id: groupId,
        sender_id: user.id,
        content: message
      })
    });

    setMessage('');
  };

  if (!group) return <div className="p-12 text-center text-church-gold font-serif text-xl animate-pulse italic">Entering the Sanctuary...</div>;

  return (
    <div className="space-y-12">
      <button onClick={onBack} className="flex items-center gap-2 text-church-gold hover:text-church-ink font-black uppercase text-[10px] tracking-widest transition-colors mb-4">
        <ChevronRight size={16} className="rotate-180" />
        Back to Ministries
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-12">
          <div className="glass-card p-10 rounded-[2.5rem] border border-white/40 shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <span className="px-3 py-1 bg-church-paper text-church-gold text-[10px] font-black rounded-full uppercase tracking-widest border border-church-gold/10 mb-4 inline-block">{group.type}</span>
                  <div className="flex items-center gap-6">
                    <h2 className="text-5xl font-serif font-bold text-church-ink leading-none">{group.name}</h2>
                    {group.meeting_url && (
                      <button 
                        onClick={() => window.open(group.meeting_url, '_blank')}
                        className="flex items-center gap-2 px-6 py-3 bg-church-ink text-white rounded-2xl font-bold text-sm shadow-xl shadow-church-ink/20 hover:bg-church-ink/90 transition-all"
                      >
                        <Video size={18} className="text-church-gold" />
                        Join Meeting
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-white border border-church-gold/20 rounded-2xl text-church-ink font-bold text-sm shadow-sm hover:bg-church-paper transition-colors">Manage</button>
                  <button className="px-6 py-3 bg-church-gold text-white rounded-2xl font-bold text-sm shadow-lg shadow-church-gold/20 hover:bg-church-gold/90 transition-colors">Invite</button>
                </div>
              </div>
              <p className="text-church-ink/60 leading-relaxed text-lg font-serif italic">{group.description}</p>
            </div>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-church-gold/5 rounded-full blur-3xl"></div>
          </div>

          <div className="glass-card rounded-[2.5rem] border border-white/40 shadow-2xl flex flex-col h-[600px] overflow-hidden">
            <div className="p-8 border-b border-church-gold/5 bg-white/30">
              <h3 className="font-serif font-bold text-2xl text-church-ink flex items-center gap-3">
                <MessageSquare size={24} className="text-church-gold" />
                Ministry Dialogue
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {group.messages.map((msg: any) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-2">
                    <span className="text-[10px] font-black text-church-gold uppercase tracking-widest">{msg.sender_name}</span>
                    <span className="text-[10px] font-bold text-church-ink/30">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`max-w-[80%] p-4 rounded-3xl ${
                    msg.sender_id === user?.id 
                      ? 'bg-church-ink text-white rounded-tr-none shadow-lg shadow-church-ink/10' 
                      : 'bg-white border border-church-gold/10 text-church-ink rounded-tl-none shadow-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-white/30 border-t border-church-gold/5">
              <form onSubmit={sendMessage} className="relative">
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share a word with the ministry..." 
                  className="w-full pl-6 pr-16 py-5 bg-white border border-church-gold/10 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-church-gold/5 focus:border-church-gold/30 transition-all text-church-ink font-medium"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-church-ink text-white rounded-2xl shadow-lg hover:bg-church-ink/90 transition-all"
                >
                  <Send size={20} className="text-church-gold" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 space-y-8">
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/40 shadow-xl">
            <h3 className="font-serif font-bold text-xl text-church-ink mb-6 flex items-center gap-2">
              <Users size={20} className="text-church-gold" />
              Fellowship
            </h3>
            <div className="space-y-4">
              {group.members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-church-paper transition-colors">
                  <div className="w-10 h-10 bg-church-paper rounded-full flex items-center justify-center text-church-ink border border-church-gold/10 font-bold text-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-church-ink truncate">{member.name}</p>
                    <p className="text-[10px] font-bold text-church-gold uppercase tracking-widest truncate">{member.role_in_group}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PrayerWall = ({ requests, user, onRefresh }: { requests: PrayerRequest[], user: User | null, onRefresh: () => void }) => {
  const [newRequest, setNewRequest] = useState('');
  const [isAnon, setIsAnon] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.trim() || !user) return;

    await fetch('/api/prayer-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        branch_id: user.branch_id,
        content: newRequest,
        is_anonymous: isAnon
      })
    });

    setNewRequest('');
    onRefresh();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Prayer Wall</h2>
        <p className="text-slate-500 mt-1">Share your burdens and pray for one another.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <textarea 
          value={newRequest}
          onChange={(e) => setNewRequest(e.target.value)}
          placeholder="How can we pray for you today?" 
          className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isAnon}
              onChange={(e) => setIsAnon(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" 
            />
            Post anonymously
          </label>
          <button type="submit" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">
            Share Request
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {requests.map((req) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={req.id} 
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <Heart size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{req.is_anonymous ? 'Anonymous Member' : req.user_name}</p>
                  <p className="text-xs text-slate-400">{new Date(req.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed">{req.content}</p>
            <div className="mt-6 pt-4 border-t border-slate-50 flex gap-4">
              <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                <Heart size={16} />
                I'm praying
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AIAssistant = ({ user, context }: { user: User | null, context: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await aiService.getChatResponse(userMsg, context);
      setMessages(prev => [...prev, { role: 'ai', content: response || 'Sorry, I encountered an error.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error connecting to AI service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-8 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-all z-50 group"
      >
        <MessageSquare size={24} />
        <span className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Church Assistant
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-24 right-8 w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
          >
            <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <span className="font-bold">Church Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">Hi {user?.name}! How can I help you today?</p>
                  <p className="text-xs mt-2">Ask about events, groups, or church info.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none shadow-sm'
                  }`}>
                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white">
                      <Markdown>
                        {msg.content}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything..." 
                className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-sm"
              />
              <button type="submit" className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors">
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const AIInsights = ({ stats }: { stats: any }) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.getInsights(JSON.stringify(stats));
      setInsights(res || 'No insights available.');
    } catch (err) {
      setInsights('Failed to generate insights.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Settings size={20} className="text-emerald-600" />
          AI Leadership Insights
        </h3>
        {!insights && !isLoading && (
          <button 
            onClick={generateInsights}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
          >
            Generate
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-3/4"></div>
          <div className="h-4 bg-slate-100 rounded w-1/2"></div>
          <div className="h-4 bg-slate-100 rounded w-2/3"></div>
        </div>
      ) : insights ? (
        <div className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none">
          <Markdown>{insights}</Markdown>
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">Get AI-powered suggestions for church growth and member care.</p>
      )}
    </div>
  );
};

const AIAnnouncementGenerator = ({ event }: { event: Event }) => {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.getAnnouncement(JSON.stringify(event));
      setAnnouncement(res || 'Failed to generate.');
    } catch (err) {
      setAnnouncement('Error generating announcement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">AI Announcement Draft</span>
        {!announcement && !isLoading && (
          <button onClick={generate} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Generate Draft</button>
        )}
      </div>
      {isLoading ? (
        <div className="h-12 bg-emerald-100/50 animate-pulse rounded-lg"></div>
      ) : announcement ? (
        <div className="text-sm text-emerald-900 prose prose-sm max-w-none">
          <Markdown>{announcement}</Markdown>
        </div>
      ) : (
        <p className="text-xs text-emerald-600/70">Need a draft for this event? Let AI help you write it.</p>
      )}
    </div>
  );
};

const MeetingNotes = ({ event, onUpdate }: { event: Event, onUpdate: () => void }) => {
  const [notes, setNotes] = useState(event.meeting_notes || '');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/events/${event.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      onUpdate();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAISummarize = async () => {
    if (!notes.trim()) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Summarize these church meeting notes. Identify key decisions, action items, and prayer requests: \n\n${notes}`,
      });
      
      const summary = response.text || "Could not generate summary.";
      
      await fetch(`/api/events/${event.id}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_summary: summary })
      });
      onUpdate();
    } catch (error) {
      console.error("AI Summary error:", error);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-card p-8 rounded-[2.5rem] border border-white/40 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif font-bold text-2xl text-church-ink flex items-center gap-3">
            <FileText size={24} className="text-church-gold" />
            Meeting Notes
          </h3>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="text-[10px] font-black text-church-gold uppercase tracking-[0.2em] hover:text-church-ink transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste meeting transcript or type notes here..."
          className="w-full h-64 p-6 bg-church-paper/50 border border-church-gold/10 rounded-3xl focus:outline-none focus:ring-4 focus:ring-church-gold/5 focus:border-church-gold/30 transition-all text-church-ink font-serif italic text-lg"
        />
        <button 
          onClick={handleAISummarize}
          disabled={isSummarizing || !notes.trim()}
          className="w-full mt-6 flex items-center justify-center gap-3 py-4 bg-church-ink text-white rounded-2xl font-bold text-sm shadow-xl shadow-church-ink/20 hover:bg-church-ink/90 transition-all disabled:opacity-50"
        >
          {isSummarizing ? (
            <Loader2 className="w-5 h-5 animate-spin text-church-gold" />
          ) : (
            <Sparkles className="w-5 h-5 text-church-gold" />
          )}
          Generate AI Summary
        </button>
      </div>

      {event.ai_summary && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-church-ink text-white p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h3 className="font-serif font-bold text-2xl text-white flex items-center gap-3 mb-6">
              <Sparkles size={24} className="text-church-gold" />
              Divine Insights
            </h3>
            <div className="prose prose-invert prose-church max-w-none text-church-paper/70 font-serif italic text-lg leading-relaxed">
              <Markdown>{event.ai_summary}</Markdown>
            </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-church-gold/10 rounded-full blur-3xl"></div>
        </motion.div>
      )}
    </div>
  );
};

const EventsCalendar = ({ events, user, onRefresh }: { events: Event[], user: User | null, onRefresh: () => void }) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Events & Calendar</h2>
          <p className="text-slate-500 mt-1">Stay updated with church-wide and group activities.</p>
        </div>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
          <Plus size={20} />
          Add Event
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Upcoming This Month</h3>
            <div className="space-y-6">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  onClick={() => setSelectedEvent(event)}
                  className={`flex gap-6 p-6 rounded-2xl border transition-all group cursor-pointer ${
                    selectedEvent?.id === event.id ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-50 hover:border-emerald-100 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-emerald-700 shrink-0 shadow-sm group-hover:border-emerald-200">
                    <span className="text-xs font-bold uppercase">{new Date(event.start_time).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-2xl font-black leading-none">{new Date(event.start_time).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xl font-bold text-slate-900 truncate">{event.title}</h4>
                      <div className="flex items-center gap-2">
                        {event.meeting_url && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(event.meeting_url, '_blank');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            <Video size={14} />
                            Join Live
                          </button>
                        )}
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-widest">{event.group_name || 'Church-wide'}</span>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{event.description}</p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5"><Clock size={16} className="text-emerald-500" /> {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={16} className="text-emerald-500" /> {event.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {selectedEvent ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              key={selectedEvent.id}
            >
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-900">{selectedEvent.title}</h3>
                  <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-6">{selectedEvent.description}</p>
                {selectedEvent.meeting_url && (
                  <button 
                    onClick={() => window.open(selectedEvent.meeting_url, '_blank')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Video size={20} />
                    Join Live Meeting
                  </button>
                )}
              </div>
              
              {(user?.role === 'super_admin' || user?.role === 'branch_admin' || user?.role === 'group_leader') && (
                <MeetingNotes 
                  event={selectedEvent} 
                  onUpdate={() => {
                    onRefresh();
                    // Update selected event locally too
                    fetch(`/api/events?role=${user.role}&branch_id=${user.branch_id}&user_id=${user.id}`)
                      .then(res => res.json())
                      .then(events => {
                        const updated = events.find((e: Event) => e.id === selectedEvent.id);
                        if (updated) setSelectedEvent(updated);
                      });
                  }} 
                />
              )}
            </motion.div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Calendar View</h3>
              <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 italic text-sm">
                Select an event to see details and meeting notes.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LiveService = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Live Service</h2>
          <p className="text-slate-500 mt-1">Join our community in worship from wherever you are.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-full uppercase animate-pulse">
          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
          Live Now
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative group">
            <iframe 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0" 
              title="Church Live Stream"
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none">
              <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white font-bold mb-4">
                Streaming in 1080p
              </div>
              <button className="pointer-events-auto px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all scale-90 group-hover:scale-100">
                <Heart size={20} />
                Request Live Prayer
              </button>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Today's Message: "The Power of Community"</h3>
            <p className="text-slate-600 leading-relaxed">
              Join Pastor John as he explores the biblical foundations of fellowship and why we are stronger together. 
              Follow along with the sermon notes below.
            </p>
            <div className="mt-8 flex gap-4">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all">
                <BookOpen size={20} />
                Sermon Notes
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all">
                <Plus size={20} />
                Check-in
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare size={20} className="text-emerald-600" />
                Live Chat
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">242 Watching</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
              {[
                { user: "Sarah M.", msg: "Good morning from Seattle! 🙏" },
                { user: "David L.", msg: "The worship is beautiful today." },
                { user: "Grace K.", msg: "Amen! Such a powerful word." },
                { user: "Michael B.", msg: "Praying for everyone joining today." },
                { user: "Sarah M.", msg: "Good morning from Seattle! 🙏" },
                { user: "David L.", msg: "The worship is beautiful today." },
                { user: "Grace K.", msg: "Amen! Such a powerful word." },
                { user: "Michael B.", msg: "Praying for everyone joining today." },
              ].map((chat, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{chat.user}</span>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-2xl rounded-tl-none">{chat.msg}</p>
                </div>
              ))}
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Say something..." 
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 text-sm"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white rounded-xl">
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-100">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Heart size={20} />
              Need Prayer?
            </h3>
            <p className="text-emerald-100 text-sm mb-4">Our prayer team is online and ready to pray with you right now.</p>
            <button className="w-full py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors">
              Request Live Prayer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessagesCenter = ({ announcements, user }: { announcements: Announcement[], user: User | null }) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Messages Center</h2>
          <p className="text-slate-500 mt-1">Official announcements and community updates.</p>
        </div>
        {user?.role !== 'member' && (
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={20} />
            Post Announcement
          </button>
        )}
      </header>

      <div className="space-y-6">
        {announcements.map((ann) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={ann.id} 
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-1.5 h-full ${ann.type === 'church' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 inline-block ${
                  ann.type === 'church' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {ann.type === 'church' ? 'Church-wide' : `${ann.branch_name} Branch`}
                </span>
                <h3 className="text-2xl font-bold text-slate-900">{ann.title}</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{new Date(ann.timestamp).toLocaleDateString()}</span>
            </div>
            <div className="prose prose-slate max-w-none text-slate-600 mb-6">
              <Markdown>{ann.content}</Markdown>
            </div>
            <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                {ann.sender_name.charAt(0)}
              </div>
              <p className="text-sm font-medium text-slate-900">Posted by {ann.sender_name}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const RoleBadge = ({ role }: { role: string }) => {
  const config: Record<string, { label: string, color: string }> = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    branch_admin: { label: 'Branch Leader', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    group_leader: { label: 'Group Leader', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    member: { label: 'Member', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  const { label, color } = config[role] || config.member;

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${color} uppercase tracking-wider`}>
      {label}
    </span>
  );
};

const Administration = ({ branches, users, auditLogs, invitations, user, onRefresh }: { 
  branches: Branch[], 
  users: any[], 
  auditLogs: AuditLog[], 
  invitations: Invitation[],
  user: User | null,
  onRefresh: () => void
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'branches' | 'audit' | 'invites'>('users');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [newInvite, setNewInvite] = useState({ branch_id: branches[0]?.id || 1, role: 'member' });

  const handleCreateInvite = async () => {
    await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newInvite, created_by: user?.id })
    });
    setIsCreatingInvite(false);
    onRefresh();
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole, admin_id: user?.id })
    });
    onRefresh();
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Administration</h2>
          <p className="text-slate-500 mt-1">Governance, permissions, and church structure.</p>
        </div>
      </header>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { id: 'users', label: 'Users & Roles', icon: Users },
          { id: 'invites', label: 'Invitations', icon: QrCode },
          { id: 'branches', label: 'Branches', icon: MapPin },
          { id: 'audit', label: 'Audit Trail', icon: ClipboardList },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="p-6">User</th>
                  <th className="p-6">Branch</th>
                  <th className="p-6">Current Role</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-sm text-slate-600 font-medium">{u.branch_name}</td>
                    <td className="p-6">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="p-6 text-right">
                      <select 
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs font-bold bg-slate-100 border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="member">Member</option>
                        <option value="group_leader">Group Leader</option>
                        <option value="branch_admin">Branch Leader</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {activeSubTab === 'invites' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Active Invitations</h3>
                <p className="text-sm text-slate-500">Generate secure codes to onboard new leaders and members.</p>
              </div>
              <button 
                onClick={() => setIsCreatingInvite(true)}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Generate Code
              </button>
            </div>

            {isCreatingInvite && (
              <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Target Branch</label>
                  <select 
                    value={newInvite.branch_id}
                    onChange={(e) => setNewInvite({ ...newInvite, branch_id: parseInt(e.target.value) })}
                    className="w-full bg-white/10 border-white/20 rounded-xl text-white focus:ring-emerald-500"
                  >
                    {branches.map(b => <option key={b.id} value={b.id} className="text-slate-900">{b.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Assigned Role</label>
                  <select 
                    value={newInvite.role}
                    onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                    className="w-full bg-white/10 border-white/20 rounded-xl text-white focus:ring-emerald-500"
                  >
                    <option value="member" className="text-slate-900">Member</option>
                    <option value="group_leader" className="text-slate-900">Group Leader</option>
                    <option value="branch_admin" className="text-slate-900">Branch Leader</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsCreatingInvite(false)} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors">Cancel</button>
                  <button onClick={handleCreateInvite} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition-colors">Create</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitations.map((invite) => (
                <div key={invite.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                  {invite.used_at && <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle2 size={20} />
                      Used
                    </div>
                  </div>}
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-100 rounded-xl text-slate-900 font-mono font-bold text-lg tracking-widest">
                      {invite.code}
                    </div>
                    <RoleBadge role={invite.role} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-900">{invite.branch_name}</p>
                    <p className="text-xs text-slate-500">Created by {invite.creator_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'audit' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900">System Audit Logs</h3>
              <span className="text-xs font-bold text-slate-400 uppercase">Last 100 Actions</span>
            </div>
            <div className="divide-y divide-slate-50">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-6 flex gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                    <Shield size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold text-slate-900">
                        {log.user_name} <span className="text-slate-400 font-medium">performed</span> {log.action}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{log.details}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-widest">
                      Target: {log.target_type}
                    </span>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="p-12 text-center text-slate-400 italic">No audit logs recorded yet.</div>
              )}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'branches' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div key={branch.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                  <MapPin size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{branch.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{branch.location}</p>
                <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Campus</span>
                  <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Settings</button>
                </div>
              </div>
            ))}
            <button className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-300 hover:text-emerald-600 transition-all group">
              <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Add New Branch</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RecordContributionForm = ({ campaigns, user, onClose, onRefresh }: { campaigns: Campaign[], user: User | null, onClose: () => void, onRefresh: () => void }) => {
  const [campaignId, setCampaignId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !campaignId || !amount) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          campaign_id: parseInt(campaignId),
          amount: parseFloat(amount),
          method,
          recorded_by: user.id
        })
      });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      onRefresh();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Record Contribution</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Campaign</label>
            <select 
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            >
              <option value="">Select a campaign...</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Amount ($)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Method</label>
            <select 
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Online">Online</option>
            </select>
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 mt-4"
          >
            {isSubmitting ? 'Recording...' : 'Record Contribution'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ServeRoster = ({ user }: { user: User | null }) => {
  const [needs, setNeeds] = useState<any[]>([]);
  const [mySignups, setMySignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [needsRes, signupsRes] = await Promise.all([
        fetch(`/api/volunteer-needs?branch_id=${user.branch_id}`),
        fetch(`/api/my-signups?user_id=${user.id}`)
      ]);
      const needsData = await needsRes.json();
      const signupsData = await signupsRes.json();
      setNeeds(needsData);
      setMySignups(signupsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSignUp = async (needId: number) => {
    if (!user) return;
    await fetch('/api/volunteer-signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ need_id: needId, user_id: user.id })
    });
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6']
    });
    
    fetchData();
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading roster...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Serve Roster</h2>
        <p className="text-slate-500 mt-1">Find your place to serve in the house of God.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Plus size={24} className="text-emerald-600" />
              Open Opportunities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {needs.map((need) => {
                const isSignedUp = mySignups.some(s => s.need_id === need.id);
                const isFull = need.current_count >= need.required_count;
                
                return (
                  <div key={need.id} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-emerald-600">
                        <Users size={20} />
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${
                        isFull ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isFull ? 'Full' : `${need.required_count - need.current_count} Spots Left`}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{need.role_name}</h4>
                    <p className="text-xs font-bold text-emerald-600 mb-3 uppercase tracking-tighter">{need.event_title}</p>
                    <p className="text-sm text-slate-500 mb-6 line-clamp-2">{need.description}</p>
                    
                    <div className="flex items-center gap-3 mb-6 text-xs text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><Clock size={14} /> {new Date(need.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(need.event_time).toLocaleDateString()}</span>
                    </div>

                    <button 
                      onClick={() => handleSignUp(need.id)}
                      disabled={isSignedUp || isFull}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                        isSignedUp 
                          ? 'bg-emerald-50 text-emerald-600 cursor-default' 
                          : isFull 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'
                      }`}
                    >
                      {isSignedUp ? 'Signed Up ✓' : isFull ? 'Position Filled' : "I'll Help"}
                    </button>
                  </div>
                );
              })}
              {needs.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 italic">No open opportunities at the moment.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle2 size={24} className="text-emerald-600" />
              Your Schedule
            </h3>
            <div className="space-y-4">
              {mySignups.map((signup) => (
                <div key={signup.id} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900">{signup.role_name}</h4>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-tighter mb-2">{signup.event_title}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(signup.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(signup.event_time).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {mySignups.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm italic">You haven't signed up for any roles yet.</div>
              )}
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="relative z-10">
              <Sparkles className="mb-4 text-indigo-200" size={32} />
              <h3 className="text-xl font-bold mb-2">Lead a Team?</h3>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                If you feel called to lead a ministry or group, contact your branch administrator to discuss leadership opportunities.
              </p>
              <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">
                Contact Admin
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContributionsDashboard = ({ campaigns, myContributions, branchComparison, user, onRefresh }: { campaigns: Campaign[], myContributions: Contribution[], branchComparison: any[], user: User | null, onRefresh: () => void }) => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showRecordForm, setShowRecordForm] = useState(false);

  const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      {showRecordForm && (
        <RecordContributionForm 
          campaigns={campaigns} 
          user={user} 
          onClose={() => setShowRecordForm(false)} 
          onRefresh={onRefresh} 
        />
      )}
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Contributions & Giving</h2>
          <p className="text-slate-500 mt-1">Transparent tracking of church projects and personal giving.</p>
        </div>
        {user?.role !== 'member' && (
          <button 
            onClick={() => setShowRecordForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Record Contribution
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Campaigns */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <TrendingUp size={24} className="text-emerald-600" />
              Active Campaigns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaigns.map((campaign) => {
                const progress = Math.min(100, (campaign.current_amount / campaign.target_amount) * 100);
                return (
                  <div 
                    key={campaign.id} 
                    onClick={() => {
                      if (progress >= 100) {
                        confetti({
                          particleCount: 150,
                          spread: 70,
                          origin: { y: 0.6 },
                          colors: ['#10b981', '#3b82f6', '#f59e0b']
                        });
                      }
                    }}
                    className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 block">Active Campaign</span>
                        <h4 className="font-bold text-slate-900 text-xl mb-2">{campaign.title}</h4>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2 pr-4">{campaign.description}</p>
                      </div>
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200" strokeWidth="3" />
                          <motion.circle 
                            cx="18" cy="18" r="16" fill="none" 
                            className="stroke-emerald-500" 
                            strokeWidth="3" 
                            strokeDasharray="100 100"
                            initial={{ strokeDashoffset: 100 }}
                            animate={{ strokeDashoffset: 100 - progress }}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-xs font-black text-slate-900">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-2 relative z-10">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Raised</span>
                        <span className="text-lg font-black text-emerald-600">${campaign.current_amount?.toLocaleString() || 0}</span>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target</span>
                        <span className="text-lg font-black text-slate-900">${campaign.target_amount?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">
                      <span>{campaign.contributor_count} Contributors</span>
                      <span>Ends {new Date(campaign.deadline).toLocaleDateString()}</span>
                    </div>

                    {progress >= 100 && (
                      <div className="absolute top-0 right-0 p-2">
                        <Sparkles className="text-emerald-500 animate-bounce" size={20} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal History */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <History size={24} className="text-emerald-600" />
              Your Giving History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="pb-4">Campaign</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Method</th>
                    <th className="pb-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myContributions.map((contribution) => (
                    <tr key={contribution.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-medium text-slate-900">{contribution.campaign_title}</td>
                      <td className="py-4 text-sm text-slate-500">{new Date(contribution.date).toLocaleDateString()}</td>
                      <td className="py-4 text-sm text-slate-500">{contribution.method}</td>
                      <td className="py-4 text-right font-bold text-emerald-600">${contribution.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {myContributions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">No contribution records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Branch Comparison */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PieChart size={24} className="text-emerald-600" />
              Branch Comparison
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchComparison}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="branch_name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total_contributed" radius={[6, 6, 0, 0]}>
                    {branchComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {branchComparison.map((branch, i) => {
                const progress = Math.min(100, (branch.total_contributed / branch.total_target) * 100);
                return (
                  <div key={branch.branch_name} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{branch.branch_name}</span>
                      <span className="text-slate-400">{Math.round(progress)}% of target</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transparency Policy */}
          <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-4">Transparency Policy</h3>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Grace Community Church operates on a **Transparent Participation** model. 
                Members can see who has contributed to campaigns to encourage community participation, 
                while specific amounts remain private between the donor and the finance office.
              </p>
              <button className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-300 hover:text-white transition-colors">
                Read Full Policy
              </button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);
  const [branchComparison, setBranchComparison] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      // First get current user to know role/branch
      const u = await fetch('/api/me').then(res => res.json());
      setUser(u);

      const queryParams = new URLSearchParams({
        role: u.role,
        branch_id: u.branch_id.toString(),
        user_id: u.id.toString()
      }).toString();

      const [s, g, e, p, a, b, au, cp, mc, bc, al, iv] = await Promise.all([
        fetch(`/api/stats?${queryParams}`).then(res => res.json()),
        fetch(`/api/groups?${queryParams}`).then(res => res.json()),
        fetch(`/api/events?${queryParams}`).then(res => res.json()),
        fetch(`/api/prayer-requests?${queryParams}`).then(res => res.json()),
        fetch(`/api/announcements?${queryParams}`).then(res => res.json()),
        fetch(`/api/branches?${queryParams}`).then(res => res.json()),
        fetch(`/api/admin/users?${queryParams}`).then(res => res.json()),
        fetch(`/api/campaigns?${queryParams}`).then(res => res.json()),
        fetch(`/api/me/contributions?${queryParams}`).then(res => res.json()),
        fetch(`/api/stats/branches-comparison?${queryParams}`).then(res => res.json()),
        fetch(`/api/admin/audit-logs?${queryParams}`).then(res => res.json()),
        fetch(`/api/admin/invitations?${queryParams}`).then(res => res.json()),
      ]);
      setStats(s);
      setGroups(g);
      setEvents(e);
      setPrayerRequests(p);
      setAnnouncements(a);
      setBranches(b);
      setAdminUsers(au);
      setCampaigns(cp);
      setMyContributions(mc);
      setBranchComparison(bc);
      setAuditLogs(al);
      setInvitations(iv);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderContent = () => {
    if (selectedGroupId) {
      return <GroupDetail groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} user={user} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} events={events} />;
      case 'live':
        return <LiveService />;
      case 'groups':
        return <GroupsList groups={groups} onSelectGroup={setSelectedGroupId} />;
      case 'events':
        return <EventsCalendar events={events} user={user} onRefresh={fetchData} />;
      case 'serve':
        return <ServeRoster user={user} />;
      case 'contributions':
        return <ContributionsDashboard campaigns={campaigns} myContributions={myContributions} branchComparison={branchComparison} user={user} onRefresh={fetchData} />;
      case 'messages':
        return <MessagesCenter announcements={announcements} user={user} />;
      case 'prayer':
        return <PrayerWall requests={prayerRequests} user={user} onRefresh={fetchData} />;
      case 'settings':
        return <Administration branches={branches} users={adminUsers} auditLogs={auditLogs} invitations={invitations} user={user} onRefresh={fetchData} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
            <Settings size={64} className="mb-4 opacity-20" />
            <p className="text-xl font-medium">Coming Soon</p>
            <p className="text-sm">This module is currently under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSelectedGroupId(null); }} user={user} />
      
      <main className="flex-1 pb-24 md:pb-8">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ChurchOS</h1>
          </div>
          <button className="p-2 text-slate-500">
            <Bell size={24} />
          </button>
        </header>

        <div className="max-w-7xl mx-auto p-6 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedGroupId || '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setSelectedGroupId(null); }} />
      
      <AIAssistant 
        user={user} 
        context={`Church: Grace Community Church. Stats: ${JSON.stringify(stats)}. Groups: ${groups.map(g => g.name).join(', ')}. Events: ${events.map(e => e.title).join(', ')}. Active Campaigns: ${campaigns.map(c => c.title).join(', ')}.`} 
      />

      <BibleReader 
        context={`Current Tab: ${activeTab}. Selected Group: ${selectedGroupId || 'None'}. Church: Grace Community Church.`} 
      />
    </div>
  );
}
