import express from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

const app = express();
const redis = new Redis('redis://localhost:6379', { maxRetriesPerRequest: 3 });

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(args[0], ...args.slice(1))
  })
}));

app.get('/', (req, res) => res.send('ok'));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

app.listen(3002, () => {
  console.log('Listening 3002');
  fetch('http://localhost:3002/')
    .then(r => r.json().catch(() => r.text()))
    .then(console.log)
    .then(() => process.exit(0));
});
