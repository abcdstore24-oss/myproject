/**
 * AdminDashboard.jsx
 * Route: /admin/dashboard
 * Complete redesign — admin layout, stat cards, slide-over forms, rich user table.
 */

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../../context/AuthContext';
import { useTheme }            from '../../context/ThemeContext';
import * as userApi            from '../../api/userApi';

/* ─── Role config ────────────────────────────────────────── */
const roleConfig = {
  admin:     { color: '#EC4899', bg: 'rgba(236,72,153,0.12)',  border: 'rgba(236,72,153,0.28)', label: 'Admin'     },
  org_owner: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)', label: 'Org Owner' },
  recruiter: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.28)', label: 'Recruiter' },
  candidate: { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)', label: 'Candidate' },
};

/* ─── Helpers ────────────────────────────────────────────── */
function Avatar({ name, size = 34 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},50%,22%)`, border: `1px solid hsl(${hue},50%,32%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontSize: size * 0.35, fontWeight: 800,
      color: `hsl(${hue},65%,68%)`,
    }}>{initials}</div>
  );
}

function RoleBadge({ role }) {
  const c = roleConfig[role] || roleConfig.candidate;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
      {c.label}
    </span>
  );
}

function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
      background: 'var(--s3)', border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      boxShadow: 'var(--shadow-lg)',
      animation: 'toastSlide 0.35s var(--ease-spring)', maxWidth: 360,
    }}>
      <span style={{ fontSize: 13.5, color: 'var(--text-1)' }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', padding:2, fontSize:18, lineHeight:1 }}>×</button>
    </div>
  );
}

/* ─── Admin Layout ───────────────────────────────────────── */
function AdminLayout({ children, title, subtitle, actions }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
        width: W, minHeight: '100vh', flexShrink: 0,
        background: 'var(--s1)', borderRight: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s var(--ease-spring)', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh', zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 18px' : '0 20px',
          borderBottom: '1px solid var(--border-1)',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(135deg,#EC4899,#8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(236,72,153,0.35)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            {!collapsed && <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, color:'var(--text-1)', whiteSpace:'nowrap' }}>TalentProctor</span>}
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
            <div style={{ padding:'7px 12px', borderRadius:8, marginBottom:8, background:'rgba(236,72,153,0.08)', border:'1px solid rgba(236,72,153,0.15)', display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#EC4899' }} />
              <span style={{ fontSize:11, fontWeight:600, color:'#F9A8D4', letterSpacing:'0.06em', textTransform:'uppercase' }}>Admin Portal</span>
            </div>
          )}
          {[
            { icon:'🏠', label:'Dashboard', active:true },
          ].map(item => (
            <div key={item.label} style={{
              display:'flex', alignItems:'center', gap:10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '9px 12px', borderRadius:10,
              background:'rgba(236,72,153,0.1)', border:'1px solid rgba(236,72,153,0.2)',
              color:'#F9A8D4',
            }}>
              <span style={{ fontSize:16 }}>{item.icon}</span>
              {!collapsed && <span style={{ fontSize:13.5, fontWeight:600 }}>{item.label}</span>}
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border-1)' }}>
          {!collapsed && (
            <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--s2)', border:'1px solid var(--border-1)', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#EC4899,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', fontFamily:'Syne,sans-serif', flexShrink:0 }}>
                  {user?.full_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.full_name}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'#EC4899' }} />
                    System Admin
                  </div>
                </div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width:'100%', display:'flex', alignItems:'center', gap:collapsed?0:8, justifyContent:collapsed?'center':'flex-start', padding:collapsed?'10px 0':'9px 12px', borderRadius:10, cursor:'pointer', background:'none', border:'none', color:'var(--text-3)', fontSize:13.5, fontWeight:500, transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.08)'; e.currentTarget.style.color='#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-3)'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        {/* Topbar */}
        <header style={{
          height:60, display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 28px', background:'var(--topbar-bg)',
          borderBottom:'1px solid var(--border-1)',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          position:'sticky', top:0, zIndex:20, flexShrink:0,
        }}>
          <div>
            <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'var(--text-1)', letterSpacing:'-0.01em', lineHeight:1.2 }}>{title}</h1>
            {subtitle && <p style={{ fontSize:12, color:'var(--text-3)', marginTop:1 }}>{subtitle}</p>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {actions}
            {/* ── Theme Toggle — identical to RecruiterLayout / CandidateLayout ── */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="theme-toggle"
              style={{
                width: 34, height: 34, borderRadius: 9,
                border: '1px solid var(--border-2)',
                background: 'var(--s3)', color: 'var(--text-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </header>
        <main style={{ flex:1, padding:'28px', overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

/* ─── Slide-Over + shared form UI ────────────────────────── */
function SlideOver({ open, onClose, title, subtitle, children }) {
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',animation:'fadeIn 0.2s both' }} />
      <div style={{ position:'fixed',top:0,right:0,bottom:0,zIndex:201,width:'100%',maxWidth:460,background:'var(--s2)',borderLeft:'1px solid var(--border-1)',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-xl)',animation:'slideOverIn 0.35s var(--ease-spring)' }}>
        <style>{`@keyframes slideOverIn{from{transform:translateX(100%);opacity:.5}to{transform:translateX(0);opacity:1}}`}</style>
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border-1)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexShrink:0 }}>
          <div>
            <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-1)' }}>{title}</h2>
            {subtitle && <p style={{ fontSize:12,color:'var(--text-3)',marginTop:3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background:'var(--s3)',border:'1px solid var(--border-1)',borderRadius:8,padding:6,cursor:'pointer',color:'var(--text-2)',display:'flex',transition:'all 0.2s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--s4)';e.currentTarget.style.color='var(--text-1)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--s3)';e.currentTarget.style.color='var(--text-2)';}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }} className="custom-scrollbar">{children}</div>
      </div>
    </>
  );
}

function DeleteDialog({ user: u, onConfirm, onClose }) {
  if (!u) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)',animation:'fadeIn 0.2s both' }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:201,width:'calc(100% - 32px)',maxWidth:400,background:'var(--s2)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:18,padding:'24px',boxShadow:'var(--shadow-xl)',animation:'fadeUp 0.25s both' }}>
        <div style={{ width:44,height:44,borderRadius:12,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </div>
        <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-1)',marginBottom:8 }}>Delete User</h3>
        <p style={{ fontSize:13.5,color:'var(--text-2)',lineHeight:1.6,marginBottom:20 }}>
          Delete <strong style={{ color:'var(--text-1)' }}>{u.full_name}</strong>? All associated data will be permanently removed.
        </p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:'10px',borderRadius:10,background:'var(--s3)',border:'1px solid var(--border-2)',color:'var(--text-1)',fontWeight:600,fontSize:13.5,cursor:'pointer',fontFamily:'DM Sans,sans-serif' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1,padding:'10px',borderRadius:10,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#FCA5A5',fontWeight:700,fontSize:13.5,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.25)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.15)'}>Delete</button>
        </div>
      </div>
    </>
  );
}

