import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { academicCatalogParams } from '../utils/academicCatalog';
import { FiUpload, FiFile, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import PageMascot from '../components/ui/PageMascot';
import AiLoadingState from '../components/common/AiLoadingState';
import { MOOD_MASCOTS } from '../constants/mascots';

const UPLOAD_AI_MESSAGES = [
  'Uploading and securing your file...',
  'Analyzing syllabus structure...',
  'Vectorizing knowledge graph...',
  'Consulting community RAG...',
  'Indexing for search and tutor tools...',
];

const UploadPage = () => {
  const { refreshUser, user } = useAuth();
  const catalogParams = useMemo(() => academicCatalogParams(user), [user]);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);


  const [degrees, setDegrees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  useEffect(() => {
    api
      .get('/degrees', { params: catalogParams })
      .then((res) => setDegrees(res.data))
      .catch(console.error);
  }, [catalogParams]);

  useEffect(() => {
    if (selectedDegree) {
      api
        .get(`/degrees/${selectedDegree}/branches`, { params: catalogParams })
        .then((res) => setBranches(res.data))
        .catch(console.error);
      setSelectedBranch('');
      setSelectedSemester('');
      setSelectedSubject('');
      setSelectedTopic('');
    }
  }, [selectedDegree, catalogParams]);

  useEffect(() => {
    if (selectedBranch) {
      api
        .get(`/branches/${selectedBranch}/semesters`, { params: catalogParams })
        .then((res) => setSemesters(res.data))
        .catch(console.error);
      setSelectedSemester('');
      setSelectedSubject('');
      setSelectedTopic('');
    }
  }, [selectedBranch, catalogParams]);

  useEffect(() => {
    if (selectedSemester) {
      api
        .get(`/semesters/${selectedSemester}/subjects`, { params: catalogParams })
        .then((res) => setSubjects(res.data))
        .catch(console.error);
      setSelectedSubject('');
      setSelectedTopic('');
    }
  }, [selectedSemester, catalogParams]);

  useEffect(() => {
    if (selectedSubject) {
      api
        .get(`/subjects/${selectedSubject}/topics`, { params: catalogParams })
        .then((res) => setTopics(res.data))
        .catch(console.error);
      setSelectedTopic('');
    }
  }, [selectedSubject, catalogParams]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (f) => {
    setFile(f);
    setError('');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedTopic) {
      setError('Please select a topic and upload a file.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('topicId', selectedTopic);

      await api.post('/notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
      refreshUser();
      setTimeout(() => navigate(`/topic/${selectedTopic}`), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const SelectField = ({ label, value, onChange, options, labelKey = 'name', valueKey = 'id', placeholder }) => (
    <div>
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

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fadeInUp">
        <div className="glass-card p-12 text-center">
          <img
            src={MOOD_MASCOTS.proud.src}
            alt={MOOD_MASCOTS.proud.alt}
            className="w-28 h-auto mx-auto mb-4 object-contain drop-shadow-lg"
            draggable={false}
          />
          <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-3">
            <FiCheck size={32} className="text-success" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-2">Upload Successful!</h2>
          <p className="text-text-muted">Your note is being processed by AI. You earned +5 credits! ⚡</p>
          <p className="text-xs text-text-muted mt-2">Redirecting to topic page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeInUp">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Upload Notes</h1>
          <p className="text-text-muted mt-1">Upload handwritten notes or PDFs to earn credits</p>
        </div>
        <PageMascot role="upload" size="md" className="md:mr-4 shrink-0" />
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-6">
        {loading && (
          <div className="absolute inset-0 z-20 flex min-h-[24rem] items-center justify-center rounded-2xl bg-white/75 backdrop-blur-md ring-1 ring-violet-200/60">
            <AiLoadingState
              isLoading={loading}
              messages={UPLOAD_AI_MESSAGES}
              label="Upload and AI processing"
            />
          </div>
        )}
        <div className={`glass-card p-6 ${loading ? 'pointer-events-none opacity-40' : ''}`}>
          <h3 className="text-sm font-semibold text-text mb-4">Select File</h3>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload file: drag and drop here or press Enter to browse"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.getElementById('file-input')?.click();
              }
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20
              ${dragActive ? 'border-primary bg-primary/10' : 'border-slate-200/90 hover:border-violet-300/60 bg-white/60'}`}
            onClick={() => document.getElementById('file-input').click()}
          >
            {file ? (
              <div className="space-y-3">
                {preview && (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl" />
                )}
                <div className="flex items-center justify-center gap-2">
                  <FiFile size={16} className="text-primary" />
                  <span className="text-sm text-text">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    className="text-danger hover:text-red-400"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <FiUpload size={40} className="mx-auto text-text-muted mb-3" />
                <p className="text-text-muted text-sm">Drag & drop your file here, or click to browse</p>
                <p className="text-text-muted/50 text-xs mt-1">Supports: JPG, PNG, PDF (max 10MB)</p>
              </>
            )}
            <input
              id="file-input"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
          </div>
        </div>

        <div className={`glass-card p-6 ${loading ? 'pointer-events-none opacity-40' : ''}`}>
          <h3 className="text-sm font-semibold text-text mb-4">Select Topic</h3>
          <div className="space-y-4">
            <SelectField label="Degree" value={selectedDegree} onChange={setSelectedDegree} options={degrees} placeholder="Select degree..." />

            {selectedDegree && (
              <SelectField label="Branch" value={selectedBranch} onChange={setSelectedBranch} options={branches} placeholder="Select branch..." />
            )}

            {selectedBranch && (
              <SelectField label="Semester" value={selectedSemester} onChange={setSelectedSemester} options={semesters} labelKey="number" placeholder="Select semester..." />
            )}

            {selectedSemester && (
              <SelectField label="Subject" value={selectedSubject} onChange={setSelectedSubject} options={subjects} placeholder="Select subject..." />
            )}

            {selectedSubject && (
              <SelectField label="Topic" value={selectedTopic} onChange={setSelectedTopic} options={topics} placeholder="Select topic..." />
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !file || !selectedTopic}
          className="w-full btn-gradient py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FiUpload size={16} /> {loading ? 'Processing…' : 'Upload Note (+5 ⚡)'}
        </button>
      </form>
    </div>
  );
};

export default UploadPage;
