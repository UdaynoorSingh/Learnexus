import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiCheck, FiX, FiTrash2, FiPlus, FiFileText, FiUsers, FiBookOpen, FiAlertTriangle, FiChevronDown } from 'react-icons/fi';

const AdminPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingNotes, setPendingNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [degrees, setDegrees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [newDegree, setNewDegree] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newSemester, setNewSemester] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    fetchData();
    fetchDegrees();
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

  const fetchDegrees = async () => {
    try {
      const res = await api.get('/degrees');
      setDegrees(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (selectedDegree) {
      api.get(`/degrees/${selectedDegree}/branches`).then(res => setBranches(res.data));
      setSelectedBranch(''); setSelectedSemester(''); setSelectedSubject('');
    } else setBranches([]);
  }, [selectedDegree]);

  useEffect(() => {
    if (selectedBranch) {
      api.get(`/branches/${selectedBranch}/semesters`).then(res => setSemesters(res.data));
      setSelectedSemester(''); setSelectedSubject('');
    } else setSemesters([]);
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedSemester) {
      api.get(`/semesters/${selectedSemester}/subjects`).then(res => setSubjects(res.data));
      setSelectedSubject('');
    } else setSubjects([]);
  }, [selectedSemester]);

  useEffect(() => {
    if (selectedSubject) {
      api.get(`/subjects/${selectedSubject}/topics`).then(res => setTopics(res.data));
    } else setTopics([]);
  }, [selectedSubject]);

  const handleVerify = async (noteId, verified) => {
    try {
      await api.put(`/admin/notes/${noteId}/verify`, { verified });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.delete(`/admin/notes/${noteId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreateDegree = async (e) => {
    e.preventDefault();
    if (!newDegree) return;
    try {
      await api.post('/admin/degrees', { name: newDegree });
      setNewDegree('');
      fetchDegrees();
    } catch (err) { console.error(err); }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranch || !selectedDegree) return;
    try {
      await api.post('/admin/branches', { name: newBranch, degreeId: selectedDegree });
      setNewBranch('');
      api.get(`/degrees/${selectedDegree}/branches`).then(res => setBranches(res.data));
    } catch (err) { console.error(err); }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    if (!newSemester || !selectedBranch) return;
    try {
      await api.post('/admin/semesters', { number: parseInt(newSemester), branchId: selectedBranch });
      setNewSemester('');
      api.get(`/branches/${selectedBranch}/semesters`).then(res => setSemesters(res.data));
    } catch (err) { console.error(err); }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubject || !selectedSemester) return;
    try {
      await api.post('/admin/subjects', { name: newSubject, semesterId: selectedSemester });
      setNewSubject('');
      api.get(`/semesters/${selectedSemester}/subjects`).then(res => setSubjects(res.data));
    } catch (err) { console.error(err); }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopic || !selectedSubject) return;
    try {
      await api.post('/admin/topics', { name: newTopic, subjectId: selectedSubject });
      setNewTopic('');
      api.get(`/subjects/${selectedSubject}/topics`).then(res => setTopics(res.data));
    } catch (err) { console.error(err); }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading admin panel..." />;

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: pendingNotes.length },
    { id: 'all', label: 'All Notes', count: allNotes.length },
    { id: 'manage', label: 'Manage Content' },
  ];

  const SelectField = ({ label, value, onChange, options, labelKey = 'name', valueKey = 'id', placeholder }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-text-muted mb-2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl text-text appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt[valueKey]} value={opt[valueKey]}>
              {labelKey === 'number' ? `Semester ${opt[labelKey]}` : opt[labelKey]}
            </option>
          ))}
        </select>
        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={16} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div>
        <h1 className="text-2xl font-bold text-text">Admin Panel</h1>
        <p className="text-text-muted mt-1">Manage notes, content, and users</p>
      </div>

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
                      className="px-4 py-2 rounded-lg bg-success/20 text-success text-sm font-medium flex items-center gap-1 transition-all"
                    >
                      <FiCheck size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleVerify(note.id, false)}
                      className="px-4 py-2 rounded-lg bg-danger/20 text-danger text-sm font-medium flex items-center gap-1 transition-all"
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
                </div>
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
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-text mb-4">Degree</h3>
            <SelectField label="Select Degree to manage" value={selectedDegree} onChange={setSelectedDegree} options={degrees} placeholder="Select degree..." />
            <form onSubmit={handleCreateDegree} className="flex gap-2">
              <input type="text" placeholder="New Degree Name" value={newDegree} onChange={e => setNewDegree(e.target.value)} className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-text" />
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"><FiPlus size={16} /></button>
            </form>
          </div>

          <div className="glass-card p-6 opacity-100 transition-opacity" style={{ opacity: selectedDegree ? 1 : 0.4 }}>
            <h3 className="text-lg font-bold text-text mb-4">Branch</h3>
            <SelectField label="Select Branch" value={selectedBranch} onChange={setSelectedBranch} options={branches} placeholder="Select branch..." />
            <form onSubmit={handleCreateBranch} className="flex gap-2">
              <input type="text" placeholder="New Branch Name" value={newBranch} onChange={e => setNewBranch(e.target.value)} disabled={!selectedDegree} className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-text disabled:opacity-50" />
              <button type="submit" disabled={!selectedDegree} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /></button>
            </form>
          </div>

          <div className="glass-card p-6 transition-opacity" style={{ opacity: selectedBranch ? 1 : 0.4 }}>
            <h3 className="text-lg font-bold text-text mb-4">Semester</h3>
            <SelectField label="Select Semester" value={selectedSemester} onChange={setSelectedSemester} options={semesters} labelKey="number" placeholder="Select semester..." />
            <form onSubmit={handleCreateSemester} className="flex gap-2">
              <input type="number" placeholder="New Semester (Number)" value={newSemester} onChange={e => setNewSemester(e.target.value)} disabled={!selectedBranch} className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-text disabled:opacity-50" />
              <button type="submit" disabled={!selectedBranch} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /></button>
            </form>
          </div>

          <div className="glass-card p-6 transition-opacity" style={{ opacity: selectedSemester ? 1 : 0.4 }}>
            <h3 className="text-lg font-bold text-text mb-4">Subject</h3>
            <SelectField label="Select Subject" value={selectedSubject} onChange={setSelectedSubject} options={subjects} placeholder="Select subject..." />
            <form onSubmit={handleCreateSubject} className="flex gap-2">
              <input type="text" placeholder="New Subject Name" value={newSubject} onChange={e => setNewSubject(e.target.value)} disabled={!selectedSemester} className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-text disabled:opacity-50" />
              <button type="submit" disabled={!selectedSemester} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /></button>
            </form>
          </div>

          <div className="glass-card p-6 md:col-span-2 transition-opacity" style={{ opacity: selectedSubject ? 1 : 0.4 }}>
            <h3 className="text-lg font-bold text-text mb-4">Topics</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-muted mb-2">Current Topics in Subject</label>
              <div className="flex flex-wrap gap-2">
                {topics.length === 0 ? <span className="text-sm text-text-muted">No topics yet</span> :
                  topics.map(t => <span key={t.id} className="px-3 py-1 bg-surface-light rounded-full text-xs text-text">{t.name}</span>)
                }
              </div>
            </div>
            <form onSubmit={handleCreateTopic} className="flex gap-2 max-w-md">
              <input type="text" placeholder="New Topic Name" value={newTopic} onChange={e => setNewTopic(e.target.value)} disabled={!selectedSubject} className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-text disabled:opacity-50" />
              <button type="submit" disabled={!selectedSubject} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /> Add Topic</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
