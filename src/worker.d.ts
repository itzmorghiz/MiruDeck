// src/worker.d.ts
declare module "*?worker" {
	class WorkerConstructor extends Worker {
		constructor(options?: WorkerOptions);
	}
	export default WorkerConstructor;
}
