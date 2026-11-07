import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Swords,
  Send,
  MessageSquare,
  Search,
  Sparkles,
  Flame,
} from 'lucide-react';
import { Friend, ChatMessage, FighterProfile } from '../types/game.ts';
import { FIGHTING_STYLES } from '../game/combatRules.ts';

interface FriendsChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FighterProfile | null;
  socket: WebSocket | null;
  onInviteToDuel: (friendUid: string) => void;
  strikerImgUrl: string;
  shinobiImgUrl: string;
  titanImgUrl: string;
}

export const FriendsChatModal: React.FC<FriendsChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  socket,
  onInviteToDuel,
  strikerImgUrl,
  shinobiImgUrl,
  titanImgUrl,
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [searchTarget, setSearchTarget] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Quick fighting game battle greetings
  const quickPhrases = [
    'Good Game (GG)!',
    'Ready for a duel?',
    'Run it back!',
    'Impressive combos!',
    'Meet in the arena?',
  ];

  const fetchFriends = async () => {
    if (!currentUser?.uid) return;
    setIsLoadingFriends(true);
    try {
      const res = await fetch(`/api/friends/${currentUser.uid}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        if (data.friends?.length > 0 && !selectedFriend) {
          setSelectedFriend(data.friends[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const fetchDirectChat = async (friendUid: string) => {
    if (!currentUser?.uid) return;
    try {
      const res = await fetch(`/api/messages/direct/${currentUser.uid}/${friendUid}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load direct messages:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen, currentUser?.uid]);

  useEffect(() => {
    if (selectedFriend && currentUser?.uid) {
      fetchDirectChat(selectedFriend.uid);
    }
  }, [selectedFriend, currentUser?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time direct chat messages from WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chat_direct_message' || msg.type === 'chat_direct_ack') {
          // If the message involves currently selected friend or is from them
          if (
            (selectedFriend && msg.senderUid === selectedFriend.uid) ||
            msg.type === 'chat_direct_ack'
          ) {
            setMessages((prev) => [
              ...prev,
              {
                id: msg.id,
                senderUid: msg.senderUid,
                senderName: msg.senderName,
                content: msg.content,
                createdAt: msg.createdAt,
                isSender: msg.senderUid === currentUser?.uid,
              },
            ]);
          }
        }
      } catch {
        // Ignore
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, selectedFriend, currentUser?.uid]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputContent).trim();
    if (!text || !selectedFriend || !currentUser || !socket) return;

    socket.send(
      JSON.stringify({
        type: 'chat_direct',
        senderUid: currentUser.uid,
        receiverUid: selectedFriend.uid,
        senderName: currentUser.fighterName,
        content: text,
      })
    );

    if (!textToSend) setInputContent('');
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTarget.trim() || !currentUser?.uid) return;

    setIsAdding(true);
    setAddFriendStatus(null);
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: currentUser.uid,
          targetIdentifier: searchTarget.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddFriendStatus(data.error || 'Could not find fighter');
      } else {
        setAddFriendStatus(`Added ${data.friend?.fighterName} to friends!`);
        setSearchTarget('');
        fetchFriends();
      }
    } catch (err: any) {
      setAddFriendStatus(err.message || 'Error adding friend');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    if (!currentUser?.uid) return;
    try {
      const res = await fetch(`/api/friends/${currentUser.uid}/${friendUid}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.uid !== friendUid));
        if (selectedFriend?.uid === friendUid) {
          setSelectedFriend(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const getStyleAvatar = (styleId: string) => {
    switch (styleId) {
      case 'blaze_fist':
        return strikerImgUrl;
      case 'void_phantom':
        return shinobiImgUrl;
      case 'titan_vanguard':
        return titanImgUrl;
      case 'astral_ronin':
        return shinobiImgUrl;
      default:
        return strikerImgUrl;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full h-[620px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold text-slate-100">
                Fighter Friend Network & Direct Chat
              </h2>
              <span className="text-xs text-slate-400">
                PostgreSQL persistent connections · Real-time direct messaging
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close friend chat modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split View (Friends List Left / Chat Right) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Left: Friend List & Add Form */}
          <div className="w-full md:w-80 border-r border-slate-800/80 flex flex-col bg-slate-950/40 shrink-0">
            {/* Add Friend Form */}
            <div className="p-3.5 border-b border-slate-800/80">
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <div className="relative flex-1">
                  <UserPlus className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Add by email / name..."
                    value={searchTarget}
                    onChange={(e) => setSearchTarget(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {isAdding ? '...' : 'Add'}
                </button>
              </form>
              {addFriendStatus && (
                <div className="text-[11px] text-amber-400 mt-1.5 px-1 truncate">
                  {addFriendStatus}
                </div>
              )}
            </div>

            {/* Friends Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2">
              {isLoadingFriends ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading friend list...
                </div>
              ) : friends.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 mb-1">No friends added yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Add fighters by their email or ring name to duel and chat!
                  </p>
                </div>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriend?.uid === friend.uid;
                  const cfg = FIGHTING_STYLES[friend.fightingStyle] || FIGHTING_STYLES.blaze_fist;

                  return (
                    <div
                      key={friend.uid}
                      onClick={() => setSelectedFriend(friend)}
                      className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'bg-slate-800 text-white'
                          : 'hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                          <img
                            src={getStyleAvatar(friend.fightingStyle)}
                            alt={friend.fighterName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div
                            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${
                              friend.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">
                            {friend.fighterName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                            <span>{cfg.name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-amber-400">
                              {friend.eloRating} ELO
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <button
                          title="Invite to Duel"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInviteToDuel(friend.uid);
                          }}
                          className="p-1.5 rounded-md text-amber-400 hover:bg-slate-700/80 hover:text-amber-300 transition-colors"
                        >
                          <Swords className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Remove Friend"
                          aria-label="Remove Friend"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.uid);
                          }}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-700/80 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Active Direct Chat */}
          <div className="flex-1 flex flex-col bg-slate-900/60 min-w-0">
            {selectedFriend ? (
              <>
                {/* Active Chat Header */}
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                      <img
                        src={getStyleAvatar(selectedFriend.fightingStyle)}
                        alt={selectedFriend.fighterName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-100">
                        {selectedFriend.fighterName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedFriend.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                        />
                        <span>{selectedFriend.isOnline ? 'Online' : 'Offline'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-400 font-mono">
                          {selectedFriend.wins}W / {selectedFriend.losses}L
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onInviteToDuel(selectedFriend.uid)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Challenge to Duel
                  </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="py-20 text-center text-xs text-slate-500">
                      No message history yet. Say hello or challenge {selectedFriend.fighterName}!
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMe = m.isSender || m.senderUid === currentUser?.uid;
                      return (
                        <div
                          key={m.id || idx}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs ${
                              isMe
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-br-none'
                                : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                            }`}
                          >
                            {m.content}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5 px-1 font-mono">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Phrases */}
                <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mr-1 shrink-0">
                    Quick:
                  </span>
                  {quickPhrases.map((phrase) => (
                    <button
                      key={phrase}
                      onClick={() => handleSendMessage(phrase)}
                      className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                {/* Message Input Box */}
                <div className="p-3 border-t border-slate-800 bg-slate-950/60">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Message ${selectedFriend.fighterName}...`}
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={!inputContent.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
                <h3 className="font-bold text-sm text-slate-300 mb-1">
                  Select a Fighter to Chat
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Choose a friend from the list on the left to review match banter or arrange a private duel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
