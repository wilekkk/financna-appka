import { useState, useRef } from 'react';
import { getDirection, getPreviewKey } from '../utils/swipe';
import { CAT_MAP, SPLIT_INFO } from '../constants';

export default function SwipeCard({ transaction, onSwipe, onSplitRequest }) {
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [exiting, setExiting] = useState(null);
  const dragging = useRef(false);
  const origin   = useRef({ x: 0, y: 0 });

  const handleStart = (cx, cy) => { if (exiting) return; dragging.current = true; origin.current = { x: cx, y: cy }; };
  const handleMove  = (cx, cy) => { if (!dragging.current) return; setPos({ x: cx - origin.current.x, y: cy - origin.current.y }); };
  const handleEnd   = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dir = getDirection(pos.x, pos.y);
    if (dir === 'split') { setPos({ x: 0, y: 0 }); onSplitRequest(); }
    else if (dir) { setExiting(dir); setTimeout(() => onSwipe(dir), 380); }
    else { setPos({ x: 0, y: 0 }); }
  };

  const getTransform = () => {
    if (exiting === 'needs')   return 'translate(160%, 20%) rotate(25deg)';
    if (exiting === 'wants')   return 'translate(-160%, 20%) rotate(-25deg)';
    if (exiting === 'savings') return 'translate(0, -160%)';
    return `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x * 0.07}deg)`;
  };

  const previewKey = exiting || getPreviewKey(pos.x, pos.y);
  const isMoving   = pos.x !== 0 || pos.y !== 0;
  const previewCat = previewKey === 'split' ? SPLIT_INFO : (previewKey ? CAT_MAP[previewKey] : null);

  return (
    <div
      className={`card${exiting ? ' card--exiting' : ''}`}
      style={{
        transform: getTransform(),
        transition: exiting ? 'transform 0.38s ease-in' : (dragging.current ? 'none' : 'transform 0.22s ease-out'),
        borderColor: previewCat?.color,
        boxShadow: previewCat ? `0 8px 40px ${previewCat.color}55` : undefined,
      }}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={handleEnd}
    >
      {previewCat && isMoving && (
        <div className="swipe-badge" style={{ color: previewCat.color, borderColor: previewCat.color }}>
          {previewKey === 'split' ? '✂️ Rozdeliť' : previewCat.label}
        </div>
      )}
      <div className="card-icon">🏪</div>
      <div className="card-store">{transaction.store}</div>
      <div className="card-amount">{transaction.amount.toFixed(2)} €</div>
      <div className="card-date">{transaction.date}</div>
    </div>
  );
}
