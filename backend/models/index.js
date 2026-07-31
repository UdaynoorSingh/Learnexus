const mongoose = require('mongoose');
const { getNextId } = require('../utils/mongoHelpers');

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});

function autoIdPlugin(schema, sequenceName) {
  schema.pre('save', async function assignId(next) {
    if (this.isNew && (this.id == null || this.id === undefined)) {
      this.id = await getNextId(sequenceName);
    }
    next();
  });
}

const collegeSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  name: { type: String, required: true },
  domain_suffix: { type: String, required: true, lowercase: true },
  created_at: { type: Date, default: Date.now }
});
collegeSchema.plugin(autoIdPlugin, 'colleges');
collegeSchema.index({ domain_suffix: 1 }, { unique: true });

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  college_id: { type: Number, required: true, index: true },
  role: { type: String, default: 'student', enum: ['student', 'admin', 'superadmin'] },
  credits: { type: Number, default: 10 },
  is_verified: { type: Boolean, default: false },
  otp_code: String,
  otp_expiry: Date,
  password: String,
  created_at: { type: Date, default: Date.now }
});
userSchema.plugin(autoIdPlugin, 'users');
userSchema.index({ email: 1 }, { unique: true });

const degreeSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  name: { type: String, required: true }
});
degreeSchema.plugin(autoIdPlugin, 'degrees');
degreeSchema.index({ college_id: 1, name: 1 }, { unique: true });

const branchSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  degree_id: { type: Number, required: true, index: true }
});
branchSchema.plugin(autoIdPlugin, 'branches');
branchSchema.index({ degree_id: 1, name: 1 }, { unique: true });

const semesterSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  number: { type: Number, required: true },
  branch_id: { type: Number, required: true, index: true }
});
semesterSchema.plugin(autoIdPlugin, 'semesters');
semesterSchema.index({ branch_id: 1, number: 1 }, { unique: true });

const subjectSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  semester_id: { type: Number, required: true, index: true }
});
subjectSchema.plugin(autoIdPlugin, 'subjects');

const teacherSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  subject_id: Number
});
teacherSchema.plugin(autoIdPlugin, 'teachers');

const topicSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  subject_id: { type: Number, required: true, index: true },
  teacher_id: Number,
  parent_topic_id: { type: Number, default: null }
});
topicSchema.plugin(autoIdPlugin, 'topics');
topicSchema.index({ subject_id: 1, parent_topic_id: 1 });

const noteSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, required: true, index: true },
  topic_id: { type: Number, index: true },
  uploaded_by: Number,
  file_url: { type: String, required: true },
  extracted_text: String,
  summary: String,
  key_points: mongoose.Schema.Types.Mixed,
  quality_score: { type: Number, default: 0 },
  is_verified: { type: Boolean, default: false },
  audio_url: String,
  created_at: { type: Date, default: Date.now }
});
noteSchema.plugin(autoIdPlugin, 'notes');

const topicRelationSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  topic_id_1: Number,
  topic_id_2: Number,
  relation_type: String
});
topicRelationSchema.plugin(autoIdPlugin, 'topic_relations');

const transactionSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, index: true },
  credits_added: { type: Number, default: 0 },
  credits_used: { type: Number, default: 0 },
  reason: String,
  created_at: { type: Date, default: Date.now }
});
transactionSchema.plugin(autoIdPlugin, 'transactions');

const postSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  college_id: { type: Number, default: null, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  image_url: String,
  tag: { type: String, required: true },
  bounty: { type: Number, default: 0 },
  is_solved: { type: Boolean, default: false },
  is_anonymous: { type: Boolean, default: false },
  audio_url: String,
  created_at: { type: Date, default: Date.now }
});
postSchema.plugin(autoIdPlugin, 'posts');

const commentSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  post_id: { type: Number, required: true, index: true },
  user_id: { type: Number, required: true },
  parent_comment_id: { type: Number, default: null },
  content: { type: String, required: true },
  is_accepted_answer: { type: Boolean, default: false },
  is_anonymous: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
commentSchema.plugin(autoIdPlugin, 'comments');

const commentUpvoteSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  comment_id: { type: Number, required: true, index: true }
});
commentUpvoteSchema.index({ user_id: 1, comment_id: 1 }, { unique: true });

const postUpvoteSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  post_id: { type: Number, required: true, index: true }
});
postUpvoteSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

const postBookmarkSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  post_id: { type: Number, required: true, index: true }
});
postBookmarkSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

const tagSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  college_id: { type: Number, default: null, index: true },
  name: { type: String, required: true },
  post_count: { type: Number, default: 0 },
  last_active: { type: Date, default: Date.now }
});
tagSchema.plugin(autoIdPlugin, 'tags');
tagSchema.index({ college_id: 1, name: 1 }, { unique: true });

const libraryPostSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  college_id: { type: Number, default: null, index: true },
  topic: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  difficulty: { type: String, default: 'intermediate', enum: ['beginner', 'intermediate', 'advanced'] },
  audio_url: String,
  created_at: { type: Date, default: Date.now }
});
libraryPostSchema.plugin(autoIdPlugin, 'library_posts');

const libraryPostVoteSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  post_id: { type: Number, required: true, index: true },
  vote_type: { type: String, enum: ['like', 'dislike'], required: true }
});
libraryPostVoteSchema.index({ user_id: 1, post_id: 1 }, { unique: true });

const studentSigninOtpSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  email: { type: String, required: true, lowercase: true, index: true },
  name: String,
  college_id: Number,
  otp_hash: String,
  expires_at: Date,
  created_at: { type: Date, default: Date.now }
});
studentSigninOtpSchema.plugin(autoIdPlugin, 'student_signin_otps');

const userPinSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  kind: { type: String, default: 'route' },
  label: String,
  href: String,
  icon: String,
  color: String,
  position: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
userPinSchema.plugin(autoIdPlugin, 'user_pins');

const userEventSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  event_type: String,
  payload: mongoose.Schema.Types.Mixed,
  occurred_at: { type: Date, default: Date.now }
});
userEventSchema.plugin(autoIdPlugin, 'user_events');

const studySessionSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  title: String,
  description: String,
  starts_at: Date,
  ends_at: Date,
  status: { type: String, default: 'scheduled' },
  meta: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});
studySessionSchema.plugin(autoIdPlugin, 'study_sessions');

const tutorStateSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  state: mongoose.Schema.Types.Mixed,
  updated_at: { type: Date, default: Date.now }
});

const conceptGraphCacheSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  topic_id: { type: Number, default: null },
  source_hash: String,
  graph: mongoose.Schema.Types.Mixed,
  updated_at: { type: Date, default: Date.now }
});
conceptGraphCacheSchema.plugin(autoIdPlugin, 'concept_graph_cache');
conceptGraphCacheSchema.index({ user_id: 1, topic_id: 1, source_hash: 1 }, { unique: true });

const companyChallengeSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  company_name: String,
  title: String,
  description: String,
  difficulty: String,
  bounty_credits: { type: Number, default: 5 },
  tags: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now }
});
companyChallengeSchema.plugin(autoIdPlugin, 'company_challenges');

const challengeSubmissionSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  challenge_id: { type: Number, required: true, index: true },
  user_id: { type: Number, required: true },
  github_url: String,
  status: { type: String, default: 'Pending' },
  submitted_at: { type: Date, default: Date.now }
});
challengeSubmissionSchema.plugin(autoIdPlugin, 'challenge_submissions');
challengeSubmissionSchema.index({ challenge_id: 1, user_id: 1 }, { unique: true });

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
const College = mongoose.models.College || mongoose.model('College', collegeSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Degree = mongoose.models.Degree || mongoose.model('Degree', degreeSchema);
const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
const Semester = mongoose.models.Semester || mongoose.model('Semester', semesterSchema);
const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
const Topic = mongoose.models.Topic || mongoose.model('Topic', topicSchema);
const Note = mongoose.models.Note || mongoose.model('Note', noteSchema);
const TopicRelation = mongoose.models.TopicRelation || mongoose.model('TopicRelation', topicRelationSchema);
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
const CommentUpvote = mongoose.models.CommentUpvote || mongoose.model('CommentUpvote', commentUpvoteSchema);
const PostUpvote = mongoose.models.PostUpvote || mongoose.model('PostUpvote', postUpvoteSchema);
const PostBookmark = mongoose.models.PostBookmark || mongoose.model('PostBookmark', postBookmarkSchema);
const Tag = mongoose.models.Tag || mongoose.model('Tag', tagSchema);
const LibraryPost = mongoose.models.LibraryPost || mongoose.model('LibraryPost', libraryPostSchema);
const LibraryPostVote = mongoose.models.LibraryPostVote || mongoose.model('LibraryPostVote', libraryPostVoteSchema);
const StudentSigninOtp = mongoose.models.StudentSigninOtp || mongoose.model('StudentSigninOtp', studentSigninOtpSchema);
const UserPin = mongoose.models.UserPin || mongoose.model('UserPin', userPinSchema);
const UserEvent = mongoose.models.UserEvent || mongoose.model('UserEvent', userEventSchema);
const StudySession = mongoose.models.StudySession || mongoose.model('StudySession', studySessionSchema);
const TutorState = mongoose.models.TutorState || mongoose.model('TutorState', tutorStateSchema);
const ConceptGraphCache = mongoose.models.ConceptGraphCache || mongoose.model('ConceptGraphCache', conceptGraphCacheSchema);
const CompanyChallenge = mongoose.models.CompanyChallenge || mongoose.model('CompanyChallenge', companyChallengeSchema);
const ChallengeSubmission = mongoose.models.ChallengeSubmission || mongoose.model('ChallengeSubmission', challengeSubmissionSchema);

module.exports = {
  Counter,
  College,
  User,
  Degree,
  Branch,
  Semester,
  Subject,
  Teacher,
  Topic,
  Note,
  TopicRelation,
  Transaction,
  Post,
  Comment,
  CommentUpvote,
  PostUpvote,
  PostBookmark,
  Tag,
  LibraryPost,
  LibraryPostVote,
  StudentSigninOtp,
  UserPin,
  UserEvent,
  StudySession,
  TutorState,
  ConceptGraphCache,
  CompanyChallenge,
  ChallengeSubmission
};
