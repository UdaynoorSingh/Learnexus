import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiCheck, FiX, FiTrash2, FiPlus, FiFileText, FiUsers, FiBookOpen, FiAlertTriangle, FiChevronDown, FiMail, FiEdit2, FiExternalLink } from 'react-icons/fi';
import NoteViewerModal from '../components/common/NoteViewerModal';

function normalizeEmailDomainSuffix(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('@')) {
    const parts = s.split('@');
    s = (parts[parts.length - 1] || '').trim();
  }
  return s.replace(/^\.+/, '').trim();
}

const AdminPage = () => {
  const { user } = useAuth();
  const [adminCollegeId, setAdminCollegeId] = useState('');
  const [adminColleges, setAdminColleges] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingNotes, setPendingNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingNoteUrl, setViewingNoteUrl] = useState(null);

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

  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeDomain, setNewCollegeDomain] = useState('');
  const [collegeBanner, setCollegeBanner] = useState(null);
  const [editingCollegeId, setEditingCollegeId] = useState(null);
  const [editCollegeName, setEditCollegeName] = useState('');
  const [editCollegeDomain, setEditCollegeDomain] = useState('');

  const [newChallengeCompany, setNewChallengeCompany] = useState('');
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDesc, setNewChallengeDesc] = useState('');
  const [newChallengeDiff, setNewChallengeDiff] = useState('Medium');
  const [newChallengeCredits, setNewChallengeCredits] = useState('5');
  const [newChallengeTags, setNewChallengeTags] = useState('');
  const [challengesList, setChallengesList] = useState([]);
  const [editingChallengeId, setEditingChallengeId] = useState(null);

  const catalogParams = useMemo(() => {
    if (user?.role === 'superadmin' && adminCollegeId) {
      return { collegeId: String(adminCollegeId) };
    }
    if (user?.role === 'admin' && user.college_id != null && user.college_id !== '') {
      return { collegeId: String(user.college_id) };
    }
    return {};
  }, [user?.role, user?.college_id, adminCollegeId]);

  const selectedCatalogCollege = useMemo(() => {
    const id =
      user?.role === 'superadmin' ? Number(adminCollegeId) : Number(user?.college_id);
    if (!id || Number.isNaN(id)) return null;
    return adminColleges.find((c) => Number(c.id) === id) || null;
  }, [user?.role, user?.college_id, adminCollegeId, adminColleges]);

  const catalogReady =
    user?.role === 'superadmin'
      ? Boolean(adminCollegeId)
      : Boolean(user?.college_id != null && user?.college_id !== '');

  const reloadAdminColleges = async () => {
    const r = await api.get('/admin/colleges');
    const list = r.data || [];
    setAdminColleges(list);
    return list;
  };

  useEffect(() => {
    if (!user) return;
    if (user.role === 'superadmin') {
      reloadAdminColleges()
        .then((list) => {
          setAdminCollegeId((prev) => {
            if (prev) return prev;
            const demo = list.find((c) => c.domain_suffix === 'demo.edu');
            return String((demo || list[0])?.id ?? '');
          });
        })
        .catch((e) => console.error(e));
    } else if (user.role === 'admin') {
      reloadAdminColleges().catch((e) => console.error(e));
      setAdminCollegeId(String(user.college_id ?? ''));
    } else {
      setAdminCollegeId(String(user.college_id ?? ''));
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, allRes, chalRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/notes/pending'),
        api.get('/admin/notes'),
        api.get('/challenges')
      ]);
      setStats(statsRes.data);
      setPendingNotes(pendingRes.data);
      setAllNotes(allRes.data);
      setChallengesList(chalRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDegrees = useCallback(async () => {
    try {
      const res = await api.get('/degrees', { params: catalogParams });
      setDegrees(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [catalogParams]);

  useEffect(() => {
    if (!catalogReady) return;
    fetchDegrees();
  }, [catalogReady, fetchDegrees]);

  useEffect(() => {
    if (selectedDegree) {
      api
        .get(`/degrees/${selectedDegree}/branches`, { params: catalogParams })
        .then((res) => setBranches(res.data));
      setSelectedBranch('');
      setSelectedSemester('');
      setSelectedSubject('');
    } else setBranches([]);
  }, [selectedDegree, catalogParams]);

  useEffect(() => {
    if (selectedBranch) {
      api
        .get(`/branches/${selectedBranch}/semesters`, { params: catalogParams })
        .then((res) => setSemesters(res.data));
      setSelectedSemester('');
      setSelectedSubject('');
    } else setSemesters([]);
  }, [selectedBranch, catalogParams]);

  useEffect(() => {
    if (selectedSemester) {
      api
        .get(`/semesters/${selectedSemester}/subjects`, { params: catalogParams })
        .then((res) => setSubjects(res.data));
      setSelectedSubject('');
    } else setSubjects([]);
  }, [selectedSemester, catalogParams]);

  useEffect(() => {
    if (selectedSubject) {
      api
        .get(`/subjects/${selectedSubject}/topics`, { params: catalogParams })
        .then((res) => setTopics(res.data));
    } else setTopics([]);
  }, [selectedSubject, catalogParams]);

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

  const superCollegeBody = () => {
    if (user?.role === 'superadmin' && adminCollegeId) {
      return { collegeId: Number(adminCollegeId) };
    }
    if (user?.role === 'admin' && user?.college_id != null && user?.college_id !== '') {
      return { collegeId: Number(user.college_id) };
    }
    return {};
  };

  const handleCreateDegree = async (e) => {
    e.preventDefault();
    if (!newDegree) return;
    try {
      await api.post('/admin/degrees', { name: newDegree, ...superCollegeBody() });
      setNewDegree('');
      fetchDegrees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranch || !selectedDegree) return;
    try {
      await api.post('/admin/branches', {
        name: newBranch,
        degreeId: selectedDegree,
        ...superCollegeBody()
      });
      setNewBranch('');
      api
        .get(`/degrees/${selectedDegree}/branches`, { params: catalogParams })
        .then((res) => setBranches(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    if (!newSemester || !selectedBranch) return;
    try {
      await api.post('/admin/semesters', {
        number: parseInt(newSemester, 10),
        branchId: selectedBranch,
        ...superCollegeBody()
      });
      setNewSemester('');
      api
        .get(`/branches/${selectedBranch}/semesters`, { params: catalogParams })
        .then((res) => setSemesters(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubject || !selectedSemester) return;
    try {
      await api.post('/admin/subjects', {
        name: newSubject,
        semesterId: selectedSemester,
        ...superCollegeBody()
      });
      setNewSubject('');
      api
        .get(`/semesters/${selectedSemester}/subjects`, { params: catalogParams })
        .then((res) => setSubjects(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopic || !selectedSubject) return;
    try {
      await api.post('/admin/topics', {
        name: newTopic,
        subjectId: selectedSubject,
        ...superCollegeBody()
      });
      setNewTopic('');
      api
        .get(`/subjects/${selectedSubject}/topics`, { params: catalogParams })
        .then((res) => setTopics(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCollege = async (e) => {
    e.preventDefault();
    setCollegeBanner(null);
    const domain = normalizeEmailDomainSuffix(newCollegeDomain);
    const name = newCollegeName.trim();
    if (!name || !domain) {
      setCollegeBanner({ kind: 'error', text: 'Enter a college name and an email domain (e.g. university.edu).' });
      return;
    }
    try {
      const { data } = await api.post('/admin/colleges', { name, domain_suffix: domain });
      setNewCollegeName('');
      setNewCollegeDomain('');
      await reloadAdminColleges();
      setAdminCollegeId(String(data.id));
      setCollegeBanner({
        kind: 'success',
        text: `College "${data.name}" added. OTP sign-in matches addresses ending in @${data.domain_suffix} (including subdomains).`
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not add college.';
      setCollegeBanner({ kind: 'error', text: msg });
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!newChallengeCompany || !newChallengeTitle || !newChallengeDesc) return;
    try {
      const tagsArray = newChallengeTags.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        company_name: newChallengeCompany,
        title: newChallengeTitle,
        description: newChallengeDesc,
        difficulty: newChallengeDiff,
        bounty_credits: parseInt(newChallengeCredits, 10),
        tags: tagsArray
      };

      if (editingChallengeId) {
        await api.put(`/admin/challenges/${editingChallengeId}`, payload);
        alert('Challenge updated successfully!');
      } else {
        await api.post('/admin/challenges', payload);
        alert('Challenge posted successfully!');
      }

      setEditingChallengeId(null);
      setNewChallengeCompany('');
      setNewChallengeTitle('');
      setNewChallengeDesc('');
      setNewChallengeDiff('Medium');
      setNewChallengeCredits('5');
      setNewChallengeTags('');

      const refresh = await api.get('/challenges');
      setChallengesList(refresh.data);
    } catch (err) {
      console.error(err);
      alert('Failed to save challenge');
    }
  };

  const startEditChallenge = (c) => {
    setEditingChallengeId(c.id);
    setNewChallengeCompany(c.company_name);
    setNewChallengeTitle(c.title);
    setNewChallengeDesc(c.description);
    setNewChallengeDiff(c.difficulty || 'Medium');
    setNewChallengeCredits(c.bounty_credits?.toString() || '5');

    let tagsStr = '';
    if (Array.isArray(c.tags)) {
      tagsStr = c.tags.join(', ');
    } else if (typeof c.tags === 'string') {
      try {
        const parsed = JSON.parse(c.tags);
        if (Array.isArray(parsed)) tagsStr = parsed.join(', ');
      } catch {
        tagsStr = c.tags;
      }
    }
    setNewChallengeTags(tagsStr);
  };

  const cancelEditChallenge = () => {
    setEditingChallengeId(null);
    setNewChallengeCompany('');
    setNewChallengeTitle('');
    setNewChallengeDesc('');
    setNewChallengeDiff('Medium');
    setNewChallengeCredits('5');
    setNewChallengeTags('');
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await api.delete(`/admin/challenges/${id}`);
      setChallengesList((prev) => prev.filter((c) => c.id !== id));
      alert('Challenge deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete challenge');
    }
  };

  const startEditCollege = (c) => {
    setEditingCollegeId(c.id);
    setEditCollegeName(c.name);
    setEditCollegeDomain(c.domain_suffix);
    setCollegeBanner(null);
  };

  const cancelEditCollege = () => {
    setEditingCollegeId(null);
    setEditCollegeName('');
    setEditCollegeDomain('');
  };

  const handleSaveCollege = async (e) => {
    e.preventDefault();
    const domain = normalizeEmailDomainSuffix(editCollegeDomain);
    const name = editCollegeName.trim();
    if (!editingCollegeId || !name || !domain) {
      setCollegeBanner({ kind: 'error', text: 'Name and email domain are required.' });
      return;
    }
    try {
      const { data } = await api.put(`/admin/colleges/${editingCollegeId}`, {
        name,
        domain_suffix: domain
      });
      cancelEditCollege();
      await reloadAdminColleges();
      setCollegeBanner({ kind: 'success', text: `Updated "${data.name}" (${data.domain_suffix}).` });
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not update college.';
      setCollegeBanner({ kind: 'error', text: msg });
    }
  };

  const handleDeleteCollege = async (c) => {
    if (!confirm(`Delete college "${c.name}"? This only works if no users or catalog rows reference it.`)) return;
    setCollegeBanner(null);
    try {
      await api.delete(`/admin/colleges/${c.id}`);
      if (String(c.id) === adminCollegeId) {
        const list = await reloadAdminColleges();
        const demo = list.find((x) => x.domain_suffix === 'demo.edu');
        setAdminCollegeId(String((demo || list[0])?.id ?? ''));
      } else {
        await reloadAdminColleges();
      }
      setCollegeBanner({ kind: 'success', text: 'College removed.' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not delete college.';
      setCollegeBanner({ kind: 'error', text: msg });
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading admin panel..." />;

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: pendingNotes.length },
    { id: 'all', label: 'All Notes', count: allNotes.length },
    ...(user?.role === 'superadmin' ? [{ id: 'colleges', label: 'Colleges & domains' }] : []),
    { id: 'manage', label: 'Manage Content' },
    { id: 'challenges', label: 'Post Challenges' }
  ];

  const SelectField = ({ label, value, onChange, options, labelKey = 'name', valueKey = 'id', placeholder }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-text-muted mb-2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
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

      <div className="flex gap-1 bg-white/70 border border-black/10 rounded-xl p-1">
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
                      src={note.file_url.startsWith('http') ? note.file_url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${note.file_url}`}
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
                      type="button"
                      onClick={() => setViewingNoteUrl(note.file_url)}
                      className="px-3 py-2 rounded-lg bg-white/70 border border-black/10 text-text-muted hover:text-text hover:bg-white/90 text-sm font-medium flex items-center gap-1 transition-all"
                      title="View Note Securely"
                    >
                      <FiExternalLink size={14} /> View
                    </button>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingNoteUrl(note.file_url)}
                  className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-all"
                  title="View Note Securely"
                >
                  <FiExternalLink size={16} />
                </button>
                <button onClick={() => handleDelete(note.id)} className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-all">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'colleges' && user?.role === 'superadmin' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-start gap-3 mb-4">
              <FiMail className="text-primary shrink-0 mt-0.5" size={22} />
              <div>
                <h3 className="text-lg font-bold text-text">Colleges and email domains</h3>
                <p className="text-sm text-text-muted mt-1">
                  Each row ties a display name to an email domain suffix. Students request OTP with an address like{' '}
                  <code className="text-xs bg-background px-1.5 py-0.5 rounded">name@univ.edu</code>
                  {' '}or{' '}
                  <code className="text-xs bg-background px-1.5 py-0.5 rounded">name@cs.univ.edu</code>
                  {' '}when the suffix is <code className="text-xs bg-background px-1.5 py-0.5 rounded">univ.edu</code>.
                </p>
              </div>
            </div>
            {collegeBanner && (
              <div
                className={`mb-4 px-4 py-3 rounded-xl text-sm ${collegeBanner.kind === 'error'
                  ? 'bg-danger/15 text-danger border border-danger/25'
                  : 'bg-success/15 text-success border border-success/25'
                  }`}
              >
                {collegeBanner.text}
              </div>
            )}
            <form onSubmit={handleCreateCollege} className="flex flex-col sm:flex-row flex-wrap gap-3 items-end border-t border-black/10 pt-6">
              <div className="flex-1 min-w-[10rem] w-full sm:w-auto">
                <label className="block text-xs font-medium text-text-muted mb-1.5">College name</label>
                <input
                  type="text"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  placeholder="e.g. State University"
                  className="w-full px-3 py-2.5 bg-white/80 border border-black/10 rounded-lg text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <div className="flex-1 min-w-[10rem] w-full sm:w-auto">
                <label className="block text-xs font-medium text-text-muted mb-1.5">Email domain suffix</label>
                <input
                  type="text"
                  value={newCollegeDomain}
                  onChange={(e) => setNewCollegeDomain(e.target.value)}
                  placeholder="univ.edu (no @)"
                  className="w-full px-3 py-2.5 bg-white/80 border border-black/10 rounded-lg text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <FiPlus size={16} /> Add college
              </button>
            </form>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-black/10">
              <h4 className="text-sm font-semibold text-text">Registered colleges</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-text-muted border-b border-black/10">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email domain</th>
                    <th className="px-6 py-3 font-medium w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminColleges.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                        No colleges loaded.
                      </td>
                    </tr>
                  ) : (
                    adminColleges.map((c) => (
                      <tr key={c.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                        {editingCollegeId === c.id ? (
                          <>
                            <td className="px-6 py-3 align-top">
                              <input
                                value={editCollegeName}
                                onChange={(e) => setEditCollegeName(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white/80 border border-black/10 rounded-lg text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                              />
                            </td>
                            <td className="px-6 py-3 align-top">
                              <input
                                value={editCollegeDomain}
                                onChange={(e) => setEditCollegeDomain(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white/80 border border-black/10 rounded-lg text-text font-mono text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                              />
                            </td>
                            <td className="px-6 py-3 align-top">
                              <form onSubmit={handleSaveCollege} className="flex flex-col gap-2">
                                <button type="submit" className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium">
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditCollege}
                                  className="px-3 py-1.5 rounded-lg bg-white/70 border border-black/10 text-text text-xs hover:bg-white/90"
                                >
                                  Cancel
                                </button>
                              </form>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 text-text font-medium">{c.name}</td>
                            <td className="px-6 py-3 text-text-muted font-mono text-xs">{c.domain_suffix}</td>
                            <td className="px-6 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditCollege(c)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/70 border border-black/10 text-text text-xs font-medium hover:bg-white/90"
                                >
                                  <FiEdit2 size={12} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCollege(c)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-danger text-xs font-medium hover:bg-danger/10"
                                >
                                  <FiTrash2 size={12} /> Delete
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="space-y-6">
          {user?.role === 'superadmin' && (
            <div className="glass-card p-5 space-y-3">
              <div>
                <h3 className="text-base font-bold text-text">Institution for this catalog</h3>
                <p className="text-sm text-text-muted mt-1 max-w-3xl leading-relaxed">
                  Choose one of the colleges you registered under <strong>Colleges &amp; domains</strong>. All
                  degrees, branches, semesters, subjects, and topics you add here are stored for that institution
                  only. Students see this tree in <strong>Explorer</strong> when their account is tied to the same
                  college (matched by email domain at sign-in).
                </p>
              </div>
              {adminColleges.length === 0 ? (
                <p className="text-sm text-warning font-medium">
                  No colleges yet — add one under the &quot;Colleges &amp; domains&quot; tab first, then return here
                  to build the catalog.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                  <label htmlFor="admin-catalog-college" className="text-sm font-medium text-text-muted shrink-0">
                    College
                  </label>
                  <select
                    id="admin-catalog-college"
                    value={adminCollegeId}
                    onChange={(e) => {
                      setAdminCollegeId(e.target.value);
                      setSelectedDegree('');
                      setSelectedBranch('');
                      setSelectedSemester('');
                      setSelectedSubject('');
                    }}
                    className="sm:min-w-[18rem] flex-1 max-w-xl px-4 py-2.5 bg-white/80 border border-black/10 rounded-xl text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    {adminColleges.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name} ({c.domain_suffix})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {user?.role === 'admin' && (
            <div className="glass-card p-5">
              <h3 className="text-base font-bold text-text">Your institution</h3>
              <p className="text-sm text-text-muted mt-1 max-w-3xl leading-relaxed">
                Catalog changes apply to <strong>{selectedCatalogCollege?.name || user?.college_name || 'your college'}</strong>
                {selectedCatalogCollege?.domain_suffix ? (
                  <>
                    {' '}
                    (<span className="font-mono text-xs">{selectedCatalogCollege.domain_suffix}</span>). Students at
                    that domain see this structure in Explorer.
                  </>
                ) : (
                  <> — students with accounts for your college see this catalog in Explorer.</>
                )}
              </p>
              {!catalogReady && (
                <p className="mt-3 text-sm text-danger font-medium">
                  Your admin account is not linked to a college. Ask a superadmin to assign your user to an
                  institution.
                </p>
              )}
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!catalogReady ? 'pointer-events-none opacity-45' : ''}`}>
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-text mb-4">Degree</h3>
              <SelectField label="Select Degree to manage" value={selectedDegree} onChange={setSelectedDegree} options={degrees} placeholder="Select degree..." />
              <form onSubmit={handleCreateDegree} className="flex gap-2">
                <input type="text" placeholder="New Degree Name" value={newDegree} onChange={e => setNewDegree(e.target.value)} className="flex-1 px-3 py-2 bg-white/80 border border-black/10 rounded-lg text-sm text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"><FiPlus size={16} /></button>
              </form>
            </div>

            <div className="glass-card p-6 opacity-100 transition-opacity" style={{ opacity: selectedDegree ? 1 : 0.4 }}>
              <h3 className="text-lg font-bold text-text mb-4">Branch</h3>
              <SelectField label="Select Branch" value={selectedBranch} onChange={setSelectedBranch} options={branches} placeholder="Select branch..." />
              <form onSubmit={handleCreateBranch} className="flex gap-2">
                <input type="text" placeholder="New Branch Name" value={newBranch} onChange={e => setNewBranch(e.target.value)} disabled={!selectedDegree} className="flex-1 px-3 py-2 bg-white/80 border border-black/10 rounded-lg text-sm text-text disabled:opacity-50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="submit" disabled={!selectedDegree} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /></button>
              </form>
            </div>

            <div className="glass-card p-6 transition-opacity" style={{ opacity: selectedBranch ? 1 : 0.4 }}>
              <h3 className="text-lg font-bold text-text mb-4">Semester</h3>
              <SelectField label="Select Semester" value={selectedSemester} onChange={setSelectedSemester} options={semesters} labelKey="number" placeholder="Select semester..." />
              <form onSubmit={handleCreateSemester} className="flex gap-2">
                <input type="number" placeholder="New Semester (Number)" value={newSemester} onChange={e => setNewSemester(e.target.value)} disabled={!selectedBranch} className="flex-1 px-3 py-2 bg-white/80 border border-black/10 rounded-lg text-sm text-text disabled:opacity-50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="submit" disabled={!selectedBranch} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /></button>
              </form>
            </div>

            <div className="glass-card p-6 transition-opacity" style={{ opacity: selectedSemester ? 1 : 0.4 }}>
              <h3 className="text-lg font-bold text-text mb-4">Subject</h3>
              <SelectField label="Select Subject" value={selectedSubject} onChange={setSelectedSubject} options={subjects} placeholder="Select subject..." />
              <form onSubmit={handleCreateSubject} className="flex gap-2">
                <input type="text" placeholder="New Subject Name" value={newSubject} onChange={e => setNewSubject(e.target.value)} disabled={!selectedSemester} className="flex-1 px-3 py-2 bg-white/80 border border-black/10 rounded-lg text-sm text-text disabled:opacity-50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="submit" disabled={!selectedSemester} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /></button>
              </form>
            </div>

            <div className="glass-card p-6 md:col-span-2 transition-opacity" style={{ opacity: selectedSubject ? 1 : 0.4 }}>
              <h3 className="text-lg font-bold text-text mb-4">Topics</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-muted mb-2">Current Topics in Subject</label>
                <div className="flex flex-wrap gap-2">
                  {topics.length === 0 ? <span className="text-sm text-text-muted">No topics yet</span> :
                    topics.map(t => <span key={t.id} className="px-3 py-1 bg-white/70 border border-black/10 rounded-full text-xs text-text">{t.name}</span>)
                  }
                </div>
              </div>
              <form onSubmit={handleCreateTopic} className="flex gap-2 max-w-md">
                <input type="text" placeholder="New Topic Name" value={newTopic} onChange={e => setNewTopic(e.target.value)} disabled={!selectedSubject} className="flex-1 px-3 py-2 bg-white/80 border border-black/10 rounded-lg text-sm text-text disabled:opacity-50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <button type="submit" disabled={!selectedSubject} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><FiPlus size={16} /> Add Topic</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-text mb-4">Post a new Company Challenge</h3>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Company Name</label>
                  <input type="text" value={newChallengeCompany} onChange={e => setNewChallengeCompany(e.target.value)} placeholder="e.g. Google, Vercel" className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Bounty Credits</label>
                  <input type="number" value={newChallengeCredits} onChange={e => setNewChallengeCredits(e.target.value)} placeholder="5" className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" required min="1" max="1000" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-muted mb-2">Challenge Title</label>
                  <input type="text" value={newChallengeTitle} onChange={e => setNewChallengeTitle(e.target.value)} placeholder="e.g. Optimize React rendering performance" className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-muted mb-2">Description</label>
                  <textarea value={newChallengeDesc} onChange={e => setNewChallengeDesc(e.target.value)} placeholder="Provide full details, constraints, and instructions..." rows={4} className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resizenone" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Difficulty</label>
                  <select value={newChallengeDiff} onChange={e => setNewChallengeDiff(e.target.value)} className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Tags (comma separated)</label>
                  <input type="text" value={newChallengeTags} onChange={e => setNewChallengeTags(e.target.value)} placeholder="e.g. React, Performance, Typescript" className="w-full px-4 py-3 bg-white/80 border border-black/10 rounded-xl text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
                </div>
              </div>
              <div className="flex gap-2.5 mt-2">
                <button type="submit" className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                  <FiPlus size={16} /> {editingChallengeId ? 'Update Challenge' : 'Publish Challenge'}
                </button>
                {editingChallengeId && (
                  <button type="button" onClick={cancelEditChallenge} className="px-6 py-3 bg-white/70 border border-black/10 text-text rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors">
                    <FiX size={16} /> Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-text mb-4">Active Challenges</h3>
            <div className="space-y-4">
              {challengesList.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">No challenges posted yet.</p>
              ) : (
                challengesList.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-black/10 bg-white/70 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-primary/30 transition-colors">
                    <div className="max-w-2xl">
                      <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">{c.company_name} • {c.difficulty} • {c.bounty_credits} Credits</p>
                      <h4 className="text-base font-bold text-text mb-1">{c.title}</h4>
                      <p className="text-sm text-text-muted line-clamp-1">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => startEditChallenge(c)} className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteChallenge(c.id)} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors" title="Delete">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <NoteViewerModal url={viewingNoteUrl} onClose={() => setViewingNoteUrl(null)} />
    </div>
  );
};

export default AdminPage;
