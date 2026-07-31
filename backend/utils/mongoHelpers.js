const mongoose = require('mongoose');

function leanDoc(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o._id;
  delete o.__v;
  return o;
}

function leanDocs(docs) {
  return (docs || []).map(leanDoc);
}

async function getNextId(sequenceName) {
  const Counter = mongoose.model('Counter');
  const result = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

async function runTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    session.endSession();
  }
}

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

function chartDateKey(date) {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

async function aggregateByDay(Model, match, dateField = 'created_at') {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const filter = { ...match, [dateField]: { $gte: sevenDaysAgo } };
  const docs = await Model.find(filter).select(dateField).lean();
  const counts = {};
  for (const doc of docs) {
    const key = chartDateKey(doc[dateField]);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

module.exports = {
  leanDoc,
  leanDocs,
  getNextId,
  runTransaction,
  isDuplicateKeyError,
  chartDateKey,
  aggregateByDay
};
