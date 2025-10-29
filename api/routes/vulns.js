import { Router } from 'express';
import Vulnerability from '../models/Vulnerability.js';
import connectDB from '../lib/db.js';

const router = Router();

const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
const allowedKaiStatuses = new Set(['ai-invalid-norisk', 'invalid - norisk']);

const cleanList = (list) =>
  (list || [])
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== undefined && item !== null && item !== '')
    .sort((a, b) => String(a).localeCompare(String(b)));

const parseListParam = (value) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : Array.isArray(value)
    ? value
        .map((v) => String(v).trim())
        .filter(Boolean)
    : [];

const parseNumber = (value, fallback = null) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const buildMatchQuery = (query) => {
  const conditions = [];

  const severity = parseListParam(query.severity);
  if (severity.length) {
    conditions.push({ severityNormalized: { $in: severity } });
  }

  if (query.repo) {
    conditions.push({ repoName: query.repo });
  }

  if (query.group) {
    conditions.push({ groupName: query.group });
  }

  const kaiStatuses = parseListParam(query.kaiStatus);
  if (kaiStatuses.length) {
    conditions.push({ kaiStatus: { $in: kaiStatuses } });
  }

  const kaiExclude = parseListParam(query.kaiExclude);
  if (kaiExclude.length) {
    conditions.push({
      $or: [
        { kaiStatus: { $exists: false } },
        { kaiStatus: null },
        { kaiStatus: { $eq: '' } },
        { kaiStatus: { $nin: kaiExclude } },
      ],
    });
  }

  const riskFactors = parseListParam(query.riskFactor);
  if (riskFactors.length) {
    conditions.push({ riskFactorList: { $in: riskFactors } });
  }

  const dateFrom = parseNumber(query.dateFrom);
  const dateTo = parseNumber(query.dateTo);
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(dateTo);
    conditions.push({ publishedAt: range });
  }

  const cvssMin = parseNumber(query.cvssMin, null);
  const cvssMax = parseNumber(query.cvssMax, null);
  if (cvssMin !== null || cvssMax !== null) {
    const range = {};
    if (cvssMin !== null) range.$gte = cvssMin;
    if (cvssMax !== null) range.$lte = cvssMax;
    conditions.push({ cvss: range });
  }

  if (query.search) {
    const regex = new RegExp(String(query.search).trim(), 'i');
    conditions.push({
      $or: [
        { cve: regex },
        { packageName: regex },
        { repoName: regex },
        { summary: regex },
        { imageName: regex },
        { groupName: regex },
      ],
    });
  }

  if (!conditions.length) return {};
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
};

const buildSortSpec = (sortKey, direction) => {
  const sortDir = direction === 'asc' ? 1 : -1;
  switch (sortKey) {
    case 'cvss':
      return { cvss: sortDir, severityScore: 1, id: 1 };
    case 'published':
      return { publishedAt: sortDir, severityScore: 1, id: 1 };
    case 'repoName':
      return { repoName: sortDir, severityScore: 1, id: 1 };
    case 'severity':
    default:
      return {
        severityScore: direction === 'asc' ? -1 : 1,
        cvss: -1,
        id: 1,
      };
  }
};

