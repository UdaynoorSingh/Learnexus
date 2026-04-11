require('dotenv').config();
const pool = require('./config/db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT t.id as t_id, t.name as t_name, t.subject_id as t_sub, t.college_id as t_cid, 
             s.id as s_id, s.semester_id as s_sem, s.college_id as s_cid,
             sem.id as sem_id, sem.branch_id as sem_bra, sem.college_id as sem_cid,
             b.id as b_id, b.degree_id as b_deg, b.college_id as b_cid,
             d.id as d_id, d.college_id as d_cid
      FROM topics t
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN semesters sem ON s.semester_id = sem.id
      LEFT JOIN branches b ON sem.branch_id = b.id
      LEFT JOIN degrees d ON b.degree_id = d.id
      ORDER BY t.id DESC LIMIT 5
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
