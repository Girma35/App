import _ from 'underscore';
import CONST from '../CONST';

let requestWaitTime = 0;

function clear() {
    requestWaitTime = 0;
}

/**
 * @returns {Number} time to wait in ms
 */
function getRequestWaitTime() {
    if (requestWaitTime) {
        requestWaitTime = Math.min(requestWaitTime * 2, CONST.NETWORK.MAX_RETRY_WAIT_TIME);
    } else {
        requestWaitTime = _.random(CONST.NETWORK.MIN_RETRY_WAIT_TIME, CONST.NETWORK.MAX_RANDOM_RETRY_WAIT_TIME);
    }
    return requestWaitTime;
}

/**
 * @param {Number} time
 * @returns {Promise}
 */
function sleep() {
    return new Promise(resolve => setTimeout(resolve, getRequestWaitTime()));
}

export {
    clear,
    getRequestWaitTime,
    sleep,
};
