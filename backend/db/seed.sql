-- Learnexus Seed Data

-- Degrees
INSERT INTO degrees (name) VALUES 
  ('B.Tech'),
  ('BCA'),
  ('BSc Computer Science'),
  ('MCA')
ON CONFLICT (name) DO NOTHING;

-- Branches for B.Tech (degree_id = 1)
INSERT INTO branches (name, degree_id) VALUES
  ('Computer Science & Engineering', 1),
  ('Information Technology', 1),
  ('Electronics & Communication', 1),
  ('Mechanical Engineering', 1);

-- Branches for BCA (degree_id = 2)
INSERT INTO branches (name, degree_id) VALUES
  ('BCA General', 2);

-- Branches for BSc CS (degree_id = 3)
INSERT INTO branches (name, degree_id) VALUES
  ('BSc CS General', 3);

-- Branches for MCA (degree_id = 4)
INSERT INTO branches (name, degree_id) VALUES
  ('MCA General', 4);

-- Semesters for CSE (branch_id = 1)
INSERT INTO semesters (number, branch_id) VALUES
  (1, 1), (2, 1), (3, 1), (4, 1),
  (5, 1), (6, 1), (7, 1), (8, 1);

-- Semesters for IT (branch_id = 2)
INSERT INTO semesters (number, branch_id) VALUES
  (1, 2), (2, 2), (3, 2), (4, 2),
  (5, 2), (6, 2), (7, 2), (8, 2);

-- Semesters for BCA (branch_id = 5)
INSERT INTO semesters (number, branch_id) VALUES
  (1, 5), (2, 5), (3, 5), (4, 5),
  (5, 5), (6, 5);

-- Subjects for CSE Semester 1 (semester_id = 1)
INSERT INTO subjects (name, semester_id) VALUES
  ('Mathematics I', 1),
  ('Physics', 1),
  ('Programming in C', 1),
  ('Engineering Drawing', 1);

-- Subjects for CSE Semester 2 (semester_id = 2)
INSERT INTO subjects (name, semester_id) VALUES
  ('Mathematics II', 2),
  ('Chemistry', 2),
  ('Object Oriented Programming', 2),
  ('Digital Electronics', 2);

-- Subjects for CSE Semester 3 (semester_id = 3)
INSERT INTO subjects (name, semester_id) VALUES
  ('Data Structures', 3),
  ('Database Management Systems', 3),
  ('Discrete Mathematics', 3),
  ('Computer Organization', 3);

-- Subjects for CSE Semester 4 (semester_id = 4)
INSERT INTO subjects (name, semester_id) VALUES
  ('Operating Systems', 4),
  ('Design & Analysis of Algorithms', 4),
  ('Computer Networks', 4),
  ('Software Engineering', 4);

-- Subjects for CSE Semester 5 (semester_id = 5)
INSERT INTO subjects (name, semester_id) VALUES
  ('Artificial Intelligence', 5),
  ('Compiler Design', 5),
  ('Web Technologies', 5);

-- Topics for Data Structures (subject_id = 9)
INSERT INTO topics (name, subject_id) VALUES
  ('Arrays', 9),
  ('Linked Lists', 9),
  ('Stacks', 9),
  ('Queues', 9),
  ('Trees', 9),
  ('Graphs', 9),
  ('Sorting Algorithms', 9),
  ('Searching Algorithms', 9);

-- Subtopics for Trees (topic_id = 5)
INSERT INTO topics (name, subject_id, parent_topic_id) VALUES
  ('Binary Trees', 9, 5),
  ('Binary Search Trees', 9, 5),
  ('AVL Trees', 9, 5),
  ('Heap', 9, 5);

-- Topics for DBMS (subject_id = 10)
INSERT INTO topics (name, subject_id) VALUES
  ('ER Model', 10),
  ('Relational Model', 10),
  ('SQL', 10),
  ('Normalization', 10),
  ('Transaction Management', 10),
  ('Indexing', 10);

-- Topics for Operating Systems (subject_id = 13)
INSERT INTO topics (name, subject_id) VALUES
  ('Process Management', 13),
  ('CPU Scheduling', 13),
  ('Memory Management', 13),
  ('File Systems', 13),
  ('Deadlocks', 13);

-- Topic Relations
INSERT INTO topic_relations (topic_id_1, topic_id_2, relation_type) VALUES
  (1, 2, 'prerequisite'),   -- Arrays → Linked Lists
  (3, 4, 'related'),        -- Stacks ↔ Queues
  (5, 6, 'related'),        -- Trees ↔ Graphs
  (7, 8, 'related'),        -- Sorting ↔ Searching
  (15, 16, 'prerequisite'), -- SQL → Normalization
  (13, 14, 'prerequisite'); -- ER Model → Relational Model

-- Teachers
INSERT INTO teachers (name, subject_id) VALUES
  ('Dr. Sharma', 9),
  ('Prof. Gupta', 10),
  ('Dr. Verma', 13),
  ('Prof. Singh', 14);

-- Admin user (password: admin123)
INSERT INTO users (name, email, password, role, credits) VALUES
  ('Admin', 'admin@learnexus.com', '$2a$10$xVqYLGQFGGXMR0r4GZ2hruTlYLBVMqCMGsHpJ16QRqE4sFMFx3bQO', 'superadmin', 100);
