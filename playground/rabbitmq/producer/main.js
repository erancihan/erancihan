const amqp = require('amqplib/callback_api');

const EXCHANGE_NAME = 'commands';

const ARGS = process.argv.slice(2);
console.log(` [*] Arguments: ${ARGS}`);

function channelCB(err, channel) {
  if (err) {
    console.error('Error creating channel:', err);
    process.exit(1);
  }

  /**
  // send a message to the exchange with args
  const key = ARGS.length > 0 ? ARGS[0] : 'anonymous.info';
  const msg = ARGS.slice(1).join(' ') || 'Hello World!';

  channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });
  channel.publish(EXCHANGE_NAME, key, Buffer.from(msg));
  console.log(` [x] Sent ${key}: '${msg}'`);
  * */

  // send random messages to the exchange every second until the process is killed
  channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });

  setInterval(() => {
    // get a device id between 0 and 1
    const deviceId = Math.floor(Math.random() * 10) % 2;
    const key = `device-${deviceId}`;

    // write a random message to the exchange
    const msg = (Math.random() + 1).toString(36).substring(7).substring(0, 5);
    const ts = new Date().toISOString();

    const payload = { msg, ts };

    channel.publish(EXCHANGE_NAME, key, Buffer.from(JSON.stringify(payload)));
    console.log(` [x] Sent ${key}:`, payload);
  }, 1000);
}

function connectCB(err, connection) {
  if (err) {
    console.error('Error connecting to RabbitMQ:', err);
    process.exit(1);
  }

  connection.createChannel(channelCB);
}

const connectionOptions = {
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  username: 'user',
  password: 'password',
}

amqp.connect(connectionOptions, connectCB);

// TODO: properly handle connection close on control-c

process.on('SIGINT', () => {
  if (connection) {
    connection.close();
    console.log(' [*] Connection closed');
  }

  console.log(' [*] Exiting...');
  process.exit(0);
});