const fastify = require('fastify')({ logger: true });
const { logger } = require('../utils/logger');
const listenMock = require('../mock-server');

// Environment Variables
require('dotenv').config();
const API_BASE_URL = process.env.API_BASE_URL || 'http://event.com';
const PORT = process.env.PORT || 3000;

// Enhanced /getUsers endpoint
fastify.get('/getUsers', async (request, reply) => {
  try {
    const resp = await fetch(`${API_BASE_URL}/getUsers`);
    if (!resp.ok) {
      logger.error('Failed to fetch users');
      return reply.status(500).send({ error: 'Unable to fetch users' });
    }
    const data = await resp.json();
    reply.send(data);
  } catch (err) {
    logger.error('Error fetching users', err);
    reply.status(500).send({ error: 'Internal server error' });
  }
});

// Enhanced /addEvent endpoint
fastify.post('/addEvent', async (request, reply) => {
  try {
    const resp = await fetch(`${API_BASE_URL}/addEvent`, {
      method: 'POST',
      body: JSON.stringify({
        id: new Date().getTime(),
        ...request.body
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!resp.ok) {
      logger.error('Failed to add event');
      return reply.status(500).send({ error: 'Unable to add event' });
    }
    const data = await resp.json();
    reply.send(data);
  } catch (err) {
    logger.error('Error adding event', err);
    reply.status(500).send({ error: 'Internal server error' });
  }
});

// Enhanced /getEvents endpoint
fastify.get('/getEvents', async (request, reply) => {
  try {
    const resp = await fetch(`${API_BASE_URL}/getEvents`);
    if (!resp.ok) {
      logger.error('Failed to fetch events');
      return reply.status(500).send({ error: 'Unable to fetch events' });
    }
    const data = await resp.json();
    reply.send(data);
  } catch (err) {
    logger.error('Error fetching events', err);
    reply.status(500).send({ error: 'Internal server error' });
  }
});

// Optimized /getEventsByUserId/:id endpoint with parallel fetching
fastify.get('/getEventsByUserId/:id', async (request, reply) => {
  const { id } = request.params;
  try {
    const userResp = await fetch(`${API_BASE_URL}/getUserById/${id}`);
    if (!userResp.ok) {
      logger.error(`Failed to fetch user with id ${id}`);
      return reply.status(500).send({ error: `Unable to fetch user with id ${id}` });
    }

    const userData = await userResp.json();
    const userEvents = userData.events;

    if (!Array.isArray(userEvents) || userEvents.length === 0) {
      return reply.send([]);
    }

    // Fetch all events in parallel
    const eventPromises = userEvents.map(eventId =>
      fetch(`${API_BASE_URL}/getEventById/${eventId}`)
        .then(res => res.json())
        .catch(err => ({ error: `Failed to fetch event ${eventId}` }))
    );

    const eventArray = await Promise.all(eventPromises);
    reply.send(eventArray);

  } catch (err) {
    logger.error('Error fetching events for user', err);
    reply.status(500).send({ error: 'Unable to fetch events for the user' });
  }
});

// Start the server with graceful shutdown
const start = async () => {
  try {
    await fastify.listen(PORT);
    listenMock();
    logger.info(`Server running at http://localhost:${PORT}`);

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await fastify.close();
      process.exit(0);
    });

  } catch (err) {
    logger.error('Error starting the server', err);
    process.exit(1);
  }
};

start();
