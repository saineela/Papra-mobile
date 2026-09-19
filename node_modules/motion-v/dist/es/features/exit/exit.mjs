import { Feature } from "../feature.mjs";
import { frame } from "motion-dom";
var ExitFeature = class extends Feature {
	constructor(..._args) {
		super(..._args);
		this.exitGeneration = 0;
	}
	static #_ = this.key = "exit";
	exit() {
		const generation = ++this.exitGeneration;
		const state = this.state;
		state.isExiting = true;
		const completion = new Promise((resolve) => {
			this.pendingExit = { resolve };
		});
		const exitAnimation = state.visualElement?.animationState?.setActive("exit", true);
		if (exitAnimation) exitAnimation.then(() => {
			if (generation !== this.exitGeneration) return;
			state.isExiting = false;
			state.options?.layoutId ? frame.postRender(() => this.tryCompleteExit(generation)) : this.tryCompleteExit(generation);
		});
		else {
			state.isExiting = false;
			this.tryCompleteExit(generation);
		}
		state.getSnapshot(false);
		return completion;
	}
	reenter() {
		this.exitGeneration++;
		this.settleExit();
		this.state.isExiting = false;
		this.state.setActive("exit", false);
		this.state.getSnapshot(true);
	}
	completeExitFromProjection() {
		this.tryCompleteExit(this.exitGeneration);
	}
	tryCompleteExit(generation) {
		if (generation !== this.exitGeneration || this.state.isExiting) return;
		if (this.state.options?.layoutId && this.state.visualElement.projection?.currentAnimation?.state === "running") return;
		this.settleExit();
	}
	settleExit() {
		this.pendingExit?.resolve();
		this.pendingExit = void 0;
	}
	mount() {
		this.state.options.presenceContext?.register?.(this.state);
	}
	unmount() {
		this.state.options.presenceContext?.unregister?.(this.state);
		this.settleExit();
	}
};
export { ExitFeature };
