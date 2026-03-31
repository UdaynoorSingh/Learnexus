import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiCheck, FiX, FiTrash2, FiPlus, FiFileText, FiUsers, FiBookOpen, FiAlertTriangle, FiStar } from 'react-icons/fi';

const AdminPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingNotes, setPendingNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create forms
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', semesterId: '' });
  const [topicForm, setTopicForm] = useState({ name: '', subjectId: '', parentTopicId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, allRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/notes/pending'),
        api.get('/admin/notes')
      ]);
      setStats(statsRes.data);
      setPendingNotes(pendingRes.data);
      setAllNotes(allRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (noteId, verified) => {
    try {
      await api.put(`/admin/notes/${noteId}/verify`, { verified });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.delete(`/admin/notes/${noteId}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/subjects', subjectForm);
      setSubjectForm({ name: '', semesterId: '' });
      setShowCreateSubject(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/topics', topicForm);
      setTopicForm({ name: '', subjectId: '', parentTopicId: '' });
      setShowCreateTopic(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading admin panel..." />;

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: pendingNotes.length },
    { id: 'all', label: 'All Notes', count: allNotes.length },
    { id: 'manage', label: 'Manage Content' },
  ];

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Admin Panel</h1>
        <p className="text-text-muted mt-1">Manage notes, content, and users</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Users', value: stats.totalUsers, icon: FiUsers, color: 'text-primary' },
            { label: 'Notes', value: stats.totalNotes, icon: FiFileText, color: 'text-accent' },
            { label: 'Topics', value: stats.totalTopics, icon: FiBookOpen, color: 'text-success' },
            { label: 'Pending', value: stats.pendingNotes, icon: FiAlertTriangle, color: 'text-warning' },
          ].map((s, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <s.icon size={20} className={s.color} />
              <div>
                <p className="text-xl font-bold text-text">{s.value}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text'}`}
          >
            {tab.label} {tab.count !== undefined && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingNotes.length === 0 ? (
            <div className="glass-card p-8 text-center text-text-muted">
              <FiCheck size={40} className="mx-auto mb-3 opacity-40" />
              <p>No notes pending review!</p>
            </div>
          ) : (
            pendingNotes.map(note => (
              <div key={note.id} className="glass-card p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-background border border-white/5 shrink-0 overflow-hidden">
                    <img
                      src={`http://localhost:5000${note.file_url}`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-text-muted"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text">Note #{note.id}</span>
                      <span className="text-xs text-text-muted">in {note.topic_name}</span>
                    </div>
                    <p className="text-xs text-text-muted">by {note.uploader_name} • Score: {note.quality_score}</p>
                    {note.summary && <p className="text-xs text-text-muted mt-1 line-clamp-2">{note.summary}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVerify(note.id, true)}
                      className="px-4 py-2 rounded-lg bg-success/20 text-success hover:bg-success/30 text-sm font-medium flex items-center gap-1 transition-all"
                    >
                      <FiCheck size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleVerify(note.id, false)}
                      className="px-4 py-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 text-sm font-medium flex items-center gap-1 transition-all"
                    >
                      <FiX size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="space-y-3">
          {allNotes.map(note => (
            <div key={note.id} className="glass-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text">#{note.id}</span>
                  <span className="text-xs text-text-muted">{note.topic_name}</span>
                  {note.is_verified ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success">Verified</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">Pending</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">by {note.uploader_name} • Score: {note.quality_score}</p>
              </div>
              <button onClick={() => handleDelete(note.id)} className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-all">
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Subject */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Create Subject</h3>
              <button onClick={() => setShowCreateSubject(!showCreateSubject)} className="text-primary text-sm">
                <FiPlus size={16} />
              </button>
            </div>
            {showCreateSubject && (
              <form onSubmit={handleCreateSubject} className="space-y-3">
                <input
                  type="text"
                  placeholder="Subject name"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-text text-sm focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="number"
                  placeholder="Semester ID"
                  value={subjectForm.semesterId}
                  onChange={(e) => setSubjectForm(prev => ({ ...prev, semesterId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-text text-sm focus:outline-none focus:border-primary"
                  required
                />
                <button type="submit" className="w-full btn-gradient py-2 text-sm">Create Subject</button>
              </form>
            )}
          </div>

          {/* Create Topic */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Create Topic</h3>
              <button onClick={() => setShowCreateTopic(!showCreateTopic)} className="text-primary text-sm">
                <FiPlus size={16} />
              </button>
            </div>
            {showCreateTopic && (
              <form onSubmit={handleCreateTopic} className="space-y-3">
                <input
                  type="text"
                  placeholder="Topic name"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-text text-sm focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="number"
                  placeholder="Subject ID"
                  value={topicForm.subjectId}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, subjectId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-text text-sm focus:outline-none focus:border-primary"
                  required
                />
                <input
                  type="number"
                  placeholder="Parent Topic ID (optional)"
                  value={topicForm.parentTopicId}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, parentTopicId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-text text-sm focus:outline-none focus:border-primary"
                />
                <button type="submit" className="w-full btn-gradient py-2 text-sm">Create Topic</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