function FInput({ label, type='text', value, onChange, placeholder, required, hint }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:'block',fontSize:11,fontWeight:600,color:'var(--text-3)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7 }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:'100%',padding:'10px 13px',borderRadius:10,background:'var(--s3)',border:`1px solid ${f?'var(--brand)':'var(--border-2)'}`,color:'var(--text-1)',fontSize:13.5,outline:'none',boxShadow:f?'0 0 0 3px rgba(99,102,241,0.12)':'none',transition:'all 0.2s',fontFamily:'DM Sans,sans-serif' }}
      />
      {hint && <p style={{ fontSize:11,color:'var(--text-3)',marginTop:5 }}>{hint}</p>}
    </div>
  );
}

function FSelect({ label, value, onChange, children }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:'block',fontSize:11,fontWeight:600,color:'var(--text-3)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7 }}>{label}</label>}
      <select value={value} onChange={onChange} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:'100%',padding:'10px 13px',borderRadius:10,background:'var(--s3)',border:`1px solid ${f?'var(--brand)':'var(--border-2)'}`,color:'var(--text-1)',fontSize:13.5,outline:'none',boxShadow:f?'0 0 0 3px rgba(99,102,241,0.12)':'none',transition:'all 0.2s',fontFamily:'DM Sans,sans-serif',WebkitAppearance:'none',cursor:'pointer' }}>
        {children}
      </select>
    </div>
  );
}

function SubmitBtn({ children, loading }) {
  return (
    <button type="submit" disabled={loading} style={{ width:'100%',padding:'13px',borderRadius:11,background:loading?'var(--s4)':'linear-gradient(135deg,#6366F1,#8B5CF6)',border:'none',cursor:loading?'not-allowed':'pointer',color:'white',fontWeight:700,fontSize:14,fontFamily:'DM Sans,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:loading?'none':'0 4px 20px rgba(99,102,241,0.35)',transition:'all 0.2s',marginTop:24 }}>
      {loading ? <><div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'white',animation:'spin 0.7s linear infinite' }} />Saving…</> : children}
    </button>
  );
}

