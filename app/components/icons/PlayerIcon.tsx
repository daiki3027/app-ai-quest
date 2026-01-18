const PlayerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-label="プレイヤー">
    {/* バンダナ */}
    <rect x="8" y="6" width="12" height="2" fill="#2571c8" />
    <rect x="7" y="6" width="2" height="2" fill="#1b58a3" />
    <rect x="18" y="5" width="3" height="2" fill="#b3302b" />
    {/* 髪 */}
    <rect x="8" y="7" width="12" height="4" fill="#8b552f" />
    <rect x="7" y="8" width="3" height="2" fill="#6a3e22" />
    {/* 顔 */}
    <rect x="9" y="9" width="10" height="5" fill="#f2c994" stroke="#9c6a32" />
    <rect x="10" y="10" width="2" height="2" fill="#1b1c20" />
    <rect x="16" y="10" width="2" height="2" fill="#1b1c20" />
    {/* 上半身 */}
    <rect x="9" y="14" width="10" height="4" fill="#2571c8" stroke="#1f3f73" />
    <rect x="8" y="15" width="12" height="1" fill="#2f8ae7" />
    <rect x="9" y="18" width="10" height="1" fill="#1f3f73" />
    {/* ベルト */}
    <rect x="9" y="18" width="10" height="2" fill="#8b552f" />
    <rect x="12" y="18" width="4" height="2" fill="#c78a4a" />
    {/* 脚 */}
    <rect x="9" y="20" width="4" height="3" fill="#2d5b9f" />
    <rect x="15" y="20" width="4" height="3" fill="#2d5b9f" />
    {/* 靴 */}
    <rect x="8" y="22" width="6" height="2" fill="#6b3a1f" />
    <rect x="14" y="22" width="6" height="2" fill="#6b3a1f" />
  </svg>
);

export default PlayerIcon;
