import { AsyncResource } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { Worker, type WorkerOptions } from 'node:worker_threads';
import path from 'node:path';
import os from 'node:os';

import createBeater from './createBeater.js';
import startBeater from './startBeater.js';
import createWorker from './createWorker.js';

type Task = any;
type Callback = (err: any, result: any) => void;

export const kTaskInfo = Symbol('kTaskInfo');
export const kWorkerFreedEvent = Symbol('kWorkerFreedEvent');

export interface IWorker extends Worker {
  [kTaskInfo]?: WorkerPoolTaskInfo | null;
}

export class WorkerPoolTaskInfo extends AsyncResource {
  callback: Callback;

  constructor(callback: Callback) {
    super('WorkerPoolTaskInfo');
    this.callback = callback;
  }

  done(err: any, result: any) {
    this.runInAsyncScope(this.callback, null, err, result);
    this.emitDestroy(); // `TaskInfo`s are used only once.
  }
}

export class WorkerPool extends EventEmitter {
  numThreads: number;
  workers: IWorker[];
  beaters: IWorker[];
  freeWorkers: IWorker[];
  tasks: { task: Task; callback: Callback }[];

  constructor(numThreads: number, numBeaters = 0) {
    super();
    this.numThreads = numThreads;
    this.workers = [];
    this.beaters = [];
    this.freeWorkers = [];
    this.tasks = [];

    const availableParallelism = os.availableParallelism();
    console.log(
      `Creating worker pool with ${numThreads} threads (${numBeaters} beaters).`,
      `Available parallelism: ${availableParallelism}`
    );

    for (let i = 0; i < numThreads - numBeaters; i++) {
      this.addNewWorker();
    }
    if (numBeaters > 0 && numBeaters <= availableParallelism) {
      for (let i = 0; i < numBeaters; i++) {
        this.addNewWorker({ workerData: { beat: true, interval: 500 } });
      }
    }

    // Any time the kWorkerFreedEvent is emitted, dispatch
    // the next task pending in the queue, if any.
    this.on(kWorkerFreedEvent, () => {
      if (this.tasks.length === 0) {
        return;
      }

      const nextTask = this.tasks.shift();
      if (nextTask) {
        this.runTask(nextTask.task, nextTask.callback);
      }
    });
  }

  addNewWorker(options?: WorkerOptions) {
    if (options?.workerData?.beat) {
      createBeater(this, options);
      return;
    }

    createWorker(this, options);
  }

  runTask(task: Task, callback: Callback) {
    if (this.freeWorkers.length === 0) {
      // No free threads, wait until a worker thread becomes free.
      this.tasks.push({ task, callback });
      return;
    }

    const worker = this.freeWorkers.pop();
    if (!worker) {
      console.error('No free workers available');
      return;
    }

    worker[kTaskInfo] = new WorkerPoolTaskInfo(callback);
    worker.postMessage(task);
  }

  beat() {
    if (this.beaters.length === 0) {
      console.error('No beaters available');
      return;
    }

    startBeater(this.beaters.pop());
  }

  close() {
    console.log('Closing worker pool');

    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}

export default WorkerPool;
