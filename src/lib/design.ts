export const DESIGNS = ["glass", "tactile"] as const;
export type Design = (typeof DESIGNS)[number];

export const DESIGN_STORAGE_KEY = "mf.design";

/** Runs before the first paint: no flash of the other design. */
export const DESIGN_SCRIPT = `(function(){var d="glass";try{if(localStorage.getItem("${DESIGN_STORAGE_KEY}")==="tactile")d="tactile"}catch(e){}document.documentElement.dataset.design=d})()`;