router.get('/', async (req, res, next) => {
  try {
    await connectDB();
    const page = parseNumber(req.query.page, 1);
    const limit = parseNumber(req.query.limit, 50);
    const sortKey = String(req.query.sort || 'severity');
    const direction = String(req.query.direction || 'desc');
    const includeMetrics = String(req.query.includeMetrics ?? 'true') !== 'false';

    const matchQuery = buildMatchQuery(req.query);
    const matchStage = Object.keys(matchQuery).length
      ? [{ $match: matchQuery }]
      : [];

    const promises = [
      Vulnerability.find(matchQuery)
        .sort(buildSortSpec(sortKey, direction))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      Vulnerability.countDocuments(matchQuery),
    ];

    if (includeMetrics) {
      promises.push(
        Vulnerability.estimatedDocumentCount(),
        Vulnerability.aggregate([
          ...matchStage,
          {
            $group: {
              _id: { $ifNull: ['$severityNormalized', 'UNKNOWN'] },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, name: '$_id', value: '$count' } },
          { $sort: { value: -1 } },
        ]),
        Vulnerability.aggregate([
          ...matchStage,
          {
            $project: {
              riskFactorList: {
                $cond: [
                  { $gt: [{ $size: '$riskFactorList' }, 0] },
                  '$riskFactorList',
                  [],
                ],
              },
            },
          },
          { $unwind: '$riskFactorList' },
          {
            $group: {
              _id: '$riskFactorList',
              value: { $sum: 1 },
            },
          },
          { $project: { _id: 0, name: '$_id', value: 1 } },
          { $sort: { value: -1 } },
          { $limit: 25 },
        ]),
        Vulnerability.aggregate([
          ...matchStage,
          { $match: { publishedAt: { $ne: null } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$publishedAt' },
              },
              CRITICAL: {
                $sum: {
                  $cond: [{ $eq: ['$severityNormalized', 'CRITICAL'] }, 1, 0],
                },
              },
              HIGH: {
                $sum: {
                  $cond: [{ $eq: ['$severityNormalized', 'HIGH'] }, 1, 0],
                },
              },
              MEDIUM: {
                $sum: {
                  $cond: [{ $eq: ['$severityNormalized', 'MEDIUM'] }, 1, 0],
                },
              },
              LOW: {
                $sum: {
                  $cond: [{ $eq: ['$severityNormalized', 'LOW'] }, 1, 0],
                },
              },
              UNKNOWN: {
                $sum: {
                  $cond: [{ $eq: ['$severityNormalized', 'UNKNOWN'] }, 1, 0],
                },
              },
              total: { $sum: 1 },
            },
          },
          { $project: { _id: 0, month: '$_id', CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 1, UNKNOWN: 1, total: 1 } },
          { $sort: { month: 1 } },
        ]),
        Vulnerability.aggregate([
          ...matchStage,
          {
            $group: {
              _id: '$severityNormalized',
              ai: {
                $sum: {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $ifNull: ['$kaiStatus', ''] },
                        regex: /ai/i,
                      },
                    },
                    1,
                    0,
                  ],
                },
              },
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              label: { $ifNull: ['$_id', 'UNKNOWN'] },
              ai: 1,
              manual: { $subtract: ['$total', '$ai'] },
            },
          },
          { $sort: { label: 1 } },
        ]),
        Vulnerability.aggregate([
          ...matchStage,
          {
            $group: {
              _id: { $ifNull: ['$repoName', 'UNKNOWN'] },
              value: { $sum: 1 },
            },
          },
          { $project: { _id: 0, name: '$_id', value: 1 } },
          { $sort: { value: -1 } },
          { $limit: 15 },
        ]),
        Vulnerability.aggregate([
          ...matchStage,
          {
            $addFields: {
              severityRank: { $ifNull: ['$severityScore', severityOrder.length] },
              cvssScore: { $ifNull: ['$cvss', 0] },
            },
          },
          { $sort: { severityRank: 1, cvssScore: -1 } },
          { $limit: 3 },
        ]),
        Vulnerability.distinct('kaiStatus'),
        Vulnerability.distinct('riskFactorList'),
        Vulnerability.distinct('repoName'),
        Vulnerability.distinct('groupName'),
        Vulnerability.distinct('packageName'),
        Vulnerability.aggregate([
          ...matchStage,
          {
            $group: {
              _id: null,
              min: { $min: '$cvss' },
              max: { $max: '$cvss' },
            },
          },
        ]),
      );
    }

    const results = await Promise.all(promises);

    let offset = 0;
    const rows = results[offset++];
    const filteredTotal = results[offset++];

    const payload = {
      data: rows,
      page,
      limit,
      total: filteredTotal,
    };

    if (includeMetrics) {
      const totalDocuments = results[offset++];
      const severityAgg = results[offset++];
      const riskFactorAgg = results[offset++];
      const trendAgg = results[offset++];
      const aiManualAgg = results[offset++];
      const repoAgg = results[offset++];
      const highlightsAgg = results[offset++];
      const kaiStatuses = results[offset++];
      const riskFactorOptions = results[offset++];
      const repoOptions = results[offset++];
      const groupOptions = results[offset++];
      const packageOptions = results[offset++];
      const cvssBounds = results[offset++];

      const severityMap = new Map(
        (severityAgg || []).map((entry) => [entry.name, entry.value]),
      );
      const severitySummary = severityOrder.map((label) => ({
        name: label,
        value: severityMap.get(label) ?? 0,
      }));

      const aiManualMap = new Map(
        (aiManualAgg || []).map((entry) => [entry.label, entry]),
      );
      const aiManualSummary = severityOrder.map((label) => {
        const entry = aiManualMap.get(label) || { ai: 0, manual: 0 };
        return { label, ai: entry.ai ?? 0, manual: entry.manual ?? 0 };
      });

      const highlights = (highlightsAgg || []).map((entry) => ({
        ...entry,
      }));

      payload.metrics = {
        severityCounts: severitySummary,
        riskFactors: riskFactorAgg,
        trend: trendAgg,
        aiManual: aiManualSummary,
        highlights,
        repoSummary: repoAgg,
        kpis: {
          total: totalDocuments,
          remain: filteredTotal,
          removed: Math.max(totalDocuments - filteredTotal, 0),
          pctRemain: totalDocuments ? filteredTotal / totalDocuments : 0,
        },
      };

      const normalisedKaiStatuses = cleanList(kaiStatuses).filter((value) =>
        allowedKaiStatuses.has(String(value).toLowerCase()),
      );

      payload.options = {
        kaiStatuses: normalisedKaiStatuses,
        riskFactors: cleanList(riskFactorOptions),
        repos: cleanList(repoOptions),
        groups: cleanList(groupOptions),
        packages: cleanList(packageOptions),
        cvssRange:
          cvssBounds?.[0]
            ? {
                min: cvssBounds[0].min ?? 0,
                max: cvssBounds[0].max ?? 10,
              }
            : { min: 0, max: 10 },
      };
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

router.get('/suggest', async (req, res, next) => {
  try {
    await connectDB();
    const term = String(req.query.term || '').trim();
    const limit = parseNumber(req.query.limit, 12);
    if (!term) {
      return res.json({ suggestions: [] });
    }

    const regex = new RegExp(term, 'i');
    const docs = await Vulnerability.find({
      $or: [
        { cve: regex },
        { id: regex },
        { packageName: regex },
        { repoName: regex },
        { imageName: regex },
      ],
    })
      .limit(limit)
      .select('id cve repoName packageName imageName severityNormalized')
      .lean()
      .exec();

    const seen = new Set();
    const suggestions = [];
    docs.forEach((doc) => {
      const key = doc.cve || doc.id;
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      const parts = [key];
      if (doc.packageName) parts.push(doc.packageName);
      if (doc.repoName) parts.push(doc.repoName);
      const label = parts.join(' • ');
      suggestions.push({
        value: key,
        label,
        meta: {
          repoName: doc.repoName ?? null,
          packageName: doc.packageName ?? null,
          imageName: doc.imageName ?? null,
        },
      });
    });

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    await connectDB();
    const rawParam = decodeURIComponent(req.params.id || '').trim();
    if (!rawParam) {
      return res.status(400).json({ error: 'Missing identifier' });
    }

    const row = await Vulnerability.findOne({
      $or: [
        { id: rawParam },
        { cve: rawParam },
        { cve: rawParam.toUpperCase() },
        { cve: rawParam.toLowerCase() },
      ],
    }).lean();
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (err) {
    return next(err);
  }
});

export default router;
