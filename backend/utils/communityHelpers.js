const {
  Post,
  User,
  Comment,
  PostUpvote,
  PostBookmark,
  CommentUpvote,
  Topic,
  Subject,
  Degree,
  Branch,
  Semester,
  Tag
} = require('../models');
const { leanDoc } = require('./mongoHelpers');

async function fetchPostEnriched(postId, viewerUserId) {
  const post = await Post.findOne({ id: postId });
  if (!post) return null;
  const user = await User.findOne({ id: post.user_id });
  const [upvoteCount, commentCount, userUpvoted, userBookmarked, bookmarkCount] = await Promise.all([
    PostUpvote.countDocuments({ post_id: postId }),
    Comment.countDocuments({ post_id: postId }),
    PostUpvote.exists({ post_id: postId, user_id: viewerUserId }),
    PostBookmark.exists({ post_id: postId, user_id: viewerUserId }),
    PostBookmark.countDocuments({ post_id: postId })
  ]);
  const row = leanDoc(post);
  row.author_name = post.is_anonymous ? 'Anonymous Learner' : (user?.name || 'Unknown');
  row.upvote_count = upvoteCount;
  row.comment_count = commentCount;
  row.user_has_upvoted = !!userUpvoted;
  row.user_has_bookmarked = !!userBookmarked;
  row.bookmark_count = bookmarkCount;
  return row;
}

function nameToForumTag(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  if (s.length < 2) return null;
  return `#${s}`;
}

async function gatherForumTagSet(academicCollegeId, tagTableCollegeId) {
  const tagSet = new Set([
    '#Career',
    '#Career_Advice',
    '#General_Doubts',
    '#Homework',
    '#General'
  ]);

  const [topics, subjects, degrees, branches, semesters] = await Promise.all([
    Topic.distinct('name', { college_id: academicCollegeId }),
    Subject.distinct('name', { college_id: academicCollegeId }),
    Degree.distinct('name', { college_id: academicCollegeId }),
    Branch.distinct('name', { college_id: academicCollegeId }),
    Semester.find({ college_id: academicCollegeId }).sort({ number: 1 }).select('number').lean()
  ]);

  const tagFilter =
    tagTableCollegeId == null ? { college_id: null } : { college_id: tagTableCollegeId };
  const tagRows = await Tag.find(tagFilter).select('name').lean();

  topics.forEach((name) => {
    const t = nameToForumTag(name);
    if (t) tagSet.add(t);
  });
  subjects.forEach((name) => {
    const t = nameToForumTag(name);
    if (t) tagSet.add(t);
  });
  degrees.forEach((name) => {
    const t = nameToForumTag(name);
    if (t) tagSet.add(t);
  });
  branches.forEach((name) => {
    const t = nameToForumTag(name);
    if (t) tagSet.add(t);
  });
  semesters.forEach((r) => tagSet.add(`#Semester_${r.number}`));
  tagRows.forEach((r) => {
    const n = String(r.name || '').trim();
    if (n) tagSet.add(n.startsWith('#') ? n : `#${n}`);
  });

  return tagSet;
}

async function upsertTagPostCount(tagName, tagCollegeId) {
  const filter =
    tagCollegeId == null ? { name: tagName, college_id: null } : { name: tagName, college_id: tagCollegeId };
  const updated = await Tag.findOneAndUpdate(
    filter,
    { $inc: { post_count: 1 }, $set: { last_active: new Date() } },
    { new: true }
  );
  if (!updated) {
    await Tag.create({ name: tagName, college_id: tagCollegeId ?? null, post_count: 1, last_active: new Date() });
  }
}

async function decrementTagPostCount(tagName, tagCollegeId) {
  if (!tagName || typeof tagName !== 'string') return;
  const filter =
    tagCollegeId == null ? { name: tagName, college_id: null } : { name: tagName, college_id: tagCollegeId };
  const tag = await Tag.findOne(filter);
  if (tag && tag.post_count > 0) {
    tag.post_count -= 1;
    await tag.save();
  }
}

module.exports = {
  fetchPostEnriched,
  gatherForumTagSet,
  upsertTagPostCount,
  decrementTagPostCount,
  nameToForumTag
};
