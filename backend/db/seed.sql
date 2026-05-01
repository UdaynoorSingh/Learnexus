

INSERT INTO colleges (name, domain_suffix)
SELECT v.name, v.domain_suffix
FROM (VALUES
  ('Learnexus System', 'system.learnexus.internal'),
  ('Demo University', 'demo.edu'),
  ('Learnexus Platform', 'learnexus.com')
) AS v(name, domain_suffix)
WHERE NOT EXISTS (SELECT 1 FROM colleges c WHERE LOWER(c.domain_suffix) = LOWER(v.domain_suffix));


INSERT INTO degrees (name, college_id)
SELECT v.name, c.id
FROM (VALUES
  ('B.Tech'),
  ('BCA'),
  ('BSc Computer Science'),
  ('MCA')
) AS v(name)
CROSS JOIN (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1) c
WHERE NOT EXISTS (
  SELECT 1 FROM degrees d WHERE d.college_id = c.id AND d.name = v.name
);


INSERT INTO branches (name, degree_id, college_id)
SELECT v.bname, d.id, d.college_id
FROM (VALUES
  ('Computer Science & Engineering', 'B.Tech'),
  ('Information Technology', 'B.Tech'),
  ('Electronics & Communication', 'B.Tech'),
  ('Mechanical Engineering', 'B.Tech')
) AS v(bname, dname)
JOIN degrees d ON d.name = v.dname AND d.college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.degree_id = d.id AND b.name = v.bname);

INSERT INTO branches (name, degree_id, college_id)
SELECT 'BCA General', d.id, d.college_id
FROM degrees d
WHERE d.name = 'BCA' AND d.college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.degree_id = d.id AND b.name = 'BCA General');

INSERT INTO branches (name, degree_id, college_id)
SELECT 'BSc CS General', d.id, d.college_id
FROM degrees d
WHERE d.name = 'BSc Computer Science' AND d.college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.degree_id = d.id AND b.name = 'BSc CS General');

INSERT INTO branches (name, degree_id, college_id)
SELECT 'MCA General', d.id, d.college_id
FROM degrees d
WHERE d.name = 'MCA' AND d.college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.degree_id = d.id AND b.name = 'MCA General');


INSERT INTO semesters (number, branch_id, college_id)
SELECT s.num, b.id, b.college_id
FROM branches b
CROSS JOIN generate_series(1, 8) AS s(num)
WHERE b.name = 'Computer Science & Engineering'
AND NOT EXISTS (SELECT 1 FROM semesters sem WHERE sem.branch_id = b.id AND sem.number = s.num);

INSERT INTO semesters (number, branch_id, college_id)
SELECT s.num, b.id, b.college_id
FROM branches b
CROSS JOIN generate_series(1, 8) AS s(num)
WHERE b.name = 'Information Technology'
AND NOT EXISTS (SELECT 1 FROM semesters sem WHERE sem.branch_id = b.id AND sem.number = s.num);

INSERT INTO semesters (number, branch_id, college_id)
SELECT s.num, b.id, b.college_id
FROM branches b
CROSS JOIN generate_series(1, 6) AS s(num)
WHERE b.name = 'BCA General'
AND NOT EXISTS (SELECT 1 FROM semesters sem WHERE sem.branch_id = b.id AND sem.number = s.num);


INSERT INTO subjects (name, semester_id, college_id)
SELECT v.sname, sem.id, sem.college_id
FROM (VALUES
  (1, 'Mathematics I'),
  (1, 'Physics'),
  (1, 'Programming in C'),
  (1, 'Engineering Drawing')
) AS v(semnum, sname)
JOIN branches b ON b.name = 'Computer Science & Engineering'
JOIN semesters sem ON sem.branch_id = b.id AND sem.number = v.semnum
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub WHERE sub.semester_id = sem.id AND sub.name = v.sname
);

INSERT INTO subjects (name, semester_id, college_id)
SELECT v.sname, sem.id, sem.college_id
FROM (VALUES
  (2, 'Mathematics II'),
  (2, 'Chemistry'),
  (2, 'Object Oriented Programming'),
  (2, 'Digital Electronics')
) AS v(semnum, sname)
JOIN branches b ON b.name = 'Computer Science & Engineering'
JOIN semesters sem ON sem.branch_id = b.id AND sem.number = v.semnum
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub WHERE sub.semester_id = sem.id AND sub.name = v.sname
);

