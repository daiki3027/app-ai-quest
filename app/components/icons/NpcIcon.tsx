type Props = {
  label?: string;
};

const NpcIcon = ({ label }: Props) => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-label={label ?? "NPC"}>
    {/* 髪 */}
    <rect x="7" y="6" width="14" height="6" fill="#8a4f27" stroke="#5b2f14" />
    <rect x="6" y="8" width="3" height="3" fill="#5b2f14" />
    <rect x="19" y="8" width="3" height="3" fill="#5b2f14" />
    {/* 顔 */}
    <rect x="9" y="10" width="10" height="5" fill="#f2cfa3" stroke="#a5763c" />
    <rect x="10" y="11" width="2" height="2" fill="#1b1c20" />
    <rect x="16" y="11" width="2" height="2" fill="#1b1c20" />
    {/* シャツ＋ベスト */}
    <rect x="9" y="15" width="10" height="6" fill="#b0642c" stroke="#7a3a16" />
    <rect x="9" y="15" width="10" height="2" fill="#c77a3d" />
    <rect x="11" y="15" width="2" height="6" fill="#d5bda3" />
    <rect x="15" y="15" width="2" height="6" fill="#d5bda3" />
    <rect x="12" y="18" width="4" height="2" fill="#c78a3a" />
    {/* 脚・靴 */}
    <rect x="9" y="21" width="4" height="2" fill="#7a3a16" />
    <rect x="15" y="21" width="4" height="2" fill="#7a3a16" />
    <rect x="9" y="23" width="4" height="2" fill="#4f240e" />
    <rect x="15" y="23" width="4" height="2" fill="#4f240e" />
  </svg>
);

export default NpcIcon;
