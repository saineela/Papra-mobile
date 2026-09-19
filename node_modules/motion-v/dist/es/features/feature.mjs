var Feature = class {
	constructor(state) {
		this.isMount = false;
		this.state = state;
	}
	mount() {}
	beforeUnmount() {}
	unmount() {}
	update() {}
	getSnapshot(isPresent) {}
};
export { Feature };
