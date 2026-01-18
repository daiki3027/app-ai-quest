const TreasureIcon = () => {
  const colors = {
    dark: "#3b1a08",
    shadow: "#2a1006",
    mid: "#7a3b12",
    mid2: "#a85a14",
    gold: "#e9a734",
    bright: "#ffd35c",
    shine: "#fff0a0",
  };

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      role="img"
      aria-label="黄金の宝箱"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 蓋の後ろ側（開いた部分） */}
      <rect x="8" y="6" width="16" height="3" fill={colors.mid} />
      <rect x="11" y="6" width="10" height="1" fill={colors.mid2} />
      <rect x="9" y="7" width="14" height="1" fill={colors.gold} />
      <rect x="10" y="8" width="12" height="1" fill={colors.gold} />
      <rect x="8" y="9" width="16" height="1" fill={colors.shadow} />
      <rect x="8" y="5" width="16" height="1" fill={colors.dark} />
      <rect x="7" y="6" width="1" height="4" fill={colors.dark} />
      <rect x="24" y="6" width="1" height="4" fill={colors.dark} />

      {/* 蓋の手前の縁 */}
      <rect x="6" y="10" width="20" height="1" fill={colors.gold} />
      <rect x="6" y="11" width="20" height="2" fill={colors.mid2} />
      <rect x="10" y="11" width="10" height="1" fill={colors.bright} />
      <rect x="6" y="13" width="20" height="1" fill={colors.shadow} />
      <rect x="6" y="10" width="1" height="4" fill={colors.dark} />
      <rect x="25" y="10" width="1" height="4" fill={colors.dark} />

      {/* 蓋の上にこぼれたコインのきらめき */}
      <rect x="11" y="12" width="1" height="1" fill={colors.shine} />
      <rect x="13" y="11" width="1" height="1" fill={colors.bright} />
      <rect x="16" y="12" width="1" height="1" fill={colors.shine} />
      <rect x="18" y="11" width="1" height="1" fill={colors.bright} />

      {/* 本体の板 */}
      <rect x="7" y="15" width="18" height="8" fill={colors.mid2} />
      <rect x="7" y="15" width="18" height="2" fill={colors.gold} />
      <rect x="7" y="17" width="18" height="1" fill={colors.shadow} />
      <rect x="7" y="22" width="18" height="1" fill={colors.gold} />
      <rect x="9" y="19" width="3" height="1" fill={colors.gold} />
      <rect x="21" y="19" width="3" height="1" fill={colors.gold} />
      <rect x="9" y="20" width="4" height="1" fill={colors.mid} />
      <rect x="20" y="20" width="4" height="1" fill={colors.mid} />

      {/* 本体の枠線 */}
      <rect x="6" y="14" width="20" height="1" fill={colors.dark} />
      <rect x="6" y="15" width="1" height="8" fill={colors.dark} />
      <rect x="25" y="15" width="1" height="8" fill={colors.dark} />
      <rect x="7" y="23" width="18" height="1" fill={colors.dark} />

      {/* 本体上に置かれたコイン */}
      <rect x="9" y="14" width="1" height="1" fill={colors.bright} />
      <rect x="12" y="13" width="1" height="1" fill={colors.shine} />
      <rect x="15" y="13" width="1" height="1" fill={colors.bright} />
      <rect x="19" y="13" width="1" height="1" fill={colors.shine} />

      {/* ロック */}
      <rect x="14" y="17" width="5" height="6" fill={colors.dark} />
      <rect x="15" y="18" width="3" height="4" fill={colors.bright} />
      <rect x="15" y="18" width="3" height="1" fill={colors.shine} />
      <rect x="16" y="19" width="1" height="2" fill={colors.shadow} />
      <rect x="15" y="21" width="3" height="1" fill={colors.shadow} />

      {/* こぼれたコイン */}
      <rect x="8" y="24" width="4" height="1" fill={colors.dark} />
      <rect x="8" y="25" width="4" height="2" fill={colors.bright} />
      <rect x="9" y="25" width="2" height="1" fill={colors.shine} />
      <rect x="13" y="24" width="3" height="1" fill={colors.dark} />
      <rect x="13" y="25" width="3" height="1" fill={colors.bright} />
      <rect x="14" y="24" width="1" height="1" fill={colors.shine} />
      <rect x="18" y="24" width="3" height="1" fill={colors.dark} />
      <rect x="18" y="25" width="3" height="2" fill={colors.bright} />
      <rect x="19" y="25" width="1" height="1" fill={colors.shine} />
    </svg>
  );
};

export default TreasureIcon;