INSERT INTO subjects (name, semester_id, college_id)
SELECT v.sname, sem.id, sem.college_id
FROM (VALUES
  (3, 'Data Structures'),
  (3, 'Database Management Systems'),
  (3, 'Discrete Mathematics'),
  (3, 'Computer Organization')
) AS v(semnum, sname)
JOIN branches b ON b.name = 'Computer Science & Engineering'
JOIN semesters sem ON sem.branch_id = b.id AND sem.number = v.semnum
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub WHERE sub.semester_id = sem.id AND sub.name = v.sname
);

INSERT INTO subjects (name, semester_id, college_id)
SELECT v.sname, sem.id, sem.college_id
FROM (VALUES
  (4, 'Operating Systems'),
  (4, 'Design & Analysis of Algorithms'),
  (4, 'Computer Networks'),
  (4, 'Software Engineering')
) AS v(semnum, sname)
JOIN branches b ON b.name = 'Computer Science & Engineering'
JOIN semesters sem ON sem.branch_id = b.id AND sem.number = v.semnum
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub WHERE sub.semester_id = sem.id AND sub.name = v.sname
);

INSERT INTO subjects (name, semester_id, college_id)
SELECT v.sname, sem.id, sem.college_id
FROM (VALUES
  (5, 'Artificial Intelligence'),
  (5, 'Compiler Design'),
  (5, 'Web Technologies')
) AS v(semnum, sname)
JOIN branches b ON b.name = 'Computer Science & Engineering'
JOIN semesters sem ON sem.branch_id = b.id AND sem.number = v.semnum
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub WHERE sub.semester_id = sem.id AND sub.name = v.sname
);


INSERT INTO topics (name, subject_id, college_id)
SELECT v.tname, sub.id, sub.college_id
FROM (VALUES
  ('Arrays'),
  ('Linked Lists'),
  ('Stacks'),
  ('Queues'),
  ('Trees'),
  ('Graphs'),
  ('Sorting Algorithms'),
  ('Searching Algorithms')
) AS v(tname)
JOIN subjects sub ON sub.name = 'Data Structures'
JOIN semesters sem ON sem.id = sub.semester_id
JOIN branches br ON br.id = sem.branch_id AND br.name = 'Computer Science & Engineering'
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.subject_id = sub.id AND t.name = v.tname AND t.parent_topic_id IS NULL);

INSERT INTO topics (name, subject_id, parent_topic_id, college_id)
SELECT v.tname, sub.id, pt.id, sub.college_id
FROM (VALUES
  ('Binary Trees'),
  ('Binary Search Trees'),
  ('AVL Trees'),
  ('Heap')
) AS v(tname)
JOIN subjects sub ON sub.name = 'Data Structures'
JOIN semesters sem ON sem.id = sub.semester_id
JOIN branches br ON br.id = sem.branch_id AND br.name = 'Computer Science & Engineering'
JOIN topics pt ON pt.subject_id = sub.id AND pt.name = 'Trees' AND pt.parent_topic_id IS NULL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.subject_id = sub.id AND t.name = v.tname);

INSERT INTO topics (name, subject_id, college_id)
SELECT v.tname, sub.id, sub.college_id
FROM (VALUES
  ('ER Model'),
  ('Relational Model'),
  ('SQL'),
  ('Normalization'),
  ('Transaction Management'),
  ('Indexing')
) AS v(tname)
JOIN subjects sub ON sub.name = 'Database Management Systems'
JOIN semesters sem ON sem.id = sub.semester_id
JOIN branches br ON br.id = sem.branch_id AND br.name = 'Computer Science & Engineering'
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.subject_id = sub.id AND t.name = v.tname AND t.parent_topic_id IS NULL);

INSERT INTO topics (name, subject_id, college_id)
SELECT v.tname, sub.id, sub.college_id
FROM (VALUES
  ('Process Management'),
  ('CPU Scheduling'),
  ('Memory Management'),
  ('File Systems'),
  ('Deadlocks')
) AS v(tname)
JOIN subjects sub ON sub.name = 'Operating Systems'
JOIN semesters sem ON sem.id = sub.semester_id
JOIN branches br ON br.id = sem.branch_id AND br.name = 'Computer Science & Engineering'
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.subject_id = sub.id AND t.name = v.tname AND t.parent_topic_id IS NULL);


