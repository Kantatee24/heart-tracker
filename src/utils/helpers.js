export const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

export const generateUserId = () =>
  'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export const AVATARS = [
  { id: 'heart',  emoji: '🖤', label: 'Heart'  },
  { id: 'star',   emoji: '⭐', label: 'Star'   },
  { id: 'spider', emoji: '🕷️', label: 'Spider' },
  { id: 'crown',  emoji: '👑', label: 'Crown'  },
  { id: 'skull',  emoji: '💀', label: 'Skull'  },
  { id: 'gem',    emoji: '💎', label: 'Gem'    },
];

export const REACTIONS = ['❤️', '⭐', '💀', '👑', '🔥', '💎'];

export const MOODS = [
  { id: 'online',  emoji: '🖤', label: 'Online'   },
  { id: 'sleep',   emoji: '😴', label: 'Sleeping' },
  { id: 'eat',     emoji: '🍽️', label: 'Eating'   },
  { id: 'work',    emoji: '💼', label: 'Working'  },
  { id: 'gym',     emoji: '💪', label: 'Gym'      },
  { id: 'movie',   emoji: '🎬', label: 'Movie'    },
  { id: 'drive',   emoji: '🚗', label: 'Driving'  },
  { id: 'love',    emoji: '💕', label: 'Love'     },
];

export const MEMBER_COLORS = [
  '#FF2D78', '#DA70D6', '#00BFFF', '#00FF88', '#FFD700', '#FF6B35',
];

export const getAvatarEmoji = (avatarId) =>
  AVATARS.find((a) => a.id === avatarId)?.emoji ?? '🖤';
