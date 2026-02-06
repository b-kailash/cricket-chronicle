/**
 * NetworkStatus Component for Cricket Chronicle
 * Sprint 2 - S2-005: Error Handling & User Feedback
 *
 * Displays online/offline status indicator that updates in real-time
 */

import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';

interface NetworkStatusProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function NetworkStatus({ showLabel = true, compact = false }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    // Subscribe to online status changes
    const unsubscribe = syncService.onOnlineStatusChange((online) => {
      setIsOnline(online);

      // Show banner briefly when going offline
      if (!online) {
        setShowOfflineBanner(true);
      } else {
        // Hide banner after a delay when coming back online
        setTimeout(() => setShowOfflineBanner(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  // Compact mode for header
  if (compact) {
    return (
      <div className={`network-status-compact ${isOnline ? 'online' : 'offline'}`}>
        <span className="status-dot" />
        {showLabel && <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>}

        <style>{`
          .network-status-compact {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }

          .network-status-compact.online {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
          }

          .network-status-compact.offline {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
          }

          .network-status-compact .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
          }

          .network-status-compact.online .status-dot {
            animation: pulse-green 2s ease-in-out infinite;
          }

          @keyframes pulse-green {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Full banner mode (shows at top when offline)
  if (!showOfflineBanner && isOnline) {
    return null;
  }

  return (
    <div className={`network-status-banner ${isOnline ? 'online' : 'offline'}`}>
      <div className="banner-content">
        {isOnline ? (
          <>
            <svg className="banner-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                fill="currentColor"
              />
            </svg>
            <span>Back online! Your data will sync automatically.</span>
          </>
        ) : (
          <>
            <svg className="banner-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                fill="currentColor"
              />
            </svg>
            <span>You're offline. Don't worry, your data is saved locally and will sync when you're back online.</span>
          </>
        )}
      </div>

      <style>{`
        .network-status-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          padding: 10px 16px;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .network-status-banner.offline {
          background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
          color: white;
        }

        .network-status-banner.online {
          background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
          color: white;
        }

        .banner-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          max-width: 800px;
          margin: 0 auto;
          font-size: 14px;
          font-weight: 500;
        }

        .banner-icon {
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .banner-content {
            font-size: 13px;
          }

          .banner-content span {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