INSERT INTO topic_relations (topic_id_1, topic_id_2, relation_type)
SELECT t1.id, t2.id, v.rel
FROM (VALUES
  ('Arrays', 'Linked Lists', 'prerequisite'),
  ('Stacks', 'Queues', 'related'),
  ('Trees', 'Graphs', 'related'),
  ('Sorting Algorithms', 'Searching Algorithms', 'related')
) AS v(a, b, rel)
JOIN subjects sub ON sub.name = 'Data Structures'
JOIN topics t1 ON t1.subject_id = sub.id AND t1.name = v.a AND t1.parent_topic_id IS NULL
JOIN topics t2 ON t2.subject_id = sub.id AND t2.name = v.b AND t2.parent_topic_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM topic_relations tr
  WHERE tr.topic_id_1 = t1.id AND tr.topic_id_2 = t2.id
);

INSERT INTO topic_relations (topic_id_1, topic_id_2, relation_type)
SELECT t1.id, t2.id, 'prerequisite'
FROM subjects sub_ds
JOIN topics t1 ON t1.subject_id = sub_ds.id AND t1.name = 'SQL' AND t1.parent_topic_id IS NULL
JOIN topics t2 ON t2.subject_id = sub_ds.id AND t2.name = 'Normalization' AND t2.parent_topic_id IS NULL
WHERE sub_ds.name = 'Database Management Systems'
AND NOT EXISTS (SELECT 1 FROM topic_relations tr WHERE tr.topic_id_1 = t1.id AND tr.topic_id_2 = t2.id);

INSERT INTO topic_relations (topic_id_1, topic_id_2, relation_type)
SELECT t1.id, t2.id, 'prerequisite'
FROM subjects sub_os
JOIN topics t1 ON t1.subject_id = sub_os.id AND t1.name = 'Process Management' AND t1.parent_topic_id IS NULL
JOIN topics t2 ON t2.subject_id = sub_os.id AND t2.name = 'CPU Scheduling' AND t2.parent_topic_id IS NULL
WHERE sub_os.name = 'Operating Systems'
AND NOT EXISTS (SELECT 1 FROM topic_relations tr WHERE tr.topic_id_1 = t1.id AND tr.topic_id_2 = t2.id);


INSERT INTO teachers (name, subject_id, college_id)
SELECT v.tname, sub.id, sub.college_id
FROM (VALUES
  ('Dr. Sharma', 'Data Structures'),
  ('Prof. Gupta', 'Database Management Systems'),
  ('Dr. Verma', 'Operating Systems'),
  ('Prof. Singh', 'Design & Analysis of Algorithms')
) AS v(tname, subname)
JOIN subjects sub ON sub.name = v.subname
JOIN semesters sem ON sem.id = sub.semester_id
JOIN branches br ON br.id = sem.branch_id AND br.name = 'Computer Science & Engineering'
WHERE NOT EXISTS (SELECT 1 FROM teachers te WHERE te.subject_id = sub.id AND te.name = v.tname);


INSERT INTO users (name, email, college_id, role, credits, is_verified, password)
SELECT
  'Admin',
  'admin@learnexus.com',
  c.id,
  'superadmin',
  100,
  TRUE,
  '$2a$10$xVqYLGQFGGXMR0r4GZ2hruTlYLBVMqCMGsHpJ16QRqE4sFMFx3bQO'
FROM colleges c
WHERE LOWER(c.domain_suffix) = 'learnexus.com'
AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER('admin@learnexus.com'));

INSERT INTO users (name, email, college_id, role, credits, is_verified)
SELECT 'AI Tutor', 'nexus-ai-tutor@system.learnexus.internal', c.id, 'student', 0, TRUE
FROM colleges c
WHERE LOWER(c.domain_suffix) = 'system.learnexus.internal'
AND NOT EXISTS (SELECT 1 FROM users u WHERE LOWER(u.email) = LOWER('nexus-ai-tutor@system.learnexus.internal'));
