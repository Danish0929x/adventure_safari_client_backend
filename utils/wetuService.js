const axios = require('axios');

const WETU_API_KEY = process.env.WETU_API_KEY;
const WETU_BASE_URL = process.env.WETU_BASE_URL;

// Get all available points
const listAvailablePoints = async () => {
  try {
    const url = `${WETU_BASE_URL}/${WETU_API_KEY}/List`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw new Error(`Wetu API Error: ${error.message}`);
  }
};

// Get detailed pins by ID
const getDetailedPins = async (ids) => {
  try {
    const idString = Array.isArray(ids) ? ids.join(',') : ids;
    const url = `${WETU_BASE_URL}/${WETU_API_KEY}/Get?ids=${idString}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw new Error(`Wetu API Error: ${error.message}`);
  }
};

// Search for content
const searchPoints = async (searchTerms) => {
  try {
    const url = `${WETU_BASE_URL}/${WETU_API_KEY}/Search/${encodeURIComponent(searchTerms)}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw new Error(`Wetu API Error: ${error.message}`);
  }
};

// Get paginated results
const getPinsWithPaging = async (pageNumber = 1) => {
  try {
    const url = `${WETU_BASE_URL}/${WETU_API_KEY}/GetPinsWithPaging?pageNumber=${pageNumber}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    throw new Error(`Wetu API Error: ${error.message}`);
  }
};

module.exports = {
  listAvailablePoints,
  getDetailedPins,
  searchPoints,
  getPinsWithPaging,
};
