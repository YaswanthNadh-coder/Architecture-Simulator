import { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Users, X, Send, UserPlus, Play, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const WorkspacePanel = () => {
  const { users, currentUser, activities, sendChatMessage } = useWorkspaceStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const onlineUsers = users.filter(u => u.isOnline);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activities, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendChatMessage(message.trim());
    setMessage('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 text-text-muted hover:text-white hover:bg-white/5 border border-transparent hover:border-border-subtle"
        title="Team Workspace"
      >
        <div className="flex -space-x-1.5 mr-1">
          {onlineUsers.slice(0, 3).map((u, i) => (
            <div
              key={u.id}
              className="w-4 h-4 rounded-full border border-bg-surface flex items-center justify-center text-[8px] font-bold text-white relative"
              style={{ backgroundColor: u.color, zIndex: 10 - i }}
            >
              {u.avatar}
            </div>
          ))}
        </div>
        Team
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-[380px] bg-bg-surface border-l border-border-subtle z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-brand-500" />
                  <h2 className="text-sm font-bold text-white">Team Workspace</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold ml-2">
                    {onlineUsers.length} Online
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Online Users List */}
              <div className="p-4 border-b border-border-subtle shrink-0 flex gap-3 overflow-x-auto">
                {users.map(u => (
                  <div key={u.id} className="flex flex-col items-center gap-1 group relative">
                    <div className="relative">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
                        style={{ backgroundColor: u.color, opacity: u.isOnline ? 1 : 0.4 }}
                      >
                        {u.avatar}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-surface ${u.isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                    </div>
                    <span className="text-[10px] text-text-muted font-medium w-16 text-center truncate">
                      {u.name}
                    </span>
                    {u.id !== currentUser.id && u.isOnline && (
                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="bg-bg-panel p-1 rounded-full border border-border-subtle text-text-muted hover:text-brand-400">
                          <UserPlus size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Activity / Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {activities.map(act => {
                  const user = users.find(u => u.id === act.userId)!;
                  const isMe = user.id === currentUser.id;

                  if (act.type === 'chat') {
                    return (
                      <div key={act.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-text-muted">{user.name}</span>
                          <span className="text-[9px] text-text-muted/50">{formatTime(act.timestamp)}</span>
                        </div>
                        <div 
                          className={`max-w-[85%] px-4 py-2 rounded-2xl text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-brand-500 text-white rounded-tr-sm' 
                              : 'bg-bg-panel border border-border-subtle text-text-main rounded-tl-sm'
                          }`}
                        >
                          {act.data}
                        </div>
                      </div>
                    );
                  }

                  // System Activity Event
                  return (
                    <div key={act.id} className="flex items-center justify-center gap-2 my-2">
                      <div className="w-full h-px bg-border-subtle flex-1" />
                      <div className="flex items-center gap-1.5 text-[10px] text-text-muted bg-bg-surface px-2">
                        {act.type === 'join' && <UserPlus size={10} className="text-emerald-500" />}
                        {act.type === 'run' && <Play size={10} className="text-brand-500" />}
                        {act.type === 'edit' && <Edit3 size={10} className="text-yellow-500" />}
                        <span className="font-bold" style={{ color: user.color }}>{user.name}</span>
                        <span>
                          {act.type === 'join' ? 'joined the session' :
                           act.type === 'run' ? 'ran the simulation' :
                           'edited the code'}
                        </span>
                        <span className="text-[9px] opacity-50 ml-1">{formatTime(act.timestamp)}</span>
                      </div>
                      <div className="w-full h-px bg-border-subtle flex-1" />
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-border-subtle bg-bg-panel shrink-0">
                <form onSubmit={handleSend} className="relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message team..."
                    className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-text-muted outline-none focus:border-brand-500 transition-colors shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-transparent disabled:text-text-muted text-white rounded-lg transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
