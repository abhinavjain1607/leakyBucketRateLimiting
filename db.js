const state = new Map();

function check(key) {
    return state.get(key);
}
async function checkAsync(key) {
    return state.get(key);
}
async function updateLimits(key, newState, oldState) {
    if (state.get(key) !== oldState) {
        throw new Error("Attempted to take multiple tokens simultaneously");
    }
    state.set(key, newState);
}

module.exports = {
    check,
    checkAsync,
    updateLimits
};