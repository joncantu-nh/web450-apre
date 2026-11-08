/**
 * Author: Professor Krasso
 * Date: 10 September 2024
 * File: index.spec.js
 * Description: Test the agent performance API
 */

// Require the modules
const request = require('supertest');
const app = require('../../../../src/app');
const { mongo } = require('../../../../src/utils/mongo');

jest.mock('../../../../src/utils/mongo');

// Test the agent performance API
describe('Apre Agent Performance API', () => {
  beforeEach(() => {
    mongo.mockClear();
  });

  // Test the call-duration-by-date-range endpoint
  it('should fetch call duration data for agents within a specified date range', async () => {
    mongo.mockImplementation(async (callback) => {
      const db = {
        collection: jest.fn().mockReturnThis(),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              agents: ['Agent A', 'Agent B'],
              callDurations: [120, 90]
            }
          ])
        })
      };
      await callback(db);
    });

    const response = await request(app).get('/api/reports/agent-performance/call-duration-by-date-range?startDate=2023-01-01&endDate=2023-01-31'); // Send a GET request to the call-duration-by-date-range endpoint

    expect(response.status).toBe(200); // Expect a 200 status code

    // Expect the response body to match the expected data
    expect(response.body).toEqual([
      {
        agents: ['Agent A', 'Agent B'],
        callDurations: [120, 90]
      }
    ]);
  });

  // Test the call-duration-by-date-range endpoint with missing parameters
  it('should return 400 if startDate or endDate is missing', async () => {
    const response = await request(app).get('/api/reports/agent-performance/call-duration-by-date-range?startDate=2023-01-01'); // Send a GET request to the call-duration-by-date-range endpoint with missing endDate
    expect(response.status).toBe(400); // Expect a 400 status code

    // Expect the response body to match the expected data
    expect(response.body).toEqual({
      message: 'Start date and end date are required',
      status: 400,
      type: 'error'
    });
  });

  // Test the call-duration-by-date-range endpoint with an invalid date range
  it('should return 404 for an invalid endpoint', async () => {
    const response = await request(app).get('/api/reports/agent-performance/invalid-endpoint'); // Send a GET request to an invalid endpoint
    expect(response.status).toBe(404); // Expect a 404 status code
    // Expect the response body to match the expected data
    expect(response.body).toEqual({
      message: 'Not Found',
      status: 404,
      type: 'error'
    });
  });
});

// M-085: exercise the new route without requiring a live MongoDB connection.
describe('Agent performance by month', () => {
  const url = '/api/reports/agent-performance/performance-by-month';
  beforeEach(() => mongo.mockReset());

  it('returns named and unmatched agents with the month aggregation', async () => {
    const data = [
      { agentId: 1024, name: 'Agent 1024 (name unavailable)', averagePerformance: 85 }
    ];
    const aggregate = jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(data) });
    const collection = jest.fn().mockReturnValue({ aggregate });
    mongo.mockImplementation(async callback => callback({ collection }));

    const response = await request(app).get(`${url}?month=1&year=2024`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(data);
    expect(collection).toHaveBeenCalledWith('agentPerformance');
    expect(aggregate).toHaveBeenCalledWith([
      { $addFields: { date: { $toDate: '$date' } } },
      { $match: { $expr: { $and: [
        { $eq: [{ $month: '$date' }, 1] },
        { $eq: [{ $year: '$date' }, 2024] }
      ] } } },
      { $lookup: { from: 'agents', localField: 'agentId', foreignField: 'agentId', as: 'agentInfo' } },
      { $unwind: { path: '$agentInfo', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        agentName: { $ifNull: ['$agentInfo.name', {
          $concat: ['Agent ', { $toString: '$agentId' }, ' (name unavailable)']
        }] }
      } },
      { $group: {
        _id: { agentId: '$agentId', name: '$agentName' },
        averagePerformance: { $avg: { $avg: '$performanceMetrics.value' } }
      } },
      { $project: { _id: 0, agentId: '$_id.agentId', name: '$_id.name', averagePerformance: 1 } },
      { $sort: { name: 1, agentId: 1 } }
    ]);

    const namedAgent = { agentId: 1000, name: 'John Doe', averagePerformance: 80 };
    aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([namedAgent]) });
    const filtered = await request(app).get(`${url}?month=1&year=2023`);
    expect(filtered.status).toBe(200);
    expect(filtered.body).toEqual([namedAgent]);
    expect(aggregate).toHaveBeenLastCalledWith(expect.arrayContaining([
      { $match: { $expr: { $and: [
        { $eq: [{ $month: '$date' }, 1] },
        { $eq: [{ $year: '$date' }, 2023] }
      ] } } }
    ]));

    aggregate.mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ _id: 2024 }, { _id: 2023 }]) });
    const years = await request(app).get(`${url}?view=years`);
    expect(years.status).toBe(200);
    expect(years.body).toEqual([2024, 2023]);
    expect(aggregate).toHaveBeenLastCalledWith([
      { $group: { _id: { $year: { $toDate: '$date' } } } },
      { $sort: { _id: -1 } }
    ]);
  });

  it('rejects missing or invalid month and year parameters before accessing MongoDB', async () => {
    for (const query of ['', '?month=0', '?month=13', '?month=1.5', '?month=abc', '?month=1&month=2']) {
      const response = await request(app).get(url + query);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Month must be an integer from 1 to 12', status: 400, type: 'error'
      });
    }
    for (const year of ['0', '999', '10000', '2024.5', 'abc', '2024&year=2023', '']) {
      const response = await request(app).get(`${url}?month=1&year=${year}`);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Year must be an integer from 1000 to 9999', status: 400, type: 'error'
      });
    }
    expect((await request(app).get(`${url}?month=1`)).status).toBe(400);
    expect(mongo).not.toHaveBeenCalled();
  });

  it('returns 500 when the database operation fails', async () => {
    mongo.mockImplementation(async (callback, next) => {
      const db = { collection: () => ({ aggregate: () => ({
        toArray: jest.fn().mockRejectedValue(new Error('Database unavailable'))
      }) }) };
      try { await callback(db); } catch (err) { err.status = 500; next(err); }
    });
    for (const query of ['?month=1&year=2024', '?view=years']) {
      const response = await request(app).get(url + query);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Database unavailable', status: 500, type: 'error' });
    }
  });
});
