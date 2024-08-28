import { Worker, type WorkerOptions } from 'node:worker_threads';
import WorkerPool, { IWorker, kTaskInfo, kWorkerFreedEvent } from './index.js';

function createWorker(_this: WorkerPool, options?: WorkerOptions): void {
  const filename = new URL('../task_processor.js', import.meta.url);
  const worker = new Worker(filename, options) as IWorker;

  worker.on('message', (result) => {
    // In case of success: Call the callback that was passed to `runTask`,
    // remove the `TaskInfo` associated with the Worker, and mark it as free
    // again.
    if (!worker[kTaskInfo]) {
      throw new Error('No task info found for worker');
    }

    worker[kTaskInfo].done(null, result);
    worker[kTaskInfo] = null;

    _this.freeWorkers.push(worker);
    _this.emit(kWorkerFreedEvent);
  });

  worker.on('error', (err) => {
    // In case of an uncaught exception: Call the callback that was passed to
    // `runTask` with the error.
    if (worker[kTaskInfo]) {
      worker[kTaskInfo].done(err, null);
    } else {
      _this.emit('error', err);
    }
    // Remove the worker from the list and start a new Worker to replace the
    // current one.
    _this.workers.splice(_this.workers.indexOf(worker), 1);
    _this.addNewWorker();
  });

  _this.workers.push(worker);
  _this.freeWorkers.push(worker);

  _this.emit(kWorkerFreedEvent);
}

export default createWorker;
