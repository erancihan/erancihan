import { Worker, type WorkerOptions } from 'node:worker_threads';

import { kTaskInfo, type IWorker, type WorkerPool } from './index.js';

function createBeater(_this: WorkerPool, options?: WorkerOptions) {
  const filename = new URL('../task_processor.js', import.meta.url);
  const worker = new Worker(filename, options) as IWorker;

  worker.on('message', (result) => {
    worker[kTaskInfo]?.done(null, result);
  });

  worker.on('error', (err) => {
    if (worker[kTaskInfo]) {
      worker[kTaskInfo]?.done(err, null);
    } else {
      _this.emit('error', err);
    }
  });

  _this.beaters.push(worker);
}

export default createBeater;
