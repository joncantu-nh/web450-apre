/**
 * Author: Professor Krasso
 * Date: 8/14/24
 * File: index.js
 * Description: Apre agent performance API for the agent performance reports
 */

'use strict';

const express = require('express');
const { mongo } = require('../../../utils/mongo');
const createError = require('http-errors');

const router = express.Router();

/**
 * @description
 *
 * GET /call-duration-by-date-range
 *
 * Fetches call duration data for agents within a specified date range.
 *
 * Example:
 * fetch('/call-duration-by-date-range?startDate=2023-01-01&endDate=2023-01-31')
 *  .then(response => response.json())
 *  .then(data => console.log(data));
 */
router.get('/call-duration-by-date-range', (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(createError(400, 'Start date and end date are required'));
    }

    console.log('Fetching call duration report for date range:', startDate, endDate);

    mongo(async db => {
      const data = await db.collection('agentPerformance').aggregate([
        {
          $match: {
            date: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $lookup: {
            from: 'agents',
            localField: 'agentId',
            foreignField: 'agentId',
            as: 'agentDetails'
          }
        },
        {
          $unwind: '$agentDetails'
        },
        {
          $group: {
            _id: '$agentDetails.name',
            totalCallDuration: { $sum: '$callDuration' }
          }
        },
        {
          $project: {
            _id: 0,
            agent: '$_id',
            callDuration: '$totalCallDuration'
          }
        },
        {
          $group: {
            _id: null,
            agents: { $push: '$agent' },
            callDurations: { $push: '$callDuration' }
          }
        },
        {
          $project: {
            _id: 0,
            agents: 1,
            callDurations: 1
          }
        }
      ]).toArray();

      res.send(data);
    }, next);
  } catch (err) {
    console.error('Error in /call-duration-by-date-range', err);
    next(err);
  }
});

/**
 * M-085: Average agent performance for a calendar month within a specific year.
 * GET /performance-by-month?month=1&year=2023 (both are required).
 * GET /performance-by-month?view=years lists available report years.
 */
router.get('/performance-by-month', (req, res, next) => {
  try {
    // Use the same endpoint to populate the year selector from stored records.
    if (req.query.view === 'years') {
      return mongo(async db => {
        const years = await db.collection('agentPerformance').aggregate([
          { $group: { _id: { $year: { $toDate: '$date' } } } },
          { $sort: { _id: -1 } }
        ]).toArray();
        res.send(years.map(row => row._id));
      }, next);
    }
    const { month, year } = req.query;
    if (typeof month !== 'string' || !/^(?:[1-9]|1[0-2])$/.test(month)) {
      return next(createError(400, 'Month must be an integer from 1 to 12'));
    }

    if (typeof year !== 'string' || !/^[1-9][0-9]{3}$/.test(year)) {
      return next(createError(400, 'Year must be an integer from 1000 to 9999'));
    }

    mongo(async db => {
      const data = await db.collection('agentPerformance').aggregate([
        // Convert stored dates before matching the selected UTC calendar month.
        { $addFields: { date: { $toDate: '$date' } } },
        { $match: { $expr: { $and: [
          { $eq: [{ $month: '$date' }, Number(month)] },
          { $eq: [{ $year: '$date' }, Number(year)] }
        ] } } },
        { $lookup: {
          from: 'agents', localField: 'agentId', foreignField: 'agentId', as: 'agentInfo'
        } },
        // Keep performance records even when the agents collection has no matching ID.
        { $unwind: { path: '$agentInfo', preserveNullAndEmptyArrays: true } },
        { $addFields: {
          agentName: { $ifNull: ['$agentInfo.name', {
            $concat: ['Agent ', { $toString: '$agentId' }, ' (name unavailable)']
          }] }
        } },
        // Match the dashboard: average each record's metrics, then average by agent.
        { $group: {
          _id: { agentId: '$agentId', name: '$agentName' },
          averagePerformance: { $avg: { $avg: '$performanceMetrics.value' } }
        } },
        { $project: {
          _id: 0, agentId: '$_id.agentId', name: '$_id.name', averagePerformance: 1
        } },
        { $sort: { name: 1, agentId: 1 } }
      ]).toArray();
      res.send(data);
    }, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;