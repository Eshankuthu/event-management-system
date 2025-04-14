const fastify = require('fastify')({ logger: true });
const listenMock = require('../mock-server');

fastify.get('/getUsers', async (request, reply) => {
  const resp = await fetch('http://event.com/getUsers');
  const data = await resp.json();
  reply.send(data);
});

fastify.post('/addEvent', async (request, reply) => {
  try {
    const resp = await fetch('http://event.com/addEvent', {
      method: 'POST',
      body: JSON.stringify({
        id: new Date().getTime(),
        ...request.body
      })
    });
    const data = await resp.json();
    reply.send(data);
  } catch (err) {
    reply.error(err);
  }
});

fastify.get('/getEvents', async (request, reply) => {
  const resp = await fetch('http://event.com/getEvents');
  const data = await resp.json();
  reply.send(data);
});

fastify.get('/getEventsByUserId/:id', async (request, reply) => {
  const { id } = request.params;

  try {
    const userResp = await fetch(`http://event.com/getUserById/${id}`);
    if (!userResp.ok) throw new Error('Failed to fetch user data');

    const userData = await userResp.json();
    const userEvents = userData.events;

    if (!Array.isArray(userEvents) || userEvents.length === 0) {
      return reply.send([]);
    }
    // Fetch all events in parallel
    const eventPromises = userEvents.map(eventId =>
      fetch(`http://event.com/getEventById/${eventId}`)
        .then(res => res.json())
        .catch(err => ({ error: `Failed to fetch event ${eventId}` }))
    );

    const eventArray = await Promise.all(eventPromises);
    reply.send(eventArray);

  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Unable to fetch events for the user' });
  }
});

fastify.listen({ port: 3000 }, (err) => {
  listenMock();
  if (err) {
    fastify.log.error(err);
    process.exit();
  }
});