/* ─── Stat card ──────────────────────────────────────────── */
function StatCard({ label, value, icon, color, topColor, sub }) {
  return (
    <div style={{ background:'var(--s2)',border:'1px solid var(--border-1)',borderRadius:16,padding:'20px 22px',borderTop:`2px solid ${topColor}` }}>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
        <div style={{ fontSize:11,fontWeight:600,color:'var(--text-3)',letterSpacing:'0.05em',textTransform:'uppercase' }}>{label}</div>
        <div style={{ width:32,height:32,borderRadius:9,background:`${topColor}18`,border:`1px solid ${topColor}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15 }}>{icon}</div>
      </div>
      <div style={{ fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color,lineHeight:1 }}>{value ?? 0}</div>
      {sub && <div style={{ fontSize:12,color:'var(--text-3)',marginTop:6 }}>{sub}</div>}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const AdminDashboard = () => {
  const [users, setUsers]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]   = useState(null);
  const notify = (msg, type='success') => setToast({ msg, type });

  const [search, setSearch]     = useState('');
  const [roleFilter, setFilter] = useState('all');
  const [saving, setSaving]     = useState(false);

  /* Panels */
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const emptyForm = { full_name:'', email:'', password:'', role:'candidate', phone:'' };
  const [form, setForm] = useState(emptyForm);
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, sRes] = await Promise.all([userApi.getAllUsers(), userApi.getUserStats()]);
      setUsers(uRes.data.users);
      setStats(sRes.data.stats);
    } catch { notify('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  const filtered = users.filter(u =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await userApi.createUser(form);
      notify('User created successfully!');
      setShowCreate(false); setForm(emptyForm); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to create user', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await userApi.updateUser(selectedUser.user_id, { full_name: form.full_name, phone: form.phone });
      notify('User updated!');
      setShowEdit(false); setSelectedUser(null); loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await userApi.deleteUser(deleteTarget.user_id);
      notify('User deleted');
      setDeleteTarget(null); loadData();
    } catch { notify('Failed to delete', 'error'); }
  };

  const handleToggle = async (userId) => {
    try { await userApi.toggleUserStatus(userId); notify('Status updated!'); loadData(); }
    catch { notify('Failed to update status', 'error'); }
  };

  const openEdit = (u) => {
    setSelectedUser(u);
    setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role, phone: u.phone || '' });
    setShowEdit(true);
  };

  if (loading) return (
    <AdminLayout title="Dashboard" subtitle="System Administration">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:300 }}>
        <div style={{ width:36,height:36,borderRadius:'50%',border:'3px solid var(--s5)',borderTopColor:'#EC4899',animation:'spin 0.9s linear infinite' }} />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle={`System overview · ${users.length} total users`}
      actions={
        <button onClick={() => { setForm(emptyForm); setShowCreate(true); }} style={{
          display:'inline-flex',alignItems:'center',gap:7,
          padding:'8px 18px',borderRadius:10,fontSize:13.5,fontWeight:600,
          background:'linear-gradient(135deg,#EC4899,#8B5CF6)',
          border:'none',color:'white',cursor:'pointer',
          boxShadow:'0 0 20px rgba(236,72,153,0.3)',
          fontFamily:'DM Sans,sans-serif',transition:'all 0.2s',
        }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 24px rgba(236,72,153,0.45)';}}
        onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 20px rgba(236,72,153,0.3)';}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      }
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastSlide{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        input,select{color:var(--text-1)!important;}
        input::placeholder{color:var(--text-3)!important;}
      `}</style>

      {/* ── Stat cards ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24 }}>
        <StatCard label="Total Users"  value={stats?.total}                 icon="👥" color="var(--text-1)" topColor="#6366F1" sub={`${stats?.active ?? 0} active`} />
        <StatCard label="Admins"       value={stats?.byRole?.admin}         icon="🛡️" color="#F9A8D4"       topColor="#EC4899" />
        <StatCard label="Org Owners"   value={stats?.byRole?.org_owner}     icon="🏢" color="#FCD34D"       topColor="#F59E0B" />
        <StatCard label="Recruiters"   value={stats?.byRole?.recruiter}     icon="🎯" color="#818CF8"       topColor="#6366F1" />
        <StatCard label="Candidates"   value={stats?.byRole?.candidate}     icon="🎓" color="#34D399"       topColor="#10B981" />
        <StatCard label="Inactive"     value={(stats?.total ?? 0) - (stats?.active ?? 0)} icon="🚫" color="#FCA5A5" topColor="#EF4444" />
      </div>

      {/* ── User management table ── */}
      <div style={{ background:'var(--s2)',border:'1px solid var(--border-1)',borderRadius:18,overflow:'hidden',boxShadow:'var(--shadow-md)' }}>
        {/* Toolbar */}
        <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border-1)',background:'var(--s1)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--text-1)',marginRight:4 }}>All Users</h2>

          {/* Search */}
          <div style={{ position:'relative',flex:1,maxWidth:280 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
              style={{ width:'100%',padding:'8px 12px 8px 32px',background:'var(--s3)',border:'1px solid var(--border-2)',borderRadius:9,color:'var(--text-1)',fontSize:13,outline:'none',fontFamily:'DM Sans,sans-serif' }} />
          </div>

          {/* Role filter */}
          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
            {['all','admin','org_owner','recruiter','candidate'].map(r => {
              const labels = { all:'All', admin:'Admins', org_owner:'Org Owners', recruiter:'Recruiters', candidate:'Candidates' };
              const active = roleFilter === r;
              const c = roleConfig[r];
              return (
                <button key={r} onClick={()=>setFilter(r)} style={{
                  padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                  background: active ? (c ? c.bg : 'var(--s4)') : 'var(--s3)',
                  border: `1px solid ${active ? (c ? c.border : 'var(--border-2)') : 'var(--border-1)'}`,
                  color: active ? (c ? c.color : 'var(--text-1)') : 'var(--text-3)',
                  transition:'all 0.2s',
                }}>
                  {labels[r]}
                </button>
              );
            })}
          </div>

          <span style={{ fontSize:12,color:'var(--text-3)',marginLeft:'auto' }}>{filtered.length} user{filtered.length!==1?'s':''}</span>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'separate',borderSpacing:0 }}>
            <thead>
              <tr>
                {['User','Role','Status','Phone','Joined','Actions'].map((h,i)=>(
                  <th key={i} style={{ padding:'11px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'var(--text-3)',letterSpacing:'0.07em',textTransform:'uppercase',borderBottom:'1px solid var(--border-1)',background:'var(--s1)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'48px 24px',textAlign:'center' }}>
                  <div style={{ fontSize:28,marginBottom:12 }}>👥</div>
                  <p style={{ fontSize:14,color:'var(--text-2)' }}>No users found</p>
                </td></tr>
              ) : filtered.map(u => (
                <tr key={u.user_id} style={{ transition:'background 0.15s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--s2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

                  {/* User */}
                  <td style={{ padding:'13px 16px',borderBottom:'1px solid var(--border-1)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <Avatar name={u.full_name} />
                      <div>
                        <div style={{ fontSize:13.5,fontWeight:600,color:'var(--text-1)' }}>{u.full_name}</div>
                        <div style={{ fontSize:11.5,color:'var(--text-3)',marginTop:1 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding:'13px 16px',borderBottom:'1px solid var(--border-1)' }}>
                    <RoleBadge role={u.role} />
                  </td>

                  {/* Status */}
                  <td style={{ padding:'13px 16px',borderBottom:'1px solid var(--border-1)' }}>
                    <span style={{
                      display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,
                      background:u.is_active?'rgba(16,185,129,0.1)':'rgba(107,114,128,0.1)',
                      border:`1px solid ${u.is_active?'rgba(16,185,129,0.25)':'rgba(107,114,128,0.2)'}`,
                      fontSize:11,fontWeight:700,color:u.is_active?'#34D399':'#9CA3AF',
                    }}>
                      {u.is_active && <span style={{ width:5,height:5,borderRadius:'50%',background:'#10B981',display:'inline-block' }} />}
                      {u.is_active?'Active':'Inactive'}
                    </span>
                  </td>

                  {/* Phone */}
                  <td style={{ padding:'13px 16px',borderBottom:'1px solid var(--border-1)',fontSize:13,color:'var(--text-3)' }}>
                    {u.phone || '—'}
                  </td>

                  {/* Joined */}
                  <td style={{ padding:'13px 16px',borderBottom:'1px solid var(--border-1)',fontSize:12,color:'var(--text-3)',whiteSpace:'nowrap' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'13px 16px',borderBottom:'1px solid var(--border-1)' }}>
                    <div style={{ display:'flex',gap:6 }}>
                      {/* Edit */}
                      <button onClick={()=>openEdit(u)} style={{ padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,background:'var(--s3)',border:'1px solid var(--border-2)',color:'var(--text-2)',cursor:'pointer',transition:'all 0.15s' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='rgba(99,102,241,0.12)';e.currentTarget.style.color='#818CF8';e.currentTarget.style.borderColor='rgba(99,102,241,0.25)';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='var(--s3)';e.currentTarget.style.color='var(--text-2)';e.currentTarget.style.borderColor='var(--border-2)';}}>
                        Edit
                      </button>
                      {/* Toggle */}
                      <button onClick={()=>handleToggle(u.user_id)} style={{ padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',background:u.is_active?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)',border:`1px solid ${u.is_active?'rgba(245,158,11,0.25)':'rgba(16,185,129,0.25)'}`,color:u.is_active?'#FCD34D':'#34D399' }}
                        onMouseEnter={e=>{e.currentTarget.style.opacity='0.8';}}
                        onMouseLeave={e=>{e.currentTarget.style.opacity='1';}}>
                        {u.is_active?'Deactivate':'Activate'}
                      </button>
                      {/* Delete */}
                      {u.role !== 'admin' && (
                        <button onClick={()=>setDeleteTarget(u)} style={{ padding:'5px 10px',borderRadius:8,fontSize:12,fontWeight:600,background:'none',border:'1px solid var(--border-1)',color:'var(--text-3)',cursor:'pointer',transition:'all 0.15s',display:'flex',alignItems:'center' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.1)';e.currentTarget.style.color='#FCA5A5';e.currentTarget.style.borderColor='rgba(239,68,68,0.25)';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='var(--text-3)';e.currentTarget.style.borderColor='var(--border-1)';}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ padding:'12px 20px',borderTop:'1px solid var(--border-1)',background:'var(--s1)',fontSize:12,color:'var(--text-3)' }}>
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {/* ── Create user slide-over ── */}
      <SlideOver open={showCreate} onClose={()=>{setShowCreate(false);setForm(emptyForm);}} title="Add New User" subtitle="Create a user account directly">
        <form onSubmit={handleCreate}>
          <FInput label="Full Name"  value={form.full_name} onChange={e=>setF('full_name',e.target.value)} placeholder="e.g. Alice Johnson"  required />
          <FInput label="Email"      value={form.email}     onChange={e=>setF('email',e.target.value)}     placeholder="alice@company.com" type="email" required />
          <FInput label="Password"   value={form.password}  onChange={e=>setF('password',e.target.value)}  placeholder="Min 8 characters"   type="password" required />
          <FInput label="Phone"      value={form.phone}     onChange={e=>setF('phone',e.target.value)}     placeholder="+91 9876543210" />
          <FSelect label="Role" value={form.role} onChange={e=>setF('role',e.target.value)}>
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
            <option value="org_owner">Org Owner</option>
            <option value="admin">Admin</option>
          </FSelect>
          <div style={{ padding:'12px 14px',borderRadius:10,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',fontSize:12,color:'#A5B4FC',marginBottom:4 }}>
            💡 For recruiters, use the Org Owner's invite system instead — it auto-links them to an organization.
          </div>
          <SubmitBtn loading={saving}>Create User</SubmitBtn>
        </form>
      </SlideOver>

      {/* ── Edit user slide-over ── */}
      <SlideOver open={showEdit} onClose={()=>{setShowEdit(false);setSelectedUser(null);}} title="Edit User" subtitle={selectedUser?.email}>
        <form onSubmit={handleEdit}>
          <div style={{ display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,background:'var(--s3)',border:'1px solid var(--border-1)',marginBottom:20 }}>
            <Avatar name={selectedUser?.full_name} size={40} />
            <div>
              <div style={{ fontSize:14,fontWeight:600,color:'var(--text-1)' }}>{selectedUser?.full_name}</div>
              <RoleBadge role={selectedUser?.role} />
            </div>
          </div>
          <FInput label="Full Name" value={form.full_name} onChange={e=>setF('full_name',e.target.value)} required />
          <FInput label="Phone"     value={form.phone}     onChange={e=>setF('phone',e.target.value)} placeholder="+91 9876543210" />
          <div style={{ padding:'12px 14px',borderRadius:10,background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',fontSize:12,color:'#FCD34D' }}>
            ⚠️ Email and role cannot be changed here. Use the database for sensitive changes.
          </div>
          <SubmitBtn loading={saving}>Save Changes</SubmitBtn>
        </form>
      </SlideOver>

      {/* Delete dialog */}
      {deleteTarget && <DeleteDialog user={deleteTarget} onConfirm={handleDelete} onClose={()=>setDeleteTarget(null)} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </AdminLayout>
  );
};

export default AdminDashboard;