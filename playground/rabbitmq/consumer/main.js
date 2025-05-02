const amqp = require('amqplib/callback_api');

const EXCHANGE_NAME = 'commands';

const ARGS = process.argv.slice(2);
console.log(` [*] Arguments: ${ARGS}`);

function cbBuilder(channel) {
  return function (err, queue) {
    if (err) {
      console.error('Error asserting queue:', err);
      process.exit(1);
    }

    console.log(` [*] Waiting for messages in ${queue}. To exit press CTRL+C`);

    ARGS.forEach((key) => {
      console.log(` [*] Binding to ${key}`);
      channel.bindQueue(queue.queue, EXCHANGE_NAME, key);
    });

    channel.consume(
      queue.queue,
      (msg) => {
        console.log(` [x] Received ${msg.fields.routingKey}:`, JSON.parse(msg.content.toString()));
      },
      { noAck: true }
    );
  }
}

function channelCB(err, channel) {
  if (err) {
    console.error('Error creating channel:', err);
    process.exit(1);
  }

  channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: false });

  channel.assertQueue('', { exclusive: true }, cbBuilder(channel));
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
