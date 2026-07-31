const {
  College,
  User,
  Degree,
  Branch,
  Semester,
  Subject,
  Topic,
  TopicRelation,
  Teacher
} = require('../models');

async function upsertCollege(name, domainSuffix) {
  const ds = domainSuffix.toLowerCase();
  let college = await College.findOne({ domain_suffix: ds });
  if (!college) {
    college = await College.create({ name, domain_suffix: ds });
  }
  return college;
}

async function seed() {
  const systemCollege = await upsertCollege('Learnexus System', 'system.learnexus.internal');
  const demoCollege = await upsertCollege('Demo University', 'demo.edu');
  const platformCollege = await upsertCollege('Learnexus Platform', 'learnexus.com');

  const degreeNames = ['B.Tech', 'BCA', 'BSc Computer Science', 'MCA'];
  const degrees = {};
  for (const name of degreeNames) {
    let deg = await Degree.findOne({ college_id: demoCollege.id, name });
    if (!deg) deg = await Degree.create({ name, college_id: demoCollege.id });
    degrees[name] = deg;
  }

  const branchDefs = [
    ['Computer Science & Engineering', 'B.Tech'],
    ['Information Technology', 'B.Tech'],
    ['Electronics & Communication', 'B.Tech'],
    ['Mechanical Engineering', 'B.Tech'],
    ['BCA General', 'BCA'],
    ['BSc CS General', 'BSc Computer Science'],
    ['MCA General', 'MCA']
  ];
  const branches = {};
  for (const [bname, dname] of branchDefs) {
    const degree = degrees[dname];
    let br = await Branch.findOne({ degree_id: degree.id, name: bname });
    if (!br) br = await Branch.create({ name: bname, degree_id: degree.id, college_id: demoCollege.id });
    branches[bname] = br;
  }

  const semCounts = {
    'Computer Science & Engineering': 8,
    'Information Technology': 8,
    'BCA General': 6
  };
  const semesters = {};
  for (const [bname, count] of Object.entries(semCounts)) {
    const br = branches[bname];
    for (let num = 1; num <= count; num++) {
      let sem = await Semester.findOne({ branch_id: br.id, number: num });
      if (!sem) sem = await Semester.create({ number: num, branch_id: br.id, college_id: demoCollege.id });
      semesters[`${bname}:${num}`] = sem;
    }
  }

  const cseBranch = branches['Computer Science & Engineering'];
  const subjectDefs = [
    [1, ['Mathematics I', 'Physics', 'Programming in C', 'Engineering Drawing']],
    [2, ['Mathematics II', 'Chemistry', 'Object Oriented Programming', 'Digital Electronics']],
    [3, ['Data Structures', 'Database Management Systems', 'Discrete Mathematics', 'Computer Organization']],
    [4, ['Operating Systems', 'Design & Analysis of Algorithms', 'Computer Networks', 'Software Engineering']],
    [5, ['Artificial Intelligence', 'Compiler Design', 'Web Technologies']]
  ];
  const subjects = {};
  for (const [semNum, names] of subjectDefs) {
    const sem = semesters[`Computer Science & Engineering:${semNum}`];
    for (const sname of names) {
      let sub = await Subject.findOne({ semester_id: sem.id, name: sname });
      if (!sub) sub = await Subject.create({ name: sname, semester_id: sem.id, college_id: demoCollege.id });
      subjects[sname] = sub;
    }
  }

  const dsTopics = ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees', 'Graphs', 'Sorting Algorithms', 'Searching Algorithms'];
  const topics = {};
  const dsSubject = subjects['Data Structures'];
  for (const tname of dsTopics) {
    let t = await Topic.findOne({ subject_id: dsSubject.id, name: tname, parent_topic_id: null });
    if (!t) t = await Topic.create({ name: tname, subject_id: dsSubject.id, college_id: demoCollege.id, parent_topic_id: null });
    topics[tname] = t;
  }

  const treeParent = topics['Trees'];
  for (const tname of ['Binary Trees', 'Binary Search Trees', 'AVL Trees', 'Heap']) {
    let t = await Topic.findOne({ subject_id: dsSubject.id, name: tname });
    if (!t) {
      t = await Topic.create({
        name: tname,
        subject_id: dsSubject.id,
        parent_topic_id: treeParent.id,
        college_id: demoCollege.id
      });
    }
    topics[tname] = t;
  }

  const dbmsSubject = subjects['Database Management Systems'];
  for (const tname of ['ER Model', 'Relational Model', 'SQL', 'Normalization', 'Transaction Management', 'Indexing']) {
    let t = await Topic.findOne({ subject_id: dbmsSubject.id, name: tname, parent_topic_id: null });
    if (!t) t = await Topic.create({ name: tname, subject_id: dbmsSubject.id, college_id: demoCollege.id, parent_topic_id: null });
    topics[tname] = t;
  }

  const osSubject = subjects['Operating Systems'];
  for (const tname of ['Process Management', 'CPU Scheduling', 'Memory Management', 'File Systems', 'Deadlocks']) {
    let t = await Topic.findOne({ subject_id: osSubject.id, name: tname, parent_topic_id: null });
    if (!t) t = await Topic.create({ name: tname, subject_id: osSubject.id, college_id: demoCollege.id, parent_topic_id: null });
    topics[tname] = t;
  }

  async function ensureRelation(a, b, rel) {
    const exists = await TopicRelation.findOne({ topic_id_1: topics[a].id, topic_id_2: topics[b].id });
    if (!exists) await TopicRelation.create({ topic_id_1: topics[a].id, topic_id_2: topics[b].id, relation_type: rel });
  }

  await ensureRelation('Arrays', 'Linked Lists', 'prerequisite');
  await ensureRelation('Stacks', 'Queues', 'related');
  await ensureRelation('Trees', 'Graphs', 'related');
  await ensureRelation('Sorting Algorithms', 'Searching Algorithms', 'related');
  await ensureRelation('SQL', 'Normalization', 'prerequisite');
  await ensureRelation('Process Management', 'CPU Scheduling', 'prerequisite');

  const teacherDefs = [
    ['Dr. Sharma', 'Data Structures'],
    ['Prof. Gupta', 'Database Management Systems'],
    ['Dr. Verma', 'Operating Systems'],
    ['Prof. Singh', 'Design & Analysis of Algorithms']
  ];
  for (const [tname, subname] of teacherDefs) {
    const sub = subjects[subname];
    const exists = await Teacher.findOne({ subject_id: sub.id, name: tname });
    if (!exists) await Teacher.create({ name: tname, subject_id: sub.id, college_id: demoCollege.id });
  }

  const adminEmail = 'admin@learnexus.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      college_id: platformCollege.id,
      role: 'superadmin',
      credits: 100,
      is_verified: true,
      password: '$2a$10$xVqYLGQFGGXMR0r4GZ2hruTlYLBVMqCMGsHpJ16QRqE4sFMFx3bQO'
    });
  }

  const aiEmail = 'nexus-ai-tutor@system.learnexus.internal';
  let aiUser = await User.findOne({ email: aiEmail });
  if (!aiUser) {
    aiUser = await User.create({
      name: 'AI Tutor',
      email: aiEmail,
      college_id: systemCollege.id,
      role: 'student',
      credits: 0,
      is_verified: true
    });
  }

  console.log('Seed complete.');
  return { demoCollege, platformCollege, systemCollege };
}

module.exports = { seed };
