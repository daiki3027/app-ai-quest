const GateIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-label="門">
    {/* 柱 */}
    <rect x="3" y="6" width="5" height="16" fill="#4f5666" stroke="#1f2430" />
    <rect x="18" y="6" width="5" height="16" fill="#4f5666" stroke="#1f2430" />
    {/* アーチとスカル */}
    <rect x="7" y="10" width="12" height="8" fill="#6a6f7c" stroke="#2c323f" />
    <rect x="9" y="10" width="8" height="3" fill="#5a5f6d" />
    <rect x="11" y="8" width="4" height="3" fill="#d6d7dd" stroke="#4a4f63" />
    <rect x="12" y="9" width="2" height="1" fill="#c21d1d" />
    {/* 炎の飾り */}
    <rect x="4" y="4" width="2" height="2" fill="#c21d1d" />
    <rect x="20" y="4" width="2" height="2" fill="#c21d1d" />
    <rect x="4" y="3" width="1" height="1" fill="#ffb733" />
    <rect x="21" y="3" width="1" height="1" fill="#ffb733" />
    {/* ポータル光 */}
    <rect x="9" y="14" width="8" height="6" fill="#6b3ad6" />
    <rect x="10" y="15" width="6" height="1" fill="#8e5cff" />
    <rect x="10" y="18" width="6" height="1" fill="#8e5cff" />
  </svg>
);

export default GateIcon;
