/**
 * OrgDashboard.jsx
 * Route: /org/dashboard
 * Redesigned: amber-themed layout, invite panel, team cards, invitation tracker.
 */

import { useState, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { useAuth }              from '../../context/AuthContext';
import * as orgApi              from '../../api/orgApi';

/* ─── Helpers ────────────────────────────────────────────── */
function Avatar({ name, size = 40 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},50%,22%)`, border: `1px solid hsl(${hue},50%,32%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontSize: size * 0.33, fontWeight: 800,
      color: `hsl(${hue},65%,68%)`,
    }}>{initials}</div>
  );
}

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
      background: 'var(--s3)', border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      boxShadow: 'var(--shadow-lg)', animation: 'toastSlide 0.35s var(--ease-spring)', maxWidth: 360,
    }}>
      <span style={{ fontSize: 13.5, color: 'var(--text-1)' }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:2,fontSize:18,lineHeight:1 }}>×</button>
    </div>
  );
}

/* ─── Org Layout (amber theme) ───────────────────────────── */
function OrgLayout({ children, title, subtitle, actions, org }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.matches) setCollapsed(true);
    const h = (e) => setCollapsed(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const W = collapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--s0)' }}>
      {/* Sidebar */}
      <aside style={{
        width: W, minHeight: '100vh', flexShrink: 0, background: 'var(--s1)',
        borderRight: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s var(--ease-spring)', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh', zIndex: 30,
      }}>
        {/* Logo row */}
        <div style={{ height: 60, display: 'flex', alignItems: 'center', padding: collapsed ? '0 18px' : '0 20px', borderBottom: '1px solid var(--border-1)', justifyContent: collapsed ? 'center' : 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,#F59E0B,#EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(245,158,11,0.35)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M3 10h18M5 6h1m4 0h1m4 0h1m-9 4h1m4 0h1m4 0h1M5 21V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v15"/>
              </svg>
            </div>
            {!collapsed && <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:15,color:'var(--text-1)',whiteSpace:'nowrap' }}>TalentProctor</span>}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:4,borderRadius:6,display:'flex' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:4 }}>
          {!collapsed && (
            <div style={{ padding:'7px 12px',borderRadius:8,marginBottom:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.15)',display:'flex',alignItems:'center',gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:'50%',background:'#F59E0B' }} />
              <span style={{ fontSize:11,fontWeight:600,color:'#FCD34D',letterSpacing:'0.06em',textTransform:'uppercase' }}>Org Owner</span>
            </div>
          )}
          <div style={{ display:'flex',alignItems:'center',gap:collapsed?0:10,justifyContent:collapsed?'center':'flex-start',padding:collapsed?'10px 0':'9px 12px',borderRadius:10,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',color:'#FCD34D' }}>
            <span style={{ fontSize:16 }}>🏢</span>
            {!collapsed && <span style={{ fontSize:13.5,fontWeight:600 }}>Dashboard</span>}
          </div>
        </nav>

        {/* User + logout */}
        <div style={{ padding:'12px 10px',borderTop:'1px solid var(--border-1)' }}>
          {!collapsed && (
            <div style={{ padding:'10px 12px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--border-1)',marginBottom:8 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#F59E0B,#EF4444)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',fontFamily:'Syne,sans-serif',flexShrink:0 }}>
                  {user?.full_name?.[0]?.toUpperCase() || 'O'}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{user?.full_name}</div>
                  <div style={{ fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:4 }}>
                    <div style={{ width:5,height:5,borderRadius:'50%',background:'#F59E0B' }} />
                    {org?.name || 'Organization Owner'}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width:'100%',display:'flex',alignItems:'center',gap:collapsed?0:8,justifyContent:collapsed?'center':'flex-start',padding:collapsed?'10px 0':'9px 12px',borderRadius:10,cursor:'pointer',background:'none',border:'none',color:'var(--text-3)',fontSize:13.5,fontWeight:500,transition:'all 0.2s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.08)';e.currentTarget.style.color='#FCA5A5';}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-3)';}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',minWidth:0 }}>
        <header style={{ height:60,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',background:'var(--topbar-bg)',borderBottom:'1px solid var(--border-1)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',position:'sticky',top:0,zIndex:20,flexShrink:0 }}>
          <div>
            <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-1)',lineHeight:1.2 }}>{title}</h1>
            {subtitle && <p style={{ fontSize:12,color:'var(--text-3)',marginTop:1 }}>{subtitle}</p>}
          </div>
          {actions && <div style={{ display:'flex',alignItems:'center',gap:10 }}>{actions}</div>}
        </header>
        <main style={{ flex:1,padding:'28px',overflowY:'auto' }}>{children}</main>
      </div>
    </div>
  );
}

/* ─── Remove Confirmation dialog ─────────────────────────── */
function RemoveDialog({ recruiter, onConfirm, onClose }) {
  if (!recruiter) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',animation:'fadeIn 0.2s both' }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:201,width:'calc(100% - 32px)',maxWidth:400,background:'var(--s2)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:18,padding:'24px',boxShadow:'var(--shadow-xl)',animation:'fadeUp 0.25s both' }}>
        <div style={{ width:44,height:44,borderRadius:12,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,fontSize:20 }}>⚠️</div>
        <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-1)',marginBottom:8 }}>Remove Recruiter</h3>
        <p style={{ fontSize:13.5,color:'var(--text-2)',lineHeight:1.6,marginBottom:20 }}>
          Remove <strong style={{ color:'var(--text-1)' }}>{recruiter.full_name}</strong> from your organization?
          They will lose access to all tests and data immediately.
        </p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px',borderRadius:10,background:'var(--s3)',border:'1px solid var(--border-2)',color:'var(--text-1)',fontWeight:600,fontSize:13.5,cursor:'pointer',fontFamily:'DM Sans,sans-serif' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1,padding:'10px',borderRadius:10,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5',fontWeight:700,fontSize:13.5,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.25)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.15)'}>Remove</button>
        </div>
      </div>
    </>
  );
}

