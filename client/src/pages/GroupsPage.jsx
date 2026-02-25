import React, { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, Tag, ArrowRight, Loader2, Search } from 'lucide-react';
import CreateGroupModal from '../components/CreateGroupModal';
import { Link } from 'react-router-dom';

const GroupCard = ({ group }) => (
    <Link to={`/groups/${group.id}`} className="group relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-card hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3">
        <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-indigo-50 text-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <span className="font-black text-xl">{(group.name || '?')[0].toUpperCase()}</span>
            </div>
            <span className={`text-xs font-bold px-2. py-1 rounded-full ${group.my_balance > 0 ? 'bg-emerald-50 text-emerald-600' : group.my_balance < 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-500'}`}>
                {group.my_balance > 0 ? `+₹${(group.my_balance / 100).toFixed(2)}` : group.my_balance < 0 ? `-₹${(Math.abs(group.my_balance) / 100).toFixed(2)}` : 'Settled'}
            </span>
        </div>
        <div>
            <h3 className="font-bold text-slate-900 text-base">{group.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{group.description || 'No description'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto pt-2 border-t border-slate-50">
            <Users size={13} />
            <span>{group.member_count || 1} member{group.member_count !== 1 ? 's' : ''}</span>
        </div>
    </Link>
);

export default function GroupsPage() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const fetchGroups = () => {
        api.get('/groups')
            .then(res => setGroups(res.data))
            .catch(err => toast.error('Failed to load groups'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchGroups(); }, []);

    const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your shared expense groups</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
                >
                    <Plus size={18} /> New Group
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary-200 focus-within:border-primary-300 transition-all">
                <Search size={18} className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search groups..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Groups Grid */}
            {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-100 rounded-2xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24 rounded-3xl bg-white border border-slate-100">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Users size={28} /></div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">{search ? 'No groups found' : 'No groups yet'}</h3>
                    <p className="text-slate-400 text-sm mb-6">{search ? 'Try a different search term' : 'Create your first group to start splitting expenses'}</p>
                    {!search && <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all">Create Group</button>}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(group => <GroupCard key={group.id} group={group} />)}
                    <button onClick={() => setShowCreate(true)} className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 text-slate-400 hover:text-primary-600 transition-all group min-h-[180px]">
                        <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-3 shadow-sm"><Plus size={22} /></div>
                        <span className="font-semibold text-sm">New Group</span>
                    </button>
                </div>
            )}

            {showCreate && (
                <CreateGroupModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); fetchGroups(); }}
                />
            )}
        </div>
    );
}
