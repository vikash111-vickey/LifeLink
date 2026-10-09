import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useLifeLink(user, showToast, onNewBroadcast, onNewCamp) {
  const [dbUser, setDbUser] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [liveBroadcasts, setLiveBroadcasts] = useState([]);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  const syncProfile = useCallback(
    async (extra = {}) => {
      if (!user) return null;
      try {
        const { user: row } = await api.syncUser({
          name: user.displayName,
          ...extra,
        });
        setDbUser(row);
        return row;
      } catch (err) {
        console.warn('[LifeLink] sync:', err.message);
        return null;
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setDbUser(null);
      return;
    }
    syncProfile();
  }, [user, syncProfile]);

  useEffect(() => {
    if (!user || !dbUser?.id) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user:online', { userId: dbUser.id });
    });

    socket.on('donor:count', setOnlineCount);
    socket.on('broadcast:new', (payload) => {
      setLiveBroadcasts((prev) => [payload, ...prev].slice(0, 10));
      showToast?.(`🩸 Alert: ${payload.message?.slice(0, 80)}…`);
      onNewBroadcast?.(payload);
    });
    socket.on('camp:new', (p) => {
      showToast?.(`Camp alert: ${p.camp?.title}`);
      onNewCamp?.(p);
    });
    socket.on('ambulance:dispatched', (p) => showToast?.(p.message || 'Ambulance dispatched'));

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          socket.emit('location:update', {
            userId: dbUser.id,
            lat: latitude,
            lng: longitude,
          });
          try {
            await api.updateLocation({
              lat: latitude,
              lng: longitude,
              is_online: true,
            });
          } catch {
            /* API may be offline */
          }
          if (supabase) {
            await supabase
              .from('users')
              .update({
                lat: latitude,
                lng: longitude,
                is_online: true,
                last_seen: new Date().toISOString(),
              })
              .eq('id', dbUser.id);
          }
        },
        null,
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
    }

    const onUnload = () => {
      api.setOffline().catch(() => {});
      if (supabase) {
        supabase.from('users').update({ is_online: false }).eq('id', dbUser.id);
      }
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.disconnect();
      api.setOffline().catch(() => {});
    };
  }, [user, dbUser?.id, showToast]);

  return {
    dbUser,
    onlineCount,
    liveBroadcasts,
    syncProfile,
    setDbUser,
  };
}