/* ─── Invitation status badge ────────────────────────────── */
function InvBadge({ status }) {
  const map = {
    pending:  { color:'#F59E0B', bg:'rgba(245,158,11,0.1)',  border:'rgba(245,158,11,0.25)',  dot:true  },
    accepted: { color:'#10B981', bg:'rgba(16,185,129,0.1)',  border:'rgba(16,185,129,0.25)',  dot:false },
    expired:  { color:'#6B7280', bg:'rgba(107,114,128,0.1)', border:'rgba(107,114,128,0.2)', dot:false },
  };
  const c = map[status] || map.expired;
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,background:c.bg,border:`1px solid ${c.border}`,fontSize:11,fontWeight:700,color:c.color,letterSpacing:'0.03em',textTransform:'capitalize' }}>
      {c.dot && <span style={{ width:5,height:5,borderRadius:'50%',background:c.color,display:'inline-block',animation:'glowPulse 1.5s ease-in-out infinite' }} />}
      {status}
    </span>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const OrgDashboard = () => {
  const [org, setOrg]               = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting]     = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [invFocused, setInvFocused] = useState(false);
  const [copied, setCopied]         = useState(null);

  const notify = (msg, type='success') => setToast({ msg, type });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgRes, teamRes] = await Promise.all([orgApi.getMyOrg(), orgApi.getTeam()]);
      setOrg(orgRes.data.org);
      setRecruiters(teamRes.data.recruiters);
      setInvitations(teamRes.data.invitations);
    } catch { notify('Failed to load organization data.', 'error'); }
    finally { setLoading(false); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await orgApi.inviteRecruiter(inviteEmail.trim());
      notify(`✉️ Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      await loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to send invitation', 'error'); }
    finally { setInviting(false); }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await orgApi.removeRecruiter(removeTarget.user_id);
      notify(`${removeTarget.full_name} has been removed.`);
      setRemoveTarget(null);
      await loadData();
    } catch { notify('Failed to remove recruiter.', 'error'); }
  };

  const copyInviteLink = async (inv) => {
    const link = `${window.location.origin}/invite/accept?token=${inv.token}`;
    await navigator.clipboard.writeText(link);
    setCopied(inv.invitation_id);
    setTimeout(() => setCopied(null), 2000);
  };

  const pendingCount   = invitations.filter(i => i.status === 'pending').length;
  const acceptedCount  = invitations.filter(i => i.status === 'accepted').length;

  if (loading) return (
    <OrgLayout title="Dashboard" subtitle="Loading…">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:300 }}>
        <div style={{ width:36,height:36,borderRadius:'50%',border:'3px solid var(--s5)',borderTopColor:'#F59E0B',animation:'spin 0.9s linear infinite' }} />
      </div>
    </OrgLayout>
  );

  return (
    <OrgLayout
      title="Organization Dashboard"
      subtitle={org?.name ? `${org.name} · ${org.type?.charAt(0).toUpperCase() + org.type?.slice(1)}` : 'My Organization'}
      org={org}
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glowPulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastSlide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        input::placeholder{color:var(--text-3)!important;}
      `}</style>

      {/* ── Org hero card ── */}
      <div style={{ background:'var(--s2)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:20,overflow:'hidden',marginBottom:20,boxShadow:'var(--shadow-md)' }}>
        <div style={{ height:3,background:'linear-gradient(90deg,#F59E0B,#EF4444,#8B5CF6)' }} />
        <div style={{ padding:'24px 28px',display:'flex',alignItems:'flex-start',gap:24,flexWrap:'wrap' }}>
          {/* Org icon */}
          <div style={{ width:56,height:56,borderRadius:16,background:'rgba(245,158,11,0.12)',border:'2px solid rgba(245,158,11,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0 }}>
            {org?.type === 'company' ? '🏢' : org?.type === 'college' ? '🎓' : org?.type === 'school' ? '🏫' : '🏠'}
          </div>
          {/* Info */}
          <div style={{ flex:1 }}>
            <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:'var(--text-1)',marginBottom:6 }}>{org?.name}</h2>
            <div style={{ display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
              <span style={{ padding:'3px 12px',borderRadius:20,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',fontSize:12,fontWeight:700,color:'#FCD34D',textTransform:'capitalize' }}>
                {org?.type}
              </span>
              {org?.domain && (
                <span style={{ fontSize:13,color:'var(--text-3)',display:'flex',alignItems:'center',gap:4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {org.domain}
                </span>
              )}
            </div>
          </div>
          {/* Stats */}
          <div style={{ display:'flex',gap:12,flexShrink:0,flexWrap:'wrap' }}>
            {[
              { val: recruiters.length,  label: 'Recruiters',     color: '#818CF8' },
              { val: pendingCount,        label: 'Pending Invites', color: '#FCD34D' },
              { val: acceptedCount,       label: 'Accepted',        color: '#34D399' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center',padding:'12px 18px',borderRadius:12,background:'var(--s3)',border:'1px solid var(--border-1)' }}>
                <div style={{ fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:s.color,lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:11,color:'var(--text-3)',marginTop:5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>

        {/* ── Left col ── */}
        <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

          {/* Invite panel */}
          <div style={{ background:'var(--s2)',border:'1px solid var(--border-1)',borderRadius:18,padding:'24px',boxShadow:'var(--shadow-sm)' }}>
            <div style={{ marginBottom:20 }}>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--text-1)',marginBottom:6,display:'flex',alignItems:'center',gap:8 }}>
                <span>✉️</span> Invite a Recruiter
              </h3>
              <p style={{ fontSize:13,color:'var(--text-3)',lineHeight:1.6 }}>
                Recruiters join by email invite only — self-registration is disabled for your organization.
              </p>
            </div>

            <form onSubmit={handleInvite}>
              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                <div style={{ position:'relative' }}>
                  <div style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:invFocused?'var(--brand-light)':'var(--text-3)',transition:'color 0.2s',pointerEvents:'none' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <input
                    type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
                    onFocus={()=>setInvFocused(true)} onBlur={()=>setInvFocused(false)}
                    placeholder="recruiter@yourcompany.com" required
                    style={{
                      width:'100%',padding:'12px 14px 12px 44px',borderRadius:12,
                      background:'var(--s3)',
                      border:`1px solid ${invFocused?'var(--brand)':'var(--border-2)'}`,
                      color:'var(--text-1)',fontSize:14,outline:'none',
                      boxShadow:invFocused?'0 0 0 3px rgba(99,102,241,0.12)':'none',
                      transition:'all 0.2s',fontFamily:'DM Sans,sans-serif',
                    }}
                  />
                </div>
                <button type="submit" disabled={inviting||!inviteEmail.trim()} style={{
                  padding:'12px',borderRadius:12,fontWeight:700,fontSize:14,
                  background:inviting?'var(--s4)':'linear-gradient(135deg,#F59E0B,#EF4444)',
                  border:'none',color:'white',cursor:inviting||!inviteEmail.trim()?'not-allowed':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  boxShadow:inviting||!inviteEmail.trim()?'none':'0 4px 16px rgba(245,158,11,0.35)',
                  transition:'all 0.2s',fontFamily:'DM Sans,sans-serif',
                  opacity:!inviteEmail.trim()?0.5:1,
                }}
                onMouseEnter={e=>{if(!inviting&&inviteEmail.trim()){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 24px rgba(245,158,11,0.45)';}}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=inviting||!inviteEmail.trim()?'none':'0 4px 16px rgba(245,158,11,0.35)';}}>
                  {inviting
                    ? <><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'white',animation:'spin 0.7s linear infinite' }} />Sending…</>
                    : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send Invitation</>
                  }
                </button>
              </div>
            </form>

            {/* Info note */}
            <div style={{ marginTop:16,padding:'10px 14px',borderRadius:10,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',fontSize:12,color:'#FCD34D',lineHeight:1.55 }}>
              💡 The invited person will receive a link to register and be automatically added to <strong>{org?.name}</strong>.
            </div>
          </div>

          {/* Invitations list */}
          <div style={{ background:'var(--s2)',border:'1px solid var(--border-1)',borderRadius:18,overflow:'hidden',boxShadow:'var(--shadow-sm)' }}>
            <div style={{ padding:'18px 20px',borderBottom:'1px solid var(--border-1)',background:'var(--s1)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',display:'flex',alignItems:'center',gap:7 }}>
                <span>📬</span> Invitations
                {pendingCount > 0 && (
                  <span style={{ padding:'1px 8px',borderRadius:20,background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',fontSize:11,fontWeight:700,color:'#FCD34D' }}>{pendingCount} pending</span>
                )}
              </h3>
            </div>

            {invitations.length === 0 ? (
              <div style={{ padding:'40px 24px',textAlign:'center',color:'var(--text-3)',fontSize:13 }}>
                <div style={{ fontSize:28,marginBottom:10 }}>📭</div>
                No invitations sent yet. Use the form to invite your first recruiter.
              </div>
            ) : (
              <div style={{ padding:'12px' }}>
                {invitations.map((inv, i) => (
                  <div key={inv.invitation_id} style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    padding:'12px 14px',borderRadius:11,marginBottom:6,
                    background:'var(--s3)',border:'1px solid var(--border-1)',
                    transition:'all 0.2s',
                  }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13.5,fontWeight:600,color:'var(--text-1)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                        {inv.email}
                      </div>
                      <div style={{ fontSize:11.5,color:'var(--text-3)' }}>
                        {new Date(inv.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        {inv.expires_at && ` · expires ${new Date(inv.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`}
                      </div>
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                      <InvBadge status={inv.status} />
                      {inv.status === 'pending' && (
                        <button onClick={()=>copyInviteLink(inv)} style={{
                          padding:'4px 10px',borderRadius:7,fontSize:11,fontWeight:700,
                          background:copied===inv.invitation_id?'rgba(16,185,129,0.15)':'var(--s4)',
                          border:`1px solid ${copied===inv.invitation_id?'rgba(16,185,129,0.3)':'var(--border-2)'}`,
                          color:copied===inv.invitation_id?'#34D399':'var(--text-3)',
                          cursor:'pointer',transition:'all 0.2s',
                        }}>
                          {copied===inv.invitation_id ? '✓ Copied' : '🔗 Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right col: Team members ── */}
        <div style={{ background:'var(--s2)',border:'1px solid var(--border-1)',borderRadius:18,overflow:'hidden',boxShadow:'var(--shadow-sm)' }}>
          <div style={{ padding:'18px 20px',borderBottom:'1px solid var(--border-1)',background:'var(--s1)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'var(--text-1)',display:'flex',alignItems:'center',gap:7 }}>
              <span>👥</span> Team Recruiters
            </h3>
            <span style={{ fontSize:12,color:'var(--text-3)' }}>{recruiters.length} member{recruiters.length!==1?'s':''}</span>
          </div>

          {recruiters.length === 0 ? (
            <div style={{ padding:'56px 24px',textAlign:'center' }}>
              <div style={{ width:64,height:64,borderRadius:20,background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px' }}>👤</div>
              <p style={{ fontSize:14,fontWeight:600,color:'var(--text-2)',marginBottom:6 }}>No recruiters yet</p>
              <p style={{ fontSize:13,color:'var(--text-3)' }}>Send an invitation on the left to add your first team member.</p>
            </div>
          ) : (
            <div style={{ padding:'14px' }}>
              {recruiters.map((r, i) => (
                <div key={r.user_id} style={{
                  display:'flex',alignItems:'center',gap:12,
                  padding:'14px 16px',borderRadius:12,marginBottom:8,
                  background:'var(--s3)',border:'1px solid var(--border-1)',
                  transition:'all 0.2s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border-2)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-1)';}}>
                  <Avatar name={r.full_name} size={40} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:600,color:'var(--text-1)',marginBottom:2 }}>{r.full_name}</div>
                    <div style={{ fontSize:12,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.email}</div>
                    {r.created_at && (
                      <div style={{ fontSize:11,color:'var(--text-3)',marginTop:2,display:'flex',alignItems:'center',gap:4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Joined {new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </div>
                    )}
                  </div>
                  {/* Active indicator */}
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:20,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)' }}>
                      <div style={{ width:5,height:5,borderRadius:'50%',background:'#10B981',animation:'glowPulse 2s ease-in-out infinite' }} />
                      <span style={{ fontSize:11,fontWeight:700,color:'#34D399' }}>Active</span>
                    </div>
                    <button onClick={()=>setRemoveTarget(r)} style={{
                      padding:'5px 10px',borderRadius:8,fontSize:12,fontWeight:600,
                      background:'none',border:'1px solid var(--border-1)',
                      color:'var(--text-3)',cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center',
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.1)';e.currentTarget.style.color='#FCA5A5';e.currentTarget.style.borderColor='rgba(239,68,68,0.25)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='var(--text-3)';e.currentTarget.style.borderColor='var(--border-1)';}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Invite more CTA */}
              <button onClick={()=>document.querySelector('input[type=email]')?.focus()} style={{
                width:'100%',marginTop:4,padding:'11px',borderRadius:11,
                background:'transparent',border:'1px dashed rgba(245,158,11,0.25)',
                color:'var(--text-3)',cursor:'pointer',fontSize:13,fontWeight:600,
                transition:'all 0.2s',fontFamily:'DM Sans,sans-serif',
                display:'flex',alignItems:'center',justifyContent:'center',gap:6,
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(245,158,11,0.45)';e.currentTarget.style.color='#FCD34D';e.currentTarget.style.background='rgba(245,158,11,0.04)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(245,158,11,0.25)';e.currentTarget.style.color='var(--text-3)';e.currentTarget.style.background='transparent';}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Invite another recruiter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Remove dialog */}
      {removeTarget && <RemoveDialog recruiter={removeTarget} onConfirm={handleRemove} onClose={()=>setRemoveTarget(null)} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </OrgLayout>
  );
};

export default OrgDashboard;