const db = require('./db');

function update({ tokenCount, timestamp }, { interval, bucketCapacity }, now) {
    const increase = Math.floor((now - timestamp) / interval);
    const newTokenCount = Math.min(tokenCount + increase, bucketCapacity);
    const newTimestamp =
        newTokenCount < bucketCapacity ? timestamp + interval * increase : now;
    return { tokenCount: newTokenCount, timestamp: newTimestamp };
}

function take(oldState, options, now) {
    const { tokenCount, timestamp } = oldState
        ? update(oldState, options, now)
        : { tokenCount: options.bucketCapacity, timestamp: now };
    if (tokenCount > 0 && now >= timestamp) {
        // if there is a token available and the timestamp is in the past
        // take the token and leave the timestamp un-changed
        return { tokenCount: tokenCount - 1, timestamp };
    }
    // update the timestamp to a time when a token will be available, leaving
    // the token count at 0
    return { tokenCount, timestamp: timestamp + options.interval };
}

async function rateLimitUsingLeakyBucket(key, options) {
    const now = Date.now();
    const oldState = await db.checkAsync(key);
    const newState = take(oldState, options, now);
    // N.B. replaceRateLimitState should throw if current state
    // doesn't match oldState to avoid concurrent token usage
    await db.updateLimits(key, newState, oldState);
    if (newState.timestamp - now > 0) {
        await new Promise(r => setTimeout(r, newState.timestamp - now));
    }
}

async function rateLimiter(req, res, next) {
    const userId = 1;
    const oldTokenState = db.check(userId);
    await rateLimitUsingLeakyBucket(userId, { interval: 3000, bucketCapacity: 10 })
    const newTokenState = db.check(userId);
    console.log(oldTokenState, newTokenState)
    if (oldTokenState && oldTokenState.tokenCount <= 0 &&
        newTokenState && newTokenState.tokenCount <= 0) {
            return res.status(429).send("Rate limit exceeded")
    }
    return next();
};

module.exports = rateLimiter;