import { isMainThread, parentPort, workerData } from 'node:worker_threads';

function beat() {
  setInterval(() => {
    if (!parentPort) {
      return;
    }
    parentPort.postMessage('beat from worker ' + new Date().toISOString());
  }, workerData.interval);
}

if (!isMainThread) {
  if (!parentPort) {
    throw new Error('No parentPort');
  }

  if (workerData?.beat) {
    beat();
  }
}
