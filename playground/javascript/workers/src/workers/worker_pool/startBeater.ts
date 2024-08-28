import { type IWorker, kTaskInfo, WorkerPoolTaskInfo } from './index.js';

function callback(err: any, result: any) {
  if (err) {
    console.error('beater error::', err);
    return;
  }

  console.log('beater::', result);
}

function startBeater(worker?: IWorker) {
  if (!worker) {
    console.error('No beater available');
    return;
  }

  worker[kTaskInfo] = new WorkerPoolTaskInfo(callback);
  worker.postMessage('beat');
}

export default startBeater;
