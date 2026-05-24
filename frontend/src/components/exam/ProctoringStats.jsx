/**
 * ProctoringStats Component
 * Desktop: thin bar below topbar. Mobile: compact bottom bar.
 * className → inline styles. Logic unchanged.
 */

const ProctoringStats = ({ stats, test, webcamActive }) => {
  if (!test) return null;

  const getStatusColor = () => {
    if (stats.tabSwitches >= (test.max_tab_switches || 3))                         return '#EF4444';
    if (stats.tabSwitches >= (test.max_tab_switches || 3) * 0.7)                   return '#F97316';
    if (stats.totalViolations > 5)                                                  return '#EAB308';
    return '#10B981';
  };

  const getStatusText = () => {
    if (stats.tabSwitches >= (test.max_tab_switches || 3))              return 'Critical';
    if (stats.tabSwitches >= (test.max_tab_switches || 3) * 0.7)        return 'Warning';
    if (stats.totalViolations > 5)                                       return 'Caution';
    return 'Normal';
  };

  const color = getStatusColor();
  const tabWarn = stats.tabSwitches >= (test.max_tab_switches || 3) * 0.7;
  const tabCrit = stats.tabSwitches >= (test.max_tab_switches || 3);

  return (
    <>
      <style>{`
        @media (max-width: 767px) { .ps-desktop { display: none !important; } }
        @media (min-width: 768px) { .ps-mobile  { display: none !important; } }
      `}</style>

      {/* Desktop — thin top bar */}
      <div className="ps-desktop" style={{
        position: 'fixed', top: 80, left: 0, right: 0, zIndex: 30,
        background: 'var(--s1)',
        borderBottom: '1px solid var(--border-1)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '6px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-2)', marginRight: 8 }}>📊 Proctoring:</span>

              <span style={{ fontWeight: 600, color: webcamActive ? '#10B981' : '#EF4444' }}>
                📹 {webcamActive ? 'Active' : 'Inactive'}
              </span>

              {test.enable_tab_monitoring && (
                <>
                  <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>|</span>
                  <span style={{ fontWeight: tabWarn ? 600 : 400, color: tabWarn ? '#F97316' : 'var(--text-2)' }}>
                    🔄 Tab: {stats.tabSwitches}/{test.max_tab_switches || 3}
                  </span>
                </>
              )}

              {test.enable_window_blur_detection && (
                <>
                  <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>|</span>
                  <span style={{ color: 'var(--text-2)' }}>👁️ Blur: {stats.windowBlurs}</span>
                </>
              )}

              <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>|</span>
              <span style={{ color: 'var(--text-2)' }}>📋 Copy/Paste: {stats.copyPaste}</span>

              <span style={{ color: 'var(--text-3)', margin: '0 6px' }}>|</span>
              <span style={{ color: 'var(--text-2)' }}>Total: {stats.totalViolations}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Status:</span>
              <span style={{ fontWeight: 700, color }}>{getStatusText()}</span>
            </div>
          </div>

          {/* Critical warning bar */}
          {tabCrit && (
            <div style={{
              marginTop: 4, padding: '4px 12px', borderRadius: 6,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 11, color: '#FCA5A5',
            }}>
              ⚠️ Maximum tab switches reached! Further violations may result in test termination.
            </div>
          )}
        </div>
      </div>

      {/* Mobile — compact bottom bar */}
      <div className="ps-mobile" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--s1)',
        borderTop: '1px solid var(--border-1)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{ padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, color: webcamActive ? '#10B981' : '#EF4444' }}>📹</span>
            {test.enable_tab_monitoring && (
              <span style={{ fontWeight: tabWarn ? 600 : 400, color: tabWarn ? '#F97316' : 'var(--text-2)' }}>
                🔄 {stats.tabSwitches}/{test.max_tab_switches || 3}
              </span>
            )}
            <span style={{ color: 'var(--text-2)' }}>👁️ {stats.windowBlurs}</span>
            <span style={{ color: 'var(--text-2)' }}>📋 {stats.copyPaste}</span>
          </div>
          <span style={{ fontWeight: 700, color }}>{getStatusText()}</span>
        </div>
      </div>
    </>
  );
};

export default ProctoringStats;