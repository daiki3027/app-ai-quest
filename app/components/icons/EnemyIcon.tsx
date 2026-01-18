const EnemyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-label="敵">
    {/* 兜と角 */}
    <rect x="8" y="4" width="12" height="6" fill="#6a6f85" stroke="#2e3243" />
    <rect x="7" y="5" width="3" height="3" fill="#4c5064" />
    <rect x="18" y="5" width="3" height="3" fill="#4c5064" />
    <rect x="6" y="3" width="3" height="3" fill="#8d2027" />
    <rect x="19" y="3" width="3" height="3" fill="#8d2027" />
    {/* 顔（ドクロ風） */}
    <rect x="9" y="10" width="10" height="5" fill="#d6d7dd" stroke="#4a4f63" />
    <rect x="10" y="11" width="2" height="2" fill="#c21d1d" />
    <rect x="16" y="11" width="2" height="2" fill="#c21d1d" />
    <rect x="12" y="14" width="4" height="1" fill="#2e3243" />
    {/* 肩・鎧 */}
    <rect x="7" y="15" width="14" height="3" fill="#40345b" stroke="#1f1a30" />
    <rect x="8" y="16" width="2" height="2" fill="#c78a3a" />
    <rect x="18" y="16" width="2" height="2" fill="#c78a3a" />
    {/* 胴体 */}
    <rect x="9" y="18" width="10" height="5" fill="#2f2749" stroke="#1c1a2a" />
    <rect x="12" y="19" width="4" height="2" fill="#c21d1d" />
    <rect x="11" y="21" width="6" height="1" fill="#1c1a2a" />
    {/* 腕・手 */}
    <rect x="7" y="18" width="3" height="4" fill="#40345b" />
    <rect x="18" y="18" width="3" height="4" fill="#40345b" />
    <rect x="6" y="20" width="2" height="2" fill="#1c1a2a" />
    <rect x="20" y="20" width="2" height="2" fill="#1c1a2a" />
    {/* 足 */}
    <rect x="9" y="23" width="4" height="2" fill="#1c1a2a" />
    <rect x="15" y="23" width="4" height="2" fill="#1c1a2a" />
  </svg>
);

export default EnemyIcon;
