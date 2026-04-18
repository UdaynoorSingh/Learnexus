import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { academicCatalogParams } from '../utils/academicCatalog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageMascot from '../components/ui/PageMascot';
import EmptyState from '../components/ui/EmptyState';
import { FiBook, FiLayers, FiGrid, FiBookOpen, FiFileText, FiChevronRight, FiArrowLeft } from 'react-icons/fi';

const ExplorerPage = () => {
  const { user } = useAuth();
  const catalogParams = useMemo(() => academicCatalogParams(user), [user]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [level, setLevel] = useState('degrees');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [parentId, setParentId] = useState(null);

  useEffect(() => {
    const semesterId = searchParams.get('semester');
    if (semesterId) {
      loadSubjects(semesterId);
    } else {
      loadDegrees();
    }
  }, [searchParams, catalogParams]);

  const loadDegrees = async () => {
    setLoading(true);
    setLevel('degrees');
    setBreadcrumb([]);
    try {
      const res = await api.get('/degrees', { params: catalogParams });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async (degreeId, degreeName) => {
    setLoading(true);
    setLevel('branches');
    setParentId(degreeId);
    setBreadcrumb([{ label: degreeName, action: () => loadDegrees() }]);
    try {
      const res = await api.get(`/degrees/${degreeId}/branches`, { params: catalogParams });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesters = async (branchId, branchName) => {
    setLoading(true);
    setLevel('semesters');
    setParentId(branchId);
    setBreadcrumb(prev => [...prev.slice(0, 1), { label: branchName, action: () => loadBranches(parentId, breadcrumb[0]?.label) }]);
    try {
      const res = await api.get(`/branches/${branchId}/semesters`, { params: catalogParams });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (semesterId, semesterName) => {
    setLoading(true);
    setLevel('subjects');
    try {
      const res = await api.get(`/semesters/${semesterId}/subjects`, { params: catalogParams });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (subjectId, subjectName) => {
    setLoading(true);
    setLevel('topics');
    try {
      const res = await api.get(`/subjects/${subjectId}/topics`, { params: catalogParams });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (item) => {
    switch (level) {
      case 'degrees':
        loadBranches(item.id, item.name);
        break;
      case 'branches':
        loadSemesters(item.id, item.name);
        break;
      case 'semesters':
        loadSubjects(item.id, `Semester ${item.number}`);
        break;
      case 'subjects':
        loadTopics(item.id, item.name);
        break;
      case 'topics':
        navigate(`/topic/${item.id}`);
        break;
    }
  };

  const goBack = () => {
    if (breadcrumb.length > 0) {
      const last = breadcrumb[breadcrumb.length - 1];
      last.action();
    } else {
      loadDegrees();
    }
  };

  const getIcon = () => {
    switch (level) {
      case 'degrees': return FiBook;
      case 'branches': return FiLayers;
      case 'semesters': return FiGrid;
      case 'subjects': return FiBookOpen;
      case 'topics': return FiFileText;
      default: return FiBook;
    }
  };

  const getTitle = () => {
    switch (level) {
      case 'degrees': return 'Select Degree';
      case 'branches': return 'Select Branch';
      case 'semesters': return 'Select Semester';
      case 'subjects': return 'Select Subject';
      case 'topics': return 'Topics';
      default: return 'Explorer';
    }
  };

  const getSubtitle = () => {
    switch (level) {
      case 'degrees':
        return 'Choose your program to browse branches, semesters, and subjects.';
      case 'branches':
        return 'Pick the branch that matches your curriculum.';
      case 'semesters':
        return 'Open a semester to see subjects and topics.';
      case 'subjects':
        return 'Select a subject, then jump into a topic to study.';
      case 'topics':
        return 'Open a topic for notes, AI tutor tools, and more.';
      default:
        return '';
    }
  };

  const getGradient = (index) => {
    const gradients = [
      'from-blue-500/20 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40',
      'from-purple-500/20 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40',
      'from-green-500/20 to-green-600/5 border-green-500/20 hover:border-green-500/40',
      'from-orange-500/20 to-orange-600/5 border-orange-500/20 hover:border-orange-500/40',
      'from-pink-500/20 to-pink-600/5 border-pink-500/20 hover:border-pink-500/40',
      'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 hover:border-cyan-500/40',
    ];
    return gradients[index % gradients.length];
  };

  const Icon = getIcon();

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
        {level !== 'degrees' && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back one level"
            className="p-2 rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 shrink-0"
          >
            <FiArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-['Outfit']">{getTitle()}</h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-xl leading-relaxed">{getSubtitle()}</p>
          {breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
              <span className="cursor-pointer hover:text-primary" onClick={loadDegrees}>Home</span>
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <FiChevronRight size={10} />
                  <span className="cursor-pointer hover:text-primary" onClick={crumb.action}>{crumb.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        </div>
        <PageMascot role="explorer" size="md" className="shrink-0 self-end sm:self-center" hideOnMobile />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm">
          <LoadingSpinner size="lg" text="Loading catalog…" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          illustration="notes"
          title="Nothing to show here yet"
          description="Your school may still be setting up this part of the catalog, or nothing has been published for this level. Try another path or ask your admin."
          ctaLabel="Back to dashboard"
          to="/dashboard"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={`bg-gradient-to-br ${getGradient(index)} border rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Icon size={20} className="text-text-muted mb-3 group-hover:text-primary transition-colors" />
                  <h3 className="text-lg font-semibold text-text mb-1">
                    {level === 'semesters' ? `Semester ${item.number}` : item.name}
                  </h3>
                  {item.topic_count !== undefined && (
                    <p className="text-xs text-text-muted">{item.topic_count} topics</p>
                  )}
                  {item.note_count !== undefined && (
                    <p className="text-xs text-text-muted">{item.note_count} notes</p>
                  )}
                  {item.subtopic_count > 0 && (
                    <p className="text-xs text-text-muted">{item.subtopic_count} subtopics</p>
                  )}
                </div>
                <FiChevronRight size={16} className="text-text-muted group-hover:text-text group-hover:translate-x-1 transition-all mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorerPage;
