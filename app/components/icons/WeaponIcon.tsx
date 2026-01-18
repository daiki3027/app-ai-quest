const WeaponIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-label="武器">
    {/* 刃 */}
    <rect x="12" y="4" width="2" height="9" fill="#dfe3f7" stroke="#5a5a76" />
    <rect x="14" y="5" width="1" height="7" fill="#c7cce5" />
    <rect x="13" y="3" width="1" height="2" fill="#f7f8ff" />
    {/* 柄・鍔 */}
    <rect x="9" y="13" width="6" height="2" fill="#f0b233" stroke="#9a5c1d" />
    <rect x="10" y="15" width="4" height="5" fill="#c0792f" stroke="#6f3a11" />
    <rect x="11" y="20" width="2" height="2" fill="#f0c25e" />
  </svg>
);

export default WeaponIcon;
